/**
 * Node.js Adapter - Universal FHEVM SDK
 * Clean, simple Node.js utilities using your working implementation
 */
/**
 * Simple Node.js FHEVM manager
 */
export declare class FhevmNode {
    private instance;
    private isReady;
    initialize(): Promise<void>;
    encrypt(contractAddress: string, userAddress: string, value: number): Promise<{
        encryptedData: any;
        proof: any;
    }>;
    decrypt(handle: string, contractAddress: string, signer: any): Promise<number>;
    publicDecrypt(handle: string): Promise<number>;
    getInstance(): any;
    getStatus(): "idle" | "ready";
}
