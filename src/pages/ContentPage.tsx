import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import { requestUserDecryption } from '../lib/fhevm';
import { decryptContent } from '../lib/crypto';
import { CONTRACT_ADDRESSES, CONTRACT_ABI } from '../lib/contract';

interface ContentPageProps {
  account: string;
  chainId: number;
  isConnected: boolean;
  isInitialized: boolean;
  onMessage: (message: string) => void;
  onConnect: () => Promise<void>;
}

interface ContentData {
  iv: string;
  encryptedContent: string;
  title: string;
  subtitle: string;
  date: string;
}

interface AccessStatus {
  isOwner: boolean;
  isSubscriber: boolean;
  subscriptionExpiry: number;
}

export default function ContentPage({
  account,
  chainId,
  isConnected,
  isInitialized,
  onMessage,
  onConnect,
}: ContentPageProps) {
  const { cid } = useParams<{ cid: string }>();

  // Content from IPFS
  const [contentData, setContentData] = useState<ContentData | null>(null);

  // Loading states
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Authorization state
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);

  // Decrypted content
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  // Error state
  const [error, setError] = useState<string>('');

  // Contract info
  const [subscriptionPrice, setSubscriptionPrice] = useState<bigint | null>(null);

  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || '';

  // Decrypt function
  const handleDecrypt = useCallback(async () => {
    if (!contentData || !window.ethereum || !contractAddress) return;

    try {
      setIsDecrypting(true);
      setError('');
      onMessage('Getting content key from contract...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Get encrypted content key handle
      const contentKeyHandle = await contract.getContentKey();

      onMessage('Decrypting content key with EIP-712...');

      // Decrypt the content key using FHE
      const decryptedKeyBigInt = await requestUserDecryption(
        contractAddress,
        signer,
        contentKeyHandle
      );

      // Convert to hex (same pattern as ConfidentialNewsletter.tsx)
      const keyHex = '0x' + decryptedKeyBigInt.toString(16).padStart(64, '0');

      onMessage('Decrypting content...');

      // Decrypt the actual content using AES-256-GCM
      const plaintext = await decryptContent(
        contentData.encryptedContent,
        contentData.iv,
        keyHex
      );

      setDecryptedContent(plaintext);
      onMessage('Content decrypted!');
      setTimeout(() => onMessage(''), 3000);
    } catch (err: any) {
      console.error('Failed to decrypt:', err);
      setError(err?.message || 'Failed to decrypt content');
      onMessage('Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  }, [contentData, contractAddress, onMessage]);

  // Fetch content from IPFS
  useEffect(() => {
    const fetchContent = async () => {
      if (!cid) {
        setError('No content ID provided');
        setIsLoadingContent(false);
        return;
      }

      try {
        setIsLoadingContent(true);
        setError('');

        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }

        const data = await response.json();

        // Validate structure
        if (!data.iv || !data.encryptedContent || !data.title) {
          throw new Error('Invalid content format');
        }

        setContentData(data);
      } catch (err: any) {
        console.error('Failed to fetch content:', err);
        setError(err?.message || 'Failed to load content');
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [cid]);

  // Check access when wallet connected
  useEffect(() => {
    const checkAccess = async () => {
      if (!isConnected || !isInitialized || !window.ethereum || !contentData) {
        setAccessStatus(null);
        return;
      }

      if (!contractAddress) {
        setAccessStatus(null);
        return;
      }

      try {
        setIsCheckingAccess(true);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

        // Fetch in parallel: owner, subscription details, price
        const [owner, subscriptionDetails, price] = await Promise.all([
          contract.owner(),
          contract.getSubscriptionDetails(account),
          contract.subscriptionPrice(),
        ]);

        const isOwner = owner.toLowerCase() === account.toLowerCase();
        const [expirationTimestamp, isValid] = subscriptionDetails;

        setAccessStatus({
          isOwner,
          isSubscriber: isValid,
          subscriptionExpiry: Number(expirationTimestamp),
        });

        setSubscriptionPrice(price);

        // Auto-decrypt if authorized
        if (isOwner || isValid) {
          await handleDecrypt();
        }
      } catch (err: any) {
        console.error('Failed to check access:', err);
        setError('Failed to verify subscription status');
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [account, chainId, isConnected, isInitialized, contentData, contractAddress, handleDecrypt]);

  // Subscribe function
  const handleSubscribe = async () => {
    if (!isConnected || !window.ethereum || !subscriptionPrice) return;

    if (!contractAddress) return;

    try {
      setIsSubscribing(true);
      setError('');
      onMessage('Processing subscription...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Send subscription transaction
      const tx = await contract.subscribe({ value: subscriptionPrice });

      onMessage('Waiting for confirmation...');
      await tx.wait();

      onMessage('Subscription successful! Decrypting content...');

      // Update access status
      setAccessStatus(prev => prev ? {
        ...prev,
        isSubscriber: true,
      } : null);

      // Auto-decrypt after subscription
      await handleDecrypt();
    } catch (err: any) {
      console.error('Subscription failed:', err);
      setError(err?.message || 'Subscription failed');
      onMessage('Subscription failed');
    } finally {
      setIsSubscribing(false);
    }
  };

  const hasAccess = accessStatus?.isOwner || accessStatus?.isSubscriber;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Loading Content State */}
      {isLoadingContent && (
        <div className="glass-card p-8 text-center">
          <svg className="w-8 h-8 animate-spin mx-auto text-[#FFEB3B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-gray-400 mt-4">Loading content...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoadingContent && (
        <div className="info-card border-red-500/30 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Content Loaded */}
      {contentData && !isLoadingContent && (
        <article className="glass-card p-8">
          {/* Header - Always visible */}
          <header className="mb-8 border-b border-[#3A3A3A] pb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {contentData.title}
            </h1>
            <p className="text-xl text-gray-400 mb-4">
              {contentData.subtitle}
            </p>
            <time className="text-sm text-gray-500">
              {new Date(contentData.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </header>

          {/* Content Body */}
          <div className="prose prose-invert max-w-none">
            {/* Not connected - prompt to connect */}
            {!isConnected && (
              <div className="info-card text-center py-8">
                <svg className="w-12 h-12 text-[#3A3A3A] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <p className="text-gray-400 mb-4">
                  Connect your wallet to access this content
                </p>
                <button onClick={onConnect} className="btn-primary w-full">
                  Connect Wallet
                </button>
              </div>
            )}

            {/* Connected but checking access */}
            {isConnected && isCheckingAccess && (
              <div className="info-card text-center py-8">
                <svg className="w-8 h-8 animate-spin mx-auto text-[#FFEB3B]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <p className="text-gray-400 mt-4">Checking subscription...</p>
              </div>
            )}

            {/* Connected and decrypting */}
            {isConnected && !isCheckingAccess && isDecrypting && (
              <div className="info-card text-center py-8">
                <svg className="w-8 h-8 animate-spin mx-auto text-[#FFEB3B]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <p className="text-gray-400 mt-4">Decrypting content...</p>
              </div>
            )}

            {/* Decrypted content - show full article */}
            {decryptedContent && (
              <>
                {accessStatus?.isSubscriber && accessStatus.subscriptionExpiry > 0 && (
                  <div className="info-card mb-6 text-sm text-gray-400">
                    Subscription expires: {new Date(accessStatus.subscriptionExpiry * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <div className="markdown-content prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown>{decryptedContent}</ReactMarkdown>
                </div>
              </>
            )}

            {/* Not authorized - show subscription prompt */}
            {isConnected && accessStatus && !hasAccess && !isDecrypting && !isCheckingAccess && (
              <div className="info-card border-[#FFEB3B]/30 py-8">
                <div className="text-center">
                  <svg className="w-12 h-12 text-[#FFEB3B] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Subscribe to Access
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Get full access to this newsletter
                  </p>

                  {subscriptionPrice && (
                    <p className="text-[#FFEB3B] font-bold text-lg mb-4">
                      {ethers.formatEther(subscriptionPrice)} ETH / month
                    </p>
                  )}

                  <button
                    onClick={handleSubscribe}
                    disabled={isSubscribing || !subscriptionPrice}
                    className="btn-primary w-full"
                  >
                    {isSubscribing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </main>
  );
}
