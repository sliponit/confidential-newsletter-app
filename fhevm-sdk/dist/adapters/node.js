/**
 * Node.js Adapter - Universal FHEVM SDK
 * Clean, simple Node.js utilities using your working implementation
 */
import { initializeFheInstance, decryptValue, createEncryptedInput, publicDecrypt } from '../core/index.js';
/**
 * Simple Node.js FHEVM manager
 */
export class FhevmNode {
    constructor() {
        this.instance = null;
        this.isReady = false;
    }
    async initialize() {
        try {
            this.instance = await initializeFheInstance();
            this.isReady = true;
            console.log('✅ FHEVM Node instance ready');
        }
        catch (error) {
            console.error('❌ FHEVM Node initialization failed:', error);
            throw error;
        }
    }
    async encrypt(contractAddress, userAddress, value) {
        if (!this.isReady)
            throw new Error('FHEVM not initialized');
        return createEncryptedInput(contractAddress, userAddress, value);
    }
    async decrypt(handle, contractAddress, signer) {
        if (!this.isReady)
            throw new Error('FHEVM not initialized');
        return decryptValue(handle, contractAddress, signer);
    }
    async publicDecrypt(handle) {
        if (!this.isReady)
            throw new Error('FHEVM not initialized');
        return publicDecrypt(handle);
    }
    getInstance() {
        return this.instance;
    }
    getStatus() {
        return this.isReady ? 'ready' : 'idle';
    }
}
