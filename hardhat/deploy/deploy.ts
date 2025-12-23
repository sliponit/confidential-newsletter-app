import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deployment script for ConfidentialNewsletterLock
 *
 * Usage:
 *   npx hardhat deploy --network localhost
 *   npx hardhat deploy --network sepolia
 *
 * Configuration can be customized via environment variables:
 *   NEWSLETTER_NAME - Name of the newsletter
 *   SUBSCRIPTION_PRICE - Price in ETH (default: 0.001)
 *   SUBSCRIPTION_DURATION - Duration in days (default: 30)
 */

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Configuration with environment variable overrides
  const config = {
    name: process.env.NEWSLETTER_NAME || "Confidential Newsletter",
    price: hre.ethers.parseEther(process.env.SUBSCRIPTION_PRICE || "0.001"),
    duration: parseInt(process.env.SUBSCRIPTION_DURATION || "30") * 24 * 60 * 60, // days to seconds
  };

  console.log("\n========================================");
  console.log("  Deploying ConfidentialNewsletterLock");
  console.log("========================================\n");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer);
  console.log("\nConfiguration:");
  console.log("  Name:", config.name);
  console.log("  Price:", hre.ethers.formatEther(config.price), "ETH");
  console.log("  Duration:", config.duration / (24 * 60 * 60), "days");
  console.log("");

  const deployed = await deploy("ConfidentialNewsletterLock", {
    from: deployer,
    args: [config.name, config.price, config.duration],
    log: true,
  });

  console.log("\n========================================");
  console.log("  Deployment Complete!");
  console.log("========================================\n");
  console.log("Contract Address:", deployed.address);
  console.log("Transaction Hash:", deployed.transactionHash);
  console.log("Gas Used:", deployed.receipt?.gasUsed?.toString());
  console.log("");

  // Verify on Etherscan if not localhost
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("0. Verify the contract:");
    console.log(`   npx hardhat task:verify --network ${hre.network.name} --contract ${deployed.address}`);
    console.log("");
  }

  console.log("\n========================================");
  console.log("  Next Steps");
  console.log("========================================\n");
  console.log("1. Set the content key:");
  console.log(`   npx hardhat task:setContentKey --network ${hre.network.name} --contract ${deployed.address}`);
  console.log("");
  console.log("2. Users can subscribe:");
  console.log(`   npx hardhat task:subscribe --network ${hre.network.name} --contract ${deployed.address}`);
  console.log("");

  return true;
};

func.id = "deploy_confidential_newsletter_lock";
func.tags = ["ConfidentialNewsletterLock"];

export default func;
