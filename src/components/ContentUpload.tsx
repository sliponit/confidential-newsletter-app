'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { requestUserDecryption } from '../lib/fhevm';
import { encryptContent } from '../lib/crypto';
import { uploadToPinata } from '../lib/pinata';

// Contract configuration (same as ConfidentialNewsletter)
const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: '0x40e8Aa088739445BC3a3727A724F56508899f65B', // Local Hardhat
  11155111: '0x510799909bDD4d1936e68e3b4c6ea716e112536b', // Sepolia
};

const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContentKey',
    outputs: [{ internalType: 'euint256', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
];

interface ContentUploadProps {
  account: string;
  chainId: number;
  isConnected: boolean;
  isInitialized: boolean;
  onMessage: (message: string) => void;
}

export default function ContentUpload({
  account,
  chainId,
  isConnected,
  isInitialized,
  onMessage,
}: ContentUploadProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ cid: string; link: string } | null>(null);
  const [error, setError] = useState('');

  const contractAddress = CONTRACT_ADDRESSES[chainId] || '';
  const pinataJwt = process.env.REACT_APP_PINATA_JWT || '';

  // Check if connected user is owner
  useEffect(() => {
    const checkOwner = async () => {
      if (!isConnected || !isInitialized || !contractAddress || !window.ethereum) {
        setIsOwner(false);
        setIsCheckingOwner(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
        const owner = await contract.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error('Failed to check owner:', err);
        setIsOwner(false);
      } finally {
        setIsCheckingOwner(false);
      }
    };

    setIsCheckingOwner(true);
    checkOwner();
  }, [account, chainId, isConnected, isInitialized, contractAddress]);

  // Decrypt the content key
  const handleDecryptKey = async () => {
    if (!window.ethereum || !contractAddress) return;

    try {
      setIsDecrypting(true);
      setError('');
      onMessage('Getting content key from contract...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Get the encrypted content key handle
      const contentKeyHandle = await contract.getContentKey();

      onMessage('Decrypting content key with EIP-712...');

      // Decrypt the content key
      const decryptedValue = await requestUserDecryption(contractAddress, signer, contentKeyHandle);
      const keyHex = '0x' + decryptedValue.toString(16).padStart(64, '0');
      setDecryptedKey(keyHex);

      onMessage('Content key decrypted!');
      setTimeout(() => onMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to decrypt key:', err);
      setError(err?.message || 'Failed to decrypt content key');
      onMessage('Failed to decrypt content key');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!decryptedKey) {
      setError('Please decrypt the content key first');
      return;
    }

    if (!title.trim() || !subtitle.trim() || !content.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!pinataJwt) {
      setError('Pinata JWT not configured. Set REACT_APP_PINATA_JWT in .env.local');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      setUploadResult(null);
      onMessage('Encrypting content...');

      // Encrypt the markdown content
      const { iv, encryptedContent } = await encryptContent(content, decryptedKey);

      onMessage('Uploading to IPFS via Pinata...');

      // Upload to Pinata
      const result = await uploadToPinata(
        {
          iv,
          encryptedContent,
          title: title.trim(),
          subtitle: subtitle.trim(),
          date: new Date().toISOString(),
        },
        pinataJwt
      );

      const link = `http://localhost:3000/content/${result.cid}`;
      setUploadResult({ cid: result.cid, link });
      onMessage('Upload successful!');
      setTimeout(() => onMessage(''), 3000);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Upload failed');
      onMessage('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Don't render if not connected, not initialized, or still checking
  if (!isConnected || !isInitialized || isCheckingOwner) {
    return null;
  }

  // Don't render if not owner
  if (!isOwner) {
    return null;
  }

  return (
    <div className="glass-card p-8 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-[#FFEB3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h2 className="text-2xl font-bold text-white">Upload Content (Owner Only)</h2>
      </div>

      {/* Decrypt Key Section */}
      <div className="mb-6">
        <div className="info-card mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm font-medium">Content Key</span>
            {decryptedKey ? (
              <span className="text-green-400 font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Decrypted
              </span>
            ) : (
              <button
                onClick={handleDecryptKey}
                disabled={isDecrypting}
                className="btn-primary text-xs px-3 py-1"
              >
                {isDecrypting ? (
                  <>
                    <svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Decrypting...
                  </>
                ) : (
                  'Decrypt Key'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter newsletter title"
            className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFEB3B] transition-colors"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Enter newsletter subtitle"
            className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFEB3B] transition-colors"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">Content (Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your markdown content here..."
            rows={10}
            className="w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFEB3B] transition-colors font-mono text-sm resize-y"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="info-card border-red-500/30 bg-red-500/5 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={isUploading || !decryptedKey}
        className="btn-primary w-full justify-center"
      >
        {isUploading ? (
          <>
            <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload to IPFS
          </>
        )}
      </button>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-6 info-card border-green-500/30 bg-green-500/5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-400 font-semibold">Upload Successful!</span>
            </div>

            <div>
              <span className="text-gray-400 text-sm font-medium block mb-1">CID:</span>
              <span className="code-text text-[#FFEB3B] text-xs break-all">{uploadResult.cid}</span>
            </div>

            <div>
              <span className="text-gray-400 text-sm font-medium block mb-1">Link for paragraph.com:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={uploadResult.link}
                  className="flex-1 bg-[#0A0A0A] border border-[#3A3A3A] rounded px-3 py-2 text-[#FFEB3B] text-xs font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(uploadResult.link);
                    onMessage('Link copied to clipboard!');
                    setTimeout(() => onMessage(''), 2000);
                  }}
                  className="btn-primary text-xs px-3 py-2"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
