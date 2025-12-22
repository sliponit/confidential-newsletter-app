/**
 * Vanilla JS Adapter - Universal FHEVM SDK
 * Clean, simple vanilla JavaScript utilities using your working implementation
 */
import { initializeFheInstance, decryptValue, createEncryptedInput, publicDecrypt } from '../core/index.js';
/**
 * Simple Vanilla JS FHEVM manager
 */
export class FhevmVanilla {
    constructor() {
        this.instance = null;
        this.isReady = false;
    }
    async initialize() {
        try {
            this.instance = await initializeFheInstance();
            this.isReady = true;
            console.log('✅ FHEVM Vanilla instance ready');
        }
        catch (error) {
            console.error('❌ FHEVM Vanilla initialization failed:', error);
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
