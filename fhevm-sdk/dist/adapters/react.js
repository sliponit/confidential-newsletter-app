/**
 * React Adapter - Universal FHEVM SDK
 * Wagmi-like React hooks for FHEVM operations
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { initializeFheInstance, decryptValue, createEncryptedInput, publicDecrypt } from '../core/index.js';
/**
 * Wagmi-like hook for wallet connection
 */
export function useWallet() {
    const [address, setAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [chainId, setChainId] = useState(0);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const connect = useCallback(async () => {
        if (!window.ethereum) {
            setError('MetaMask not found. Please install MetaMask.');
            return;
        }
        setIsConnecting(true);
        setError('');
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            setAddress(account);
            setIsConnected(true);
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(parseInt(chainId, 16));
            console.log('✅ Wallet connected:', account);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
            console.error('❌ Wallet connection failed:', err);
        }
        finally {
            setIsConnecting(false);
        }
    }, []);
    const disconnect = useCallback(() => {
        setAddress('');
        setIsConnected(false);
        setChainId(0);
        setError('');
        console.log('🔌 Wallet disconnected');
    }, []);
    return {
        address,
        isConnected,
        chainId,
        isConnecting,
        error,
        connect,
        disconnect,
    };
}
/**
 * Wagmi-like hook for FHEVM instance
 */
export function useFhevm() {
    const [instance, setInstance] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const initialize = useCallback(async () => {
        setStatus('loading');
        setError('');
        try {
            const fheInstance = await initializeFheInstance();
            setInstance(fheInstance);
            setStatus('ready');
            console.log('✅ FHEVM initialized');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
            console.error('❌ FHEVM initialization failed:', err);
        }
    }, []);
    return {
        instance,
        status,
        error,
        initialize,
        isInitialized: status === 'ready',
    };
}
/**
 * Wagmi-like hook for contract interactions
 */
export function useContract(address, abi) {
    const [contract, setContract] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!window.ethereum || !address || !abi)
            return;
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contractInstance = new ethers.Contract(address, abi, provider);
            setContract(contractInstance);
            setIsReady(true);
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Contract setup failed');
            setIsReady(false);
        }
    }, [address, abi]);
    return {
        contract,
        isReady,
        error,
    };
}
/**
 * Wagmi-like hook for decryption operations
 */
export function useDecrypt() {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [error, setError] = useState('');
    const decrypt = useCallback(async (handle, contractAddress, signer) => {
        setIsDecrypting(true);
        setError('');
        try {
            const result = await decryptValue(handle, contractAddress, signer);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Decryption failed');
            throw err;
        }
        finally {
            setIsDecrypting(false);
        }
    }, []);
    const publicDecryptValue = useCallback(async (handle) => {
        setIsDecrypting(true);
        setError('');
        try {
            const result = await publicDecrypt(handle);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Public decryption failed');
            throw err;
        }
        finally {
            setIsDecrypting(false);
        }
    }, []);
    return {
        decrypt,
        publicDecrypt: publicDecryptValue,
        isDecrypting,
        error,
    };
}
/**
 * Wagmi-like hook for encryption operations
 */
export function useEncrypt() {
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [error, setError] = useState('');
    const encrypt = useCallback(async (contractAddress, userAddress, value) => {
        setIsEncrypting(true);
        setError('');
        try {
            const result = await createEncryptedInput(contractAddress, userAddress, value);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Encryption failed');
            throw err;
        }
        finally {
            setIsEncrypting(false);
        }
    }, []);
    return {
        encrypt,
        isEncrypting,
        error,
    };
}
/**
 * Comprehensive wagmi-like hook for FHEVM operations
 */
export function useFhevmOperations() {
    const { decrypt, publicDecrypt, isDecrypting, error: decryptError } = useDecrypt();
    const { encrypt, isEncrypting, error: encryptError } = useEncrypt();
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const executeTransaction = useCallback(async (contract, method, encryptedData, proof, ...args) => {
        setIsProcessing(true);
        setMessage('Sending transaction...');
        try {
            const tx = await contract[method](encryptedData, proof, ...args);
            setMessage('Waiting for confirmation...');
            const receipt = await tx.wait();
            setMessage('Transaction confirmed!');
            return { tx, receipt };
        }
        catch (err) {
            setMessage('Transaction failed');
            throw err;
        }
        finally {
            setIsProcessing(false);
            setTimeout(() => setMessage(''), 3000);
        }
    }, []);
    return {
        // Encryption
        encrypt,
        isEncrypting,
        encryptError,
        // Decryption
        decrypt,
        publicDecrypt,
        isDecrypting,
        decryptError,
        // Transaction execution
        executeTransaction,
        isProcessing,
        message,
        // Combined states
        isBusy: isEncrypting || isDecrypting || isProcessing,
        hasError: !!(encryptError || decryptError),
    };
}
