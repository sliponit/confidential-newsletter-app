'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { requestUserDecryption, createEncryptedInput } from '../lib/fhevm';


// Contract configuration
const CONTRACT_ADDRESSES = {
  31337: '0x40e8Aa088739445BC3a3727A724F56508899f65B', // Local Hardhat
  11155111: '0x510799909bDD4d1936e68e3b4c6ea716e112536b', // Sepolia - Updated for 0.9.1
}

const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_subscriptionPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_subscriptionDuration",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ContentKeyAlreadySet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ContentKeyNotSet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "provided",
        "type": "uint256"
      }
    ],
    "name": "InsufficientPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPrice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoFundsToWithdraw",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoValidSubscription",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "setter",
        "type": "address"
      }
    ],
    "name": "ContentKeySet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FundsWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      }
    ],
    "name": "KeyAccessGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionParamsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expirationTimestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pricePaid",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newExpirationTimestamp",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionRenewed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contentKeySet",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "expirationTimestamps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContentKey",
    "outputs": [
      {
        "internalType": "euint256",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_subscriber",
        "type": "address"
      }
    ],
    "name": "getSubscriptionDetails",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "expirationTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isValid",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_subscriber",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_duration",
        "type": "uint256"
      }
    ],
    "name": "grantSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint256",
        "name": "_encryptedKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "_inputProof",
        "type": "bytes"
      }
    ],
    "name": "setContentKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "subscribe",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "subscriptionDuration",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "subscriptionPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalRevenue",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_newPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_newDuration",
        "type": "uint256"
      }
    ],
    "name": "updateSubscriptionParams",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

interface ConfidentialNewsletterProps {
  account: string;
  chainId: number;
  isConnected: boolean;
  isInitialized: boolean;
  onMessage: (message: string) => void;
}

export default function ConfidentialNewsletter({ account, chainId, isConnected, isInitialized, onMessage }: ConfidentialNewsletterProps) {
  const [contentKeyHandle, setContentKeyHandle] = useState<string>('');
  const [decryptedContentKey, setDecryptedContentKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [encryptError, setEncryptError] = useState('');

  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || 'Not supported chain';

  // Get encrypted count from contract
  const getContentKey = async () => {
    if (!isConnected || !contractAddress || !window.ethereum || contractAddress === 'Not supported chain') return;

    try {
      onMessage('Reading contract...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // First check subscription status or if user is owner
      const [owner, [, isValid]] = await Promise.all([
        contract.owner(),
        contract.getSubscriptionDetails(account)
      ]);
      const isOwner = owner.toLowerCase() === account.toLowerCase();
      if (!isValid && !isOwner) {
        onMessage('No valid subscription. Please subscribe first.');
        return;
      }

      const result = await contract.getContentKey();
      setContentKeyHandle(result);
      onMessage('Contract read successfully!');
      setTimeout(() => onMessage(''), 3000);
    } catch (error: any) {
      console.error('Get content key failed:', error);
      if (error?.reason?.includes('NoValidSubscription') || error?.message?.includes('NoValidSubscription')) {
        onMessage('Error. No valid subscription. Please subscribe first.');
      } else {
        onMessage('Failed to get content key');
      }
    }
  };

  // Decrypt count using fhevmInstance directly
  const handleDecrypt = async () => {
    if (!contentKeyHandle || !window.ethereum || !contractAddress || contractAddress === 'Not supported chain') return;
    
    try {
      setIsDecrypting(true);
      setDecryptError('');
      onMessage('Decrypting with EIP-712 user decryption...');
      
      // Get signer for EIP-712 signature
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Use decryptValue from fhevmInstance
      const decryptedKey = await requestUserDecryption(contractAddress, signer, contentKeyHandle);
      const keyHex = "0x" + decryptedKey.toString(16).padStart(64, "0");
      setDecryptedContentKey(keyHex);
      onMessage('EIP-712 decryption completed!');
      setTimeout(() => onMessage(''), 3000);
    } catch (error: any) {
      console.error('Decryption failed:', error);
      setDecryptError(error?.message || 'Decryption failed');
      onMessage(decryptError || 'Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Increment counter using the adapter hooks
  const incrementCounter = async () => {
    if (!isConnected || !contractAddress || !window.ethereum) return;
    
    try {
      setIsProcessing(true);
      onMessage('Starting increment transaction...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      
      onMessage('Encrypting input...');
      setIsEncrypting(true);
      setEncryptError('');
      try {
        // Use createEncryptedInput from fhevmInstance
        const encryptedResult = await createEncryptedInput(contractAddress, account, 1);
        
        // Handle the encrypted data structure properly
        let encryptedData: any, proof: any;
        if (encryptedResult && typeof encryptedResult === 'object') {
          if ((encryptedResult as any).handles && Array.isArray((encryptedResult as any).handles) && (encryptedResult as any).handles.length > 0) {
            encryptedData = (encryptedResult as any).handles[0];
            proof = (encryptedResult as any).inputProof;
          } else if ((encryptedResult as any).encryptedData && (encryptedResult as any).proof) {
            encryptedData = (encryptedResult as any).encryptedData;
            proof = (encryptedResult as any).proof;
          } else {
            encryptedData = encryptedResult;
            proof = encryptedResult;
          }
        } else {
          encryptedData = encryptedResult;
          proof = encryptedResult;
        }
        
        // Convert Uint8Array to hex string if needed
        if (encryptedData instanceof Uint8Array) {
          encryptedData = ethers.hexlify(encryptedData);
        }
        if (proof instanceof Uint8Array) {
          proof = ethers.hexlify(proof);
        }
        
        onMessage('Sending transaction...');
        const tx = await contract.increment(encryptedData, proof);
      
        onMessage('Waiting for confirmation...');
        const receipt = await tx.wait();
        
        onMessage('Increment completed!');
        console.log('✅ Increment transaction completed:', receipt);
        
        setTimeout(() => onMessage(''), 3000);
      } catch (error: any) {
        setEncryptError(error?.message || 'Encryption failed');
        throw error;
      } finally {
        setIsEncrypting(false);
      }
    } catch (error) {
      console.error('Increment failed:', error);
      onMessage(encryptError || 'Increment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Decrement counter using the adapter hooks
  const decrementCounter = async () => {
    if (!isConnected || !contractAddress || !window.ethereum) return;
    
    try {
      setIsProcessing(true);
      onMessage('Starting decrement transaction...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      
      onMessage('Encrypting input...');
      setIsEncrypting(true);
      setEncryptError('');
      try {
        // Use createEncryptedInput from fhevmInstance
        const encryptedResult = await createEncryptedInput(contractAddress, account, 1);
        
        // Handle the encrypted data structure properly
        let encryptedData: any, proof: any;
        if (encryptedResult && typeof encryptedResult === 'object') {
          if ((encryptedResult as any).handles && Array.isArray((encryptedResult as any).handles) && (encryptedResult as any).handles.length > 0) {
            encryptedData = (encryptedResult as any).handles[0];
            proof = (encryptedResult as any).inputProof;
          } else if ((encryptedResult as any).encryptedData && (encryptedResult as any).proof) {
            encryptedData = (encryptedResult as any).encryptedData;
            proof = (encryptedResult as any).proof;
          } else {
            encryptedData = encryptedResult;
            proof = encryptedResult;
          }
        } else {
          encryptedData = encryptedResult;
          proof = encryptedResult;
        }
        
        // Convert Uint8Array to hex string if needed
        if (encryptedData instanceof Uint8Array) {
          encryptedData = ethers.hexlify(encryptedData);
        }
        if (proof instanceof Uint8Array) {
          proof = ethers.hexlify(proof);
        }
        
        onMessage('Sending transaction...');
        const tx = await contract.decrement(encryptedData, proof);
      
        onMessage('Waiting for confirmation...');
        const receipt = await tx.wait();
        
        onMessage('Decrement completed!');
        console.log('✅ Decrement transaction completed:', receipt);
        
        setTimeout(() => onMessage(''), 3000);
      } catch (error: any) {
        setEncryptError(error?.message || 'Encryption failed');
        throw error;
      } finally {
        setIsEncrypting(false);
      }
    } catch (error) {
      console.error('Decrement failed:', error);
      onMessage(encryptError || 'Decrement failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected || !isInitialized) {
    return null;
  }

  return (
    <div className="glass-card p-8 hover:border-[#FFEB3B] transition-all duration-300">
      <div className="flex items-center gap-3 mb-8">
        <svg className="w-6 h-6 text-[#FFEB3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div>
          <h2 className="text-2xl font-bold text-white">Confidential Newsletter</h2>
          <p className="text-gray-400 text-sm">Using REAL FHEVM SDK on Sepolia testnet</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <button onClick={getContentKey} className="btn-primary w-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Get Content Key
          </button>
          {contentKeyHandle && (
            <div className="mt-4 info-card border-[#FFEB3B]/30">
              <span className="text-gray-400 text-xs font-medium block mb-2">Encrypted Handle</span>
              <span className="code-text text-[#FFEB3B] text-xs">{contentKeyHandle}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-[#2A2A2A]"></div>

        <div>
          <button
            onClick={handleDecrypt}
            disabled={!contentKeyHandle || isDecrypting}
            className="btn-secondary w-full"
            title={decryptError || undefined}
          >
            {isDecrypting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            {isDecrypting ? 'Decrypting...' : 'Decrypt Count'}
          </button>
          {decryptedContentKey !== null && (
            <div className="mt-4 info-card border-green-500/30 bg-green-500/5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-medium">Decrypted Content Key</span>
                <span className="code-text text-[#FFEB3B] text-xs">{decryptedContentKey}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-[#2A2A2A]"></div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={incrementCounter}
            disabled={isProcessing || isEncrypting}
            className="btn-primary"
            title={encryptError || undefined}
          >
            {isProcessing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            )}
            {(isProcessing || isEncrypting) ? 'Processing...' : 'Increment'}
          </button>
          <button
            onClick={decrementCounter}
            disabled={isProcessing || isEncrypting}
            className="btn-danger"
            title={encryptError || undefined}
          >
            {isProcessing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/>
              </svg>
            )}
            {(isProcessing || isEncrypting) ? 'Processing...' : 'Decrement'}
          </button>
        </div>
      </div>
    </div>
  );
}

