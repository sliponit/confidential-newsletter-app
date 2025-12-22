/**
 * Simple FHEVM Core - Universal SDK
 * Clean, working FHEVM implementation for all frameworks
 * Uses CDN for browser environments to avoid bundling issues
 */
/**
 * Initialize FHEVM instance
 * Uses CDN for browser environments to avoid bundling issues
 */
export declare function initializeFheInstance(): Promise<any>;
export declare function getFheInstance(): any;
/**
 * Decrypt a single encrypted value using EIP-712 user decryption (matches showcase API)
 */
export declare function decryptValue(encryptedBytes: string, contractAddress: string, signer: any): Promise<number>;
/**
 * Public decryption for handles that don't require user authentication
 */
export declare function publicDecrypt(encryptedBytes: string): Promise<number>;
