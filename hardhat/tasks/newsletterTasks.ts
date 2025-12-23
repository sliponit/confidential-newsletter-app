import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Task: Set Content Key
 * Sets the FHE-encrypted AES content key for the newsletter
 *
 * Usage:
 *   npx hardhat task:setContentKey --network sepolia --contract <ADDRESS>
 */
task("task:setContentKey")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhevm, ethers } = hre;
    const { contract: contractAddress } = taskArguments;

    await fhevm.initializeCLIApi();

    console.log("\n========================================");
    console.log("  Setting Content Key");
    console.log("========================================\n");

    // Get signer (deployer/owner)
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Get contract instance
    const ConfidentialNewsletterLock = await ethers.getContractFactory("ConfidentialNewsletterLock");
    const contract = ConfidentialNewsletterLock.attach(contractAddress).connect(signer);

    // Generate a random AES-256 key (32 bytes)
    const aesKey = ethers.randomBytes(32);
    const aesKeyBigInt = BigInt("0x" + Buffer.from(aesKey).toString("hex"));

    console.log("\nGenerated AES-256 Key (hex):", "0x" + Buffer.from(aesKey).toString("hex"));
    console.log("\n⚠️  IMPORTANT: Save this key securely! It's needed for content encryption.");

    // Encrypt the key using FHEVM
    console.log("\nEncrypting key with FHE...");
    const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signer.address);
    encryptedInput.add256(aesKeyBigInt);
    const encrypted = await encryptedInput.encrypt();

    // Set the content key
    console.log("Submitting transaction...");
    const tx = await contract.setContentKey(encrypted.handles[0], encrypted.inputProof);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);
    console.log("\n✅ Content key set successfully!");
  });

/**
 * Task: Subscribe
 * Purchase a subscription to the newsletter
 *
 * Usage:
 *   npx hardhat task:subscribe --network sepolia --contract <ADDRESS>
 */
task("task:subscribe")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const { contract: contractAddress } = taskArguments;

    await fhevm.initializeCLIApi();

    console.log("\n========================================");
    console.log("  Subscribing to Newsletter");
    console.log("========================================\n");

    const [_owner, signer] = await ethers.getSigners();
    console.log("Subscriber:", signer.address);

    const ConfidentialNewsletterLock = await ethers.getContractFactory("ConfidentialNewsletterLock");
    const contract = ConfidentialNewsletterLock.attach(contractAddress).connect(signer);

    // Get subscription info
    const price = await contract.subscriptionPrice();
    const duration = await contract.subscriptionDuration();
    console.log("Price:", ethers.formatEther(price), "ETH");
    console.log("Duration:", Number(duration) / (24 * 60 * 60), "days");

    // Check existing subscription
    const hasValid = await contract.getSubscriptionDetails(signer.address)[1];
    if (hasValid) {
      console.log("\nYou already have a valid subscription. This will extend it.");
    }

    // Subscribe
    console.log("\nSubmitting subscription transaction...");
    const tx = await contract.subscribe({ value: price });
    console.log("Transaction hash:", tx.hash);

    await tx.wait();

    // Get updated details
    const details = await contract.getSubscriptionDetails(signer.address);
    const expirationDate = new Date(Number(details.expirationTimestamp) * 1000);

    console.log("\n✅ Subscription successful!");
    console.log("Expires:", expirationDate.toISOString());
  });

/**
 * Task: Get Content Key
 * Decrypt the content key (for subscribers only)
 *
 * Usage:
 *   npx hardhat task:getContentKey --network sepolia --contract <ADDRESS>
 */
task("task:getContentKey")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhevm, ethers } = hre;
    const { FhevmType } = await import("@fhevm/hardhat-plugin");
    const { contract: contractAddress } = taskArguments;

    await fhevm.initializeCLIApi();

    console.log("\n========================================");
    console.log("  Decrypting Content Key");
    console.log("========================================\n");

    const [_owner, signer] = await ethers.getSigners();
    console.log("Subscriber:", signer.address);

    const ConfidentialNewsletterLock = await ethers.getContractFactory("ConfidentialNewsletterLock");
    const contract = ConfidentialNewsletterLock.attach(contractAddress).connect(signer);

    // // Check subscription
    // const hasValid = await contract.getSubscriptionDetails(signer.address)[1];

    // if (!hasValid) {
    //   throw new Error("No valid subscription. Please subscribe first.");
    // }

    // Get the encrypted key handle
    console.log("Getting encrypted key handle...");
    const encryptedHandle = await contract.getContentKey();
    console.log("Handle:", encryptedHandle);

    // Decrypt using FHEVM
    console.log("Decrypting with FHEVM (this may take a moment)...");
    const decryptedKey = await fhevm.userDecryptEuint(FhevmType.euint256, encryptedHandle, contractAddress, signer);

    // Convert to hex
    const keyHex = "0x" + decryptedKey.toString(16).padStart(64, "0");

    console.log("\n✅ Decryption successful!");
    console.log("AES-256 Key (hex):", keyHex);
    console.log("\nUse this key to decrypt the newsletter content from IPFS.");
  });

/**
 * Task: Withdraw
 * Withdraw collected funds (owner only)
 *
 * Usage:
 *   npx hardhat task:withdraw --network sepolia --contract <ADDRESS>
 */
task("task:withdraw")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const { contract: contractAddress } = taskArguments;

    console.log("\n========================================");
    console.log("  Withdrawing Funds");
    console.log("========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("Owner:", signer.address);

    const ConfidentialNewsletterLock = await ethers.getContractFactory("ConfidentialNewsletterLock");
    const contract = ConfidentialNewsletterLock.attach(contractAddress).connect(signer);

    const balance = await ethers.provider.getBalance(contractAddress);
    console.log("Contract balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("No funds to withdraw.");
      return;
    }

    console.log("Withdrawing...");
    const tx = await contract.withdraw();
    console.log("Transaction hash:", tx.hash);

    await tx.wait();
    console.log("\n✅ Withdrawal successful!");
  });

task("task:verify")
  .addParam("contract", "The deployed contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { contract: contractAddress } = taskArguments;
    const config = {
      name: process.env.NEWSLETTER_NAME || "Confidential Newsletter",
      price: hre.ethers.parseEther(process.env.SUBSCRIPTION_PRICE || "0.001"),
      duration: parseInt(process.env.SUBSCRIPTION_DURATION || "30") * 24 * 60 * 60, // days to seconds
    };
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [config.name, config.price, config.duration],
    });
    console.log("Contract verified successfully!");
  });
