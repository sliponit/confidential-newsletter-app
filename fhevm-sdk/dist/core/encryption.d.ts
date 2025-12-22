/**
 * FHEVM Encryption - Universal SDK
 * Simple encryption using your working implementation
 */
/**
 * Encrypt values using FHEVM
 */
export declare function encryptValue(contractAddress: string, address: string, plainDigits: number[]): Promise<any>;
/**
 * Create encrypted input for contract interaction (matches showcase API)
 */
export declare function createEncryptedInput(contractAddress: string, userAddress: string, value: number): Promise<{
    encryptedData: any;
    proof: any;
}>;
