# Confidential Newsletter Lock

A privacy-preserving newsletter paywall powered by Zama's Fully Homomorphic Encryption (FHEVM). Publishers store an FHE-encrypted AES key on-chain, and only subscribers with valid subscriptions can decrypt content through ACL-controlled access.

**Live Demo**: https://confidential-newsletter-app.vercel.app
**Contract (Sepolia)**: [0x510799909bDD4d1936e68e3b4c6ea716e112536b](https://sepolia.etherscan.io/address/0x510799909bDD4d1936e68e3b4c6ea716e112536b#code)
**Example Content**: https://confidential-newsletter-app.vercel.app/content/QmUPP2A4XP293tBR1niDon2PE4jNvSfHKgMPTumsScJAtT

---

## Overview

Traditional newsletter paywalls manage access credentials centrally, exposing subscription data and creating single points of failure. **Confidential Newsletter Lock** reimagines this by:

1. Storing an **FHE-encrypted AES-256 content key** on-chain
2. Granting **ACL access** to subscribers via smart contract logic
3. Allowing only authorized addresses to **decrypt the key** through Zama's threshold decryption
4. **Encrypting content** (AES-256-GCM) before storing on IPFS

This approach draws inspiration from [Unlock Protocol](https://unlock-protocol.com/) but replaces traditional access tokens with FHE-based cryptographic access control.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLISHER                                │
│  1. Deploy contract with price/duration                         │
│  2. Generate AES-256 key → FHE encrypt → store on-chain         │
│  3. Encrypt content with AES key → upload to IPFS               │
│  4. Share content links (e.g., paragraph.com preview)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               SMART CONTRACT (ConfidentialNewsletterLock)        │
│  • euint256 contentKey (FHE-encrypted)                          │
│  • mapping(address => uint256) expirationTimestamps             │
│  • FHE.allow(contentKey, subscriber) on subscription            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUBSCRIBER                               │
│  1. Pay subscription → receive ACL access                       │
│  2. Request key decryption (EIP-712 signed)                     │
│  3. Zama relayer decrypts via threshold MPC                     │
│  4. Decrypt IPFS content with AES key                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **FHE-Encrypted Key Storage**: Content key stored as `euint256`, decryptable only by ACL-authorized addresses
- **Time-Based Subscriptions**: Automatic expiration with renewal support
- **Overpayment Refunds**: Excess ETH returned to subscribers
- **Promotional Grants**: Owner can grant free subscriptions
- **IPFS Content Storage**: Encrypted content stored on Pinata, accessible via CID

---

## Smart Contract

**Contract**: `ConfidentialNewsletterLock.sol`

Key functions:
| Function | Access | Description |
|----------|--------|-------------|
| `setContentKey(bytes, bytes)` | Owner | Set FHE-encrypted AES key (once) |
| `subscribe()` | Public (payable) | Purchase subscription, grant ACL |
| `getContentKey()` | Subscriber/Owner | Get encrypted key handle |
| `getSubscriptionDetails(address)` | Public | Check subscription status |
| `grantSubscription(address, uint256)` | Owner | Free promotional access |
| `withdraw()` | Owner | Claim collected fees |

---

## Usage

### For Subscribers

Subscribe via CLI:
```bash
npx hardhat task:subscribe --network sepolia --contract 0x510799909bDD4d1936e68e3b4c6ea716e112536b
```

Or through the web interface by connecting your wallet and clicking "Subscribe Now" on any content page.

### For Publishers

1. **Connect as owner**: The upload form appears only when connected with the contract owner's wallet

2. **Upload content**:
   - Click "Decrypt Key" to retrieve the AES key (requires EIP-712 signature)
   - Fill in title, subtitle, and markdown content
   - Click "Upload to IPFS"
   - Copy the generated link for sharing

3. **Paragraph.com integration**: Use the content link as a custom button redirect from your paragraph.com newsletter preview

---

## Content Access Flow

When a user visits `/content/:cid`:

1. **Fetch**: Content metadata retrieved from Pinata (title, subtitle visible to all)
2. **Auth Check**: Contract queries `getSubscriptionDetails(account)` and `owner()`
3. **Authorized** (owner or valid subscriber):
   - Get content key handle from contract
   - Decrypt key via FHE with EIP-712 signature
   - Decrypt content with AES-256-GCM
   - Display full markdown content
4. **Unauthorized**:
   - Show title/subtitle only
   - Display subscription price and "Subscribe Now" button

---

## Design Flaw (Acknowledged)

Since subscribers receive ACL access to decrypt the content key, they can technically decrypt **all newsletter editions** without the contract validating `isValid` from subscription details at content-fetch time. The current implementation relies on good faith.

**Mitigation approaches for future versions**:
- Store unique IVs per edition in the contract
- Iterate on edition access for subscribers at subscribe-time
- Per-edition encrypted keys with separate ACL grants

---

## Future Developments

1. **Per-Edition Access Control**: Store IVs in contract and grant per-edition ACL
2. **Factory Pattern**: Create `ConfidentialNewsletterLockFactory` for multiple newsletters
3. **Full Unlock Protocol Adaptation**: Integrate shared AES key management into Unlock's existing lock ecosystem

---

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com/))

### Installation

```bash
# Clone repository
git clone <repo-url>
cd confidential-newsletter-app

# Install frontend dependencies
npm install

# Install hardhat dependencies
cd hardhat && npm install && cd ..
```

### Environment Setup

Create `.env.local` in root:
```
REACT_APP_PINATA_JWT=<your-pinata-jwt>
REACT_APP_BASE_URL=https://your-domain.com
```

For hardhat, set variables:
```bash
cd hardhat
npx hardhat vars set MNEMONIC "<your-mnemonic>"
npx hardhat vars set INFURA_API_KEY "<your-infura-key>"
```

### Run Locally

```bash
npm start
```

### Deploy Contract

```bash
cd hardhat
npx hardhat deploy --network sepolia
npx hardhat task:verify --network sepolia --contract <CONTRACT_ADDRESS>
npx hardhat task:setContentKey --network sepolia --contract <CONTRACT_ADDRESS>
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Ethers.js 6, Tailwind CSS |
| Smart Contract | Solidity 0.8.27, Hardhat, @fhevm/solidity |
| Encryption | AES-256-GCM (content), FHE (key storage) |
| FHE SDK | Zama Relayer SDK v0.3.0-8 |
| Storage | Pinata/IPFS |
| Network | Ethereum Sepolia (FHEVM-enabled) |

---

## Links

- [Zama Protocol Litepaper](https://docs.zama.org/protocol/zama-protocol-litepaper)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Unlock Protocol](https://unlock-protocol.com/) (inspiration)

---

## License

MIT
