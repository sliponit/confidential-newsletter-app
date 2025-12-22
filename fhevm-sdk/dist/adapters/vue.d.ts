/**
 * Vue Adapter - Universal FHEVM SDK
 * Placeholder Vue composables - actual implementation in Vue showcase
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
export declare function useFhevm(): {
    instance: null;
    status: "idle";
    error: string;
    initialize: () => Promise<void>;
    isInitialized: boolean;
};
export declare function useContract(address: string, abi: any[]): {
    contract: null;
    isReady: boolean;
    error: string;
};
export declare function useDecrypt(): {
    decrypt: () => Promise<number>;
    publicDecrypt: () => Promise<number>;
    isDecrypting: boolean;
    error: string;
};
export declare function useEncrypt(): {
    encrypt: () => Promise<{
        encryptedData: string;
        proof: string;
    }>;
    isEncrypting: boolean;
    error: string;
};
export declare function useFhevmOperations(): {
    encrypt: () => Promise<{
        encryptedData: string;
        proof: string;
    }>;
    isEncrypting: boolean;
    encryptError: string;
    decrypt: () => Promise<number>;
    publicDecrypt: () => Promise<number>;
    isDecrypting: boolean;
    decryptError: string;
    executeTransaction: () => Promise<{
        tx: null;
        receipt: null;
    }>;
    isProcessing: boolean;
    message: string;
    isBusy: boolean;
    hasError: boolean;
};
