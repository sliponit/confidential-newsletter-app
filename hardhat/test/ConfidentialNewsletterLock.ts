import { ConfidentialNewsletterLock, ConfidentialNewsletterLock__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

// ============ Types ============

type Signers = {
  publisher: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

type DeployedContract = {
  contract: ConfidentialNewsletterLock;
  address: string;
};

// ============ Constants ============

const NEWSLETTER_NAME = "Confidential Weekly";
const SUBSCRIPTION_PRICE = ethers.parseEther("0.01"); // 0.01 ETH
const SUBSCRIPTION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

// Sample AES-256 key (32 bytes = 256 bits)
// In production, this would be generated securely
const SAMPLE_AES_KEY = BigInt("0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

// ============ Fixtures ============

async function deployFixture(): Promise<DeployedContract> {
  const factory = (await ethers.getContractFactory(
    "ConfidentialNewsletterLock",
  )) as ConfidentialNewsletterLock__factory;

  const contract = await factory.deploy(NEWSLETTER_NAME, SUBSCRIPTION_PRICE, SUBSCRIPTION_DURATION);

  const address = await contract.getAddress();
  return { contract, address };
}

async function deployAndSetKeyFixture(publisher: HardhatEthersSigner): Promise<DeployedContract> {
  const { contract, address } = await deployFixture();

  // Encrypt the AES key using FHEVM
  const encryptedInput = await fhevm.createEncryptedInput(address, publisher.address);
  encryptedInput.add256(SAMPLE_AES_KEY);
  const encrypted = await encryptedInput.encrypt();

  // Set the content key
  await contract.connect(publisher).setContentKey(encrypted.handles[0], encrypted.inputProof);

  return { contract, address };
}

// ============ Test Suite ============

describe("ConfidentialNewsletterLock", function () {
  let signers: Signers;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      publisher: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  // ============ Deployment Tests ============

  describe("Deployment", function () {
    it("should deploy with correct initial parameters", async function () {
      const { contract } = await deployFixture();

      expect(await contract.name()).to.equal(NEWSLETTER_NAME);
      expect(await contract.subscriptionPrice()).to.equal(SUBSCRIPTION_PRICE);
      expect(await contract.subscriptionDuration()).to.equal(SUBSCRIPTION_DURATION);
      expect(await contract.contentKeySet()).to.equal(false);
      // currentEdition check removed
      expect(await contract.owner()).to.equal(signers.publisher.address);
    });

    it("should revert if duration is zero", async function () {
      const factory = (await ethers.getContractFactory(
        "ConfidentialNewsletterLock",
      )) as ConfidentialNewsletterLock__factory;

      await expect(factory.deploy(NEWSLETTER_NAME, SUBSCRIPTION_PRICE, 0)).to.be.revertedWithCustomError(
        factory,
        "InvalidDuration",
      );
    });

    it("should allow zero price (free newsletter)", async function () {
      const factory = (await ethers.getContractFactory(
        "ConfidentialNewsletterLock",
      )) as ConfidentialNewsletterLock__factory;

      const contract = await factory.deploy(
        NEWSLETTER_NAME,
        0, // Free
        SUBSCRIPTION_DURATION,
      );

      expect(await contract.subscriptionPrice()).to.equal(0);
    });
  });

  // ============ Content Key Tests ============

  describe("Content Key Management", function () {
    it("should allow owner to set content key", async function () {
      const { contract, address } = await deployFixture();

      // Encrypt the AES key
      const encryptedInput = await fhevm.createEncryptedInput(address, signers.publisher.address);
      encryptedInput.add256(SAMPLE_AES_KEY);
      const encrypted = await encryptedInput.encrypt();

      // Set the key
      await expect(contract.connect(signers.publisher).setContentKey(encrypted.handles[0], encrypted.inputProof))
        .to.emit(contract, "ContentKeySet")
        .withArgs(signers.publisher.address);

      expect(await contract.contentKeySet()).to.equal(true);
      // currentEdition check removed
    });

    it("should revert if non-owner tries to set content key", async function () {
      const { contract, address } = await deployFixture();

      const encryptedInput = await fhevm.createEncryptedInput(address, signers.alice.address);
      encryptedInput.add256(SAMPLE_AES_KEY);
      const encrypted = await encryptedInput.encrypt();

      await expect(
        contract.connect(signers.alice).setContentKey(encrypted.handles[0], encrypted.inputProof),
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  // ============ Subscription Tests ============

  describe("Subscription Purchase", function () {
    it("should allow user to subscribe with exact payment", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      await expect(contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE }))
        .to.emit(contract, "SubscriptionPurchased")
        .to.emit(contract, "KeyAccessGranted");

      const details = await contract.getSubscriptionDetails(signers.alice.address);
      expect(details[1]).to.equal(true); // isValid
    });

    it("should refund excess payment", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);
      const overpayment = ethers.parseEther("0.02"); // 2x the price

      const balanceBefore = await ethers.provider.getBalance(signers.alice.address);

      const tx = await contract.connect(signers.alice).subscribe({ value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(signers.alice.address);
      const actualSpent = balanceBefore - balanceAfter;

      // Should have spent only price + gas, not the full overpayment
      expect(actualSpent).to.be.closeTo(
        SUBSCRIPTION_PRICE + gasUsed,
        ethers.parseEther("0.0001"), // Allow small variance
      );
    });

    it("should revert if payment is insufficient", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);
      const underpayment = ethers.parseEther("0.001"); // Less than price

      await expect(contract.connect(signers.alice).subscribe({ value: underpayment })).to.be.revertedWithCustomError(
        contract,
        "InsufficientPayment",
      );
    });

    it("should revert if content key not set", async function () {
      const { contract } = await deployFixture();

      await expect(
        contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE }),
      ).to.be.revertedWithCustomError(contract, "ContentKeyNotSet");
    });

    it("should allow subscription renewal", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      // First subscription
      await contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE });
      const detailsAfterFirst = await contract.getSubscriptionDetails(signers.alice.address);

      // Renew
      await expect(contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE })).to.emit(
        contract,
        "SubscriptionRenewed",
      );

      const detailsAfterRenewal = await contract.getSubscriptionDetails(signers.alice.address);

      // Expiration should be extended
      expect(detailsAfterRenewal[0]).to.be.gt(detailsAfterFirst[0]);
    });
  });

  // ============ Access Control Tests ============

  describe("Key Access Control", function () {
    it("should return key handle for valid subscriber", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);
      await contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE });

      // Should not revert
      const handle = await contract.connect(signers.alice).getContentKey();
      expect(handle).to.not.equal(ethers.ZeroHash);
    });

    it("should return key handle for owner", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      // Owner can always access
      const handle = await contract.connect(signers.publisher).getContentKey();
      expect(handle).to.not.equal(ethers.ZeroHash);
    });

    it("should revert getContentKey for non-subscriber", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      await expect(contract.connect(signers.alice).getContentKey()).to.be.revertedWithCustomError(
        contract,
        "NoValidSubscription",
      );
    });

    it("should allow subscriber to decrypt content key [skip-on-coverage]", async function () {
      const { contract, address } = await deployAndSetKeyFixture(signers.publisher);

      // Subscribe
      await contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE });

      // Get the encrypted handle
      const encrypted = await contract.connect(signers.alice).getContentKey();

      // Decrypt using FHEVM userDecrypt
      const decryptedKey = await fhevm.userDecryptEuint(FhevmType.euint256, encrypted, address, signers.alice);

      // Verify the decrypted key matches what we set
      expect(decryptedKey).to.equal(SAMPLE_AES_KEY);
    });
  });

  // ============ Publisher Functions Tests ============

  describe("Publisher Functions", function () {
    it("should allow owner to grant free subscription", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);
      const customDuration = 7 * 24 * 60 * 60; // 7 days

      await expect(contract.connect(signers.publisher).grantSubscription(signers.alice.address, customDuration))
        .to.emit(contract, "SubscriptionPurchased")
        .to.emit(contract, "KeyAccessGranted");

      const details = await contract.getSubscriptionDetails(signers.alice.address);
      expect(details[1]).to.equal(true);
    });

    it("should allow owner to update subscription params", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);
      const newPrice = ethers.parseEther("0.05");
      const newDuration = 60 * 24 * 60 * 60; // 60 days

      await expect(contract.connect(signers.publisher).updateSubscriptionParams(newPrice, newDuration))
        .to.emit(contract, "SubscriptionParamsUpdated")
        .withArgs(newPrice, newDuration);

      expect(await contract.subscriptionPrice()).to.equal(newPrice);
      expect(await contract.subscriptionDuration()).to.equal(newDuration);
    });

    it("should allow owner to withdraw funds", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      // Subscribe to add funds
      await contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE });
      await contract.connect(signers.bob).subscribe({ value: SUBSCRIPTION_PRICE });

      const contractBalance = await ethers.provider.getBalance(await contract.getAddress());
      expect(contractBalance).to.equal(SUBSCRIPTION_PRICE * 2n);

      const publisherBalanceBefore = await ethers.provider.getBalance(signers.publisher.address);

      await expect(contract.connect(signers.publisher).withdraw())
        .to.emit(contract, "FundsWithdrawn")
        .withArgs(signers.publisher.address, SUBSCRIPTION_PRICE * 2n);

      const publisherBalanceAfter = await ethers.provider.getBalance(signers.publisher.address);

      // Publisher balance should have increased (minus gas)
      expect(publisherBalanceAfter).to.be.gt(publisherBalanceBefore);
    });

    it("should revert withdraw if no funds", async function () {
      const { contract } = await deployAndSetKeyFixture(signers.publisher);

      await expect(contract.connect(signers.publisher).withdraw()).to.be.revertedWithCustomError(
        contract,
        "NoFundsToWithdraw",
      );
    });
  });

  // ============ View Functions Tests ============
  // removed getContractInfo check

  // ============ Edge Cases ============

  describe("Edge Cases", function () {
    it("should handle expired subscription correctly", async function () {
      const factory = (await ethers.getContractFactory(
        "ConfidentialNewsletterLock",
      )) as ConfidentialNewsletterLock__factory;

      // Deploy with very short duration (1 second)
      const contract = await factory.deploy(
        NEWSLETTER_NAME,
        SUBSCRIPTION_PRICE,
        1, // 1 second duration
      );
      const address = await contract.getAddress();

      // Set content key
      const encryptedInput = await fhevm.createEncryptedInput(address, signers.publisher.address);
      encryptedInput.add256(SAMPLE_AES_KEY);
      const encrypted = await encryptedInput.encrypt();
      await contract.setContentKey(encrypted.handles[0], encrypted.inputProof);

      // Subscribe
      await contract.connect(signers.alice).subscribe({ value: SUBSCRIPTION_PRICE });
      let details = await contract.getSubscriptionDetails(signers.alice.address);
      expect(details[1]).to.equal(true);

      // Wait for subscription to expire
      await ethers.provider.send("evm_increaseTime", [2]); // 2 seconds
      await ethers.provider.send("evm_mine", []);

      // Should now be expired
      details = await contract.getSubscriptionDetails(signers.alice.address);
      expect(details[1]).to.equal(false);

      // Should not be able to get key handle
      await expect(contract.connect(signers.alice).getContentKey()).to.be.revertedWithCustomError(
        contract,
        "NoValidSubscription",
      );
    });

    it("should allow free subscriptions (price = 0)", async function () {
      const factory = (await ethers.getContractFactory(
        "ConfidentialNewsletterLock",
      )) as ConfidentialNewsletterLock__factory;

      const contract = await factory.deploy(
        NEWSLETTER_NAME,
        0, // Free
        SUBSCRIPTION_DURATION,
      );
      const address = await contract.getAddress();

      // Set content key
      const encryptedInput = await fhevm.createEncryptedInput(address, signers.publisher.address);
      encryptedInput.add256(SAMPLE_AES_KEY);
      const encrypted = await encryptedInput.encrypt();
      await contract.setContentKey(encrypted.handles[0], encrypted.inputProof);

      // Subscribe for free
      await contract.connect(signers.alice).subscribe({ value: 0 });
      const details = await contract.getSubscriptionDetails(signers.alice.address);
      expect(details[1]).to.equal(true);
    });
  });
});
