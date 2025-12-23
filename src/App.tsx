import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { initializeFheInstance } from './lib/fhevm';
import HomePage from './pages/HomePage';
import ContentPage from './pages/ContentPage';
import './App.css';
import { CONTRACT_ADDRESSES } from './lib/contract';


// Sepolia network configuration
const SEPOLIA_CONFIG = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isConnected?: () => boolean;
    };
  }
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || 'Not supported chain';

  // Network switching state
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [networkError, setNetworkError] = useState<string>('');




  // Initialize FHEVM
  const initializeFhevm = async () => {
    setIsLoading(true);
    try {
      await initializeFheInstance();
      setIsInitialized(true);
      console.log('✅ FHEVM initialized for React!');
    } catch (error) {
      setIsInitialized(false);
      console.error('FHEVM initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch network to Sepolia
  const switchNetworkToSepolia = async () => {
    if (!window.ethereum) {
      setNetworkError('No Ethereum provider found');
      return;
    }

    try {
      setIsSwitchingNetwork(true);
      setNetworkError('');
      setMessage('Switching to Sepolia network...');

      // Try to switch to Sepolia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CONFIG.chainId }],
      });

      // Update chain ID after successful switch
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(chainIdHex, 16));
      setMessage('Successfully switched to Sepolia!');
      
      console.log('✅ Network switched to Sepolia');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Network switch failed:', error);
      
      // If the chain doesn't exist, try to add it
      if (error.code === 4902) {
        try {
          setMessage('Adding Sepolia network...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_CONFIG],
          });
          
          // Update chain ID after adding
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(chainIdHex, 16));
          setMessage('Sepolia network added and switched!');
          
          console.log('✅ Sepolia network added and switched');
          setTimeout(() => setMessage(''), 3000);
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          setNetworkError('Failed to add Sepolia network. Please add it manually in your wallet.');
          setMessage('Failed to add Sepolia network');
        }
      } else {
        setNetworkError(`Failed to switch network: ${error.message || 'Unknown error'}`);
        setMessage('Failed to switch network');
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Wallet connection
  const connectWallet = async () => {
    console.log('🔗 Attempting to connect wallet...');
    
    if (typeof window === 'undefined') {
      console.error('❌ Window is undefined - not in browser environment');
      return;
    }
    
    if (!window.ethereum) {
      console.error('❌ No Ethereum provider found. Please install MetaMask or connect a wallet.');
      alert('Please install MetaMask or connect a wallet to use this app.');
      return;
    }
    
    try {
      console.log('📱 Requesting accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('✅ Accounts received:', accounts);
      
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🔗 Chain ID:', chainIdHex);
      
      setAccount(accounts[0]);
      setChainId(parseInt(chainIdHex, 16));
      setIsConnected(true);
      
      console.log('✅ Wallet connected successfully!');
      
      // Initialize FHEVM after wallet connection
      await initializeFhevm();
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      alert(`Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Enhanced FHEVM Header */}
      <header className="bg-gradient-to-r from-[#FFEB3B] to-[#FDD835] border-b-4 border-black shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#FFEB3B]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-black text-3xl font-bold tracking-tight">Confidential Newsletter</h1>
                <p className="text-black/70 text-sm font-medium mt-1">Encypted content with an AES key for which ACL is handled with FHEVM</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isInitialized ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="status-badge bg-green-600 text-white">READY</span>
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#FFEB3B] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                  <span className="status-badge bg-black text-[#FFEB3B]">LOADING</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                  <span className="status-badge bg-gray-500 text-white">IDLE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Routes */}
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              account={account}
              chainId={chainId}
              isConnected={isConnected}
              isInitialized={isInitialized}
              isLoading={isLoading}
              message={message}
              networkError={networkError}
              isSwitchingNetwork={isSwitchingNetwork}
              contractAddress={contractAddress}
              onMessage={setMessage}
              onConnect={connectWallet}
              onDisconnect={() => {
                setAccount('');
                setChainId(0);
                setIsConnected(false);
                setIsInitialized(false);
                setIsLoading(false);
                setMessage('');
                setNetworkError('');
                setIsSwitchingNetwork(false);
              }}
              onSwitchNetwork={switchNetworkToSepolia}
            />
          }
        />
        <Route
          path="/content/:cid"
          element={
            <ContentPage
              account={account}
              chainId={chainId}
              isConnected={isConnected}
              isInitialized={isInitialized}
              onMessage={setMessage}
              onConnect={connectWallet}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
