/**
 * React Adapter - Universal FHEVM SDK
 * Wagmi-like React hooks for FHEVM operations
 */
import { ethers } from 'ethers';
/**
 * Wagmi-like hook for wallet connection
 */
export declare function useWallet(): {
    address: string;
    isConnected: boolean;
    chainId: number;
    isConnecting: boolean;
    error: string;
    connect: () => Promise<void>;
    disconnect: () => void;
};
/**
 * Wagmi-like hook for FHEVM instance
 */
export declare function useFhevm(): {
    instance: any;
    status: "error" | "idle" | "loading" | "ready";
    error: string;
    initialize: () => Promise<void>;
    isInitialized: boolean;
};
/**
 * Wagmi-like hook for contract interactions
 */
export declare function useContract(address: string, abi: any[]): {
    contract: ethers.Contract | null;
    isReady: boolean;
    error: string;
};
/**
 * Wagmi-like hook for decryption operations
 */
export declare function useDecrypt(): {
    decrypt: (handle: string, contractAddress: string, signer: any) => Promise<number>;
    publicDecrypt: (handle: string) => Promise<number>;
    isDecrypting: boolean;
    error: string;
};
/**
 * Wagmi-like hook for encryption operations
 */
export declare function useEncrypt(): {
    encrypt: (contractAddress: string, userAddress: string, value: number) => Promise<{
        encryptedData: any;
        proof: any;
    }>;
    isEncrypting: boolean;
    error: string;
};
/**
 * Comprehensive wagmi-like hook for FHEVM operations
 */
export declare function useFhevmOperations(): {
    encrypt: (contractAddress: string, userAddress: string, value: number) => Promise<{
        encryptedData: any;
        proof: any;
    }>;
    isEncrypting: boolean;
    encryptError: string;
    decrypt: (handle: string, contractAddress: string, signer: any) => Promise<number>;
    publicDecrypt: (handle: string) => Promise<number>;
    isDecrypting: boolean;
    decryptError: string;
    executeTransaction: (contract: ethers.Contract, method: string, encryptedData: string, proof: string, ...args: any[]) => Promise<{
        tx: any;
        receipt: any;
    }>;
    isProcessing: boolean;
    message: string;
    isBusy: boolean;
    hasError: boolean;
};
