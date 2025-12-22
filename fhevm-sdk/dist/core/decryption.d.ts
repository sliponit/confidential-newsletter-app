/**
 * FHEVM Decryption - Universal SDK
 * EIP-712 signing + publicDecrypt implementation
 */
import { Signer } from 'ethers';
/**
 * Request user decryption with EIP-712 signature
 */
export declare function requestUserDecryption(contractAddress: string, signer: Signer, ciphertextHandle: string): Promise<any>;
/**
 * Public decryption for multiple handles
 */
export declare function fetchPublicDecryption(handles: string[]): Promise<any>;
