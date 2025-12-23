// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialNewsletterLock
 * @notice A subscription-based paywall for newsletters using FHE-encrypted content keys
 * @dev Implements ACL-based access control for AES key decryption
 *
 * Pattern inspired by:
 * - Unlock Protocol's PublicLock (subscription model)
 *
 * Flow:
 * 1. Publisher deploys contract with subscription parameters
 * 2. Publisher sets FHE-encrypted AES content key via setContentKey()
 * 3. Subscribers call subscribe() to pay and gain ACL access
 * 4. Subscribers use Relayer SDK userDecrypt to get AES key
 * 5. Subscribers decrypt off-chain content (IPFS) with AES key
 */
contract ConfidentialNewsletterLock is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @notice Newsletter metadata
    string public name;

    /// @notice Subscription parameters
    uint256 public subscriptionPrice;
    uint256 public subscriptionDuration;

    /// @notice FHE-encrypted AES-256 content key
    /// @dev Stored as euint256, only accessible via ACL permissions
    euint256 private contentKey;

    /// @notice Flag to check if content key has been set
    bool public contentKeySet;

    /// @notice Mapping of subscriber address to their subscription expiration timestamp // TODO?? exists
    mapping(address => uint256) public expirationTimestamps;

    /// @notice Total revenue collected
    uint256 public totalRevenue;

    // ============ Events ============

    event ContentKeySet(address indexed setter);
    event SubscriptionPurchased(address indexed subscriber, uint256 expirationTimestamp, uint256 pricePaid);
    event SubscriptionRenewed(address indexed subscriber, uint256 newExpirationTimestamp);
    event KeyAccessGranted(address indexed subscriber);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event SubscriptionParamsUpdated(uint256 price, uint256 duration);

    // ============ Errors ============

    error InsufficientPayment(uint256 required, uint256 provided);
    error ContentKeyAlreadySet();
    error ContentKeyNotSet();
    error NoValidSubscription();
    error NoFundsToWithdraw();
    error InvalidDuration();
    error InvalidPrice();

    // ============ Constructor ============

    /**
     * @notice Deploy a new newsletter subscription lock
     * @param _name Newsletter name
     * @param _subscriptionPrice Price in wei for subscription
     * @param _subscriptionDuration Duration in seconds (e.g., 30 days = 2592000)
     */
    constructor(string memory _name, uint256 _subscriptionPrice, uint256 _subscriptionDuration) Ownable(msg.sender) {
        if (_subscriptionDuration == 0) revert InvalidDuration();

        name = _name;
        subscriptionPrice = _subscriptionPrice;
        subscriptionDuration = _subscriptionDuration;
        contentKeySet = false;
    }

    // ============ Publisher Functions (Owner Only) ============

    /**
     * @notice Set the FHE-encrypted content key
     * @dev The AES key is encrypted client-side with FHE public key
     * @param _encryptedKey The FHE-encrypted AES-256 key
     * @param _inputProof ZK proof of correct encryption
     */
    function setContentKey(externalEuint256 _encryptedKey, bytes calldata _inputProof) external onlyOwner {
        if (contentKeySet) revert ContentKeyAlreadySet();

        // Verify ZKPoK and convert to internal euint256
        contentKey = FHE.fromExternal(_encryptedKey, _inputProof);

        // Allow this contract to manage the key
        FHE.allowThis(contentKey);
        FHE.allow(contentKey, msg.sender);

        // Update state
        contentKeySet = true;

        emit ContentKeySet(msg.sender);
    }

    /**
     * @notice Update subscription parameters
     * @param _newPrice New subscription price in wei
     * @param _newDuration New subscription duration in seconds
     */
    function updateSubscriptionParams(uint256 _newPrice, uint256 _newDuration) external onlyOwner {
        if (_newDuration == 0) revert InvalidDuration();

        subscriptionPrice = _newPrice;
        subscriptionDuration = _newDuration;

        emit SubscriptionParamsUpdated(_newPrice, _newDuration);
    }

    /**
     * @notice Withdraw collected funds
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFundsToWithdraw();

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @notice Grant a free subscription (for promotions, etc.)
     * @param _subscriber Address to grant subscription to
     * @param _duration Custom duration in seconds
     */
    function grantSubscription(address _subscriber, uint256 _duration) external onlyOwner {
        if (!contentKeySet) revert ContentKeyNotSet();

        _createOrExtendSubscription(_subscriber, _duration, 0);
    }

    // ============ Subscriber Functions ============

    /**
     * @notice Purchase or renew a subscription
     * @dev Grants ACL permission to decrypt the content key
     */
    function subscribe() external payable nonReentrant {
        if (!contentKeySet) revert ContentKeyNotSet();
        if (msg.value < subscriptionPrice) {
            revert InsufficientPayment(subscriptionPrice, msg.value);
        }

        _createOrExtendSubscription(msg.sender, subscriptionDuration, msg.value);

        // Refund excess payment
        if (msg.value > subscriptionPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - subscriptionPrice}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Internal function to create or extend subscription
     */
    function _createOrExtendSubscription(address _subscriber, uint256 _duration, uint256 _pricePaid) internal {
        uint256 expirationTimestamp = expirationTimestamps[_subscriber];
        if (expirationTimestamp == 0) {
            // New subscription
            expirationTimestamp = block.timestamp + _duration;
            expirationTimestamps[_subscriber] = expirationTimestamp;

            emit SubscriptionPurchased(_subscriber, expirationTimestamp, _pricePaid);
        } else {
            // Renewal - extend from current expiration or now (whichever is later)
            uint256 baseTime = expirationTimestamp > block.timestamp ? expirationTimestamp : block.timestamp;
            expirationTimestamp = baseTime + _duration;
            expirationTimestamps[_subscriber] = expirationTimestamp;

            emit SubscriptionRenewed(_subscriber, expirationTimestamp);
        }

        // Grant ACL permission to decrypt the content key
        FHE.allow(contentKey, _subscriber);

        totalRevenue += _pricePaid;

        emit KeyAccessGranted(_subscriber);
    }

    // ============ View Functions ============

    /**
     * @notice Internal subscription validity check
     */
    function _isSubscriptionValid(address _subscriber) internal view returns (bool) {
        return expirationTimestamps[_subscriber] > block.timestamp;
    }

    /**
     * @notice Get the content key handle for decryption
     * @dev Only callable by addresses with valid subscriptions
     * @return The handle for the encrypted content key converted
     */
    function getContentKey() external view returns (euint256) {
        if (!_isSubscriptionValid(msg.sender) && msg.sender != owner()) {
            revert NoValidSubscription();
        }
        return contentKey;
    }

    /**
     * @notice Get subscription details for an address
     * @param _subscriber Address to query
     * @return expirationTimestamp When the subscription expires
     * @return isValid Whether the subscription is currently valid
     */
    function getSubscriptionDetails(
        address _subscriber
    ) external view returns (uint256 expirationTimestamp, bool isValid) {
        expirationTimestamp = expirationTimestamps[_subscriber];
        isValid = _isSubscriptionValid(_subscriber);

        return (expirationTimestamp, isValid);
    }
}
