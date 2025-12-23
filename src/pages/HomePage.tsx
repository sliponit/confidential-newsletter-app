import ConfidentialNewsletter from '../components/ConfidentialNewsletter';
import ContentUpload from '../components/ContentUpload';

interface HomePageProps {
  account: string;
  chainId: number;
  isConnected: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  message: string;
  networkError: string;
  isSwitchingNetwork: boolean;
  contractAddress: string;
  onMessage: (message: string) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onSwitchNetwork: () => Promise<void>;
}

export default function HomePage({
  account,
  chainId,
  isConnected,
  isInitialized,
  isLoading,
  message,
  networkError,
  isSwitchingNetwork,
  contractAddress,
  onMessage,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}: HomePageProps) {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {message && (
        <div className="mb-8 glass-card p-4 border-l-4 border-[#FFEB3B] animate-pulse">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#FFEB3B]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
            </svg>
            <p className="text-white font-medium">{message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="glass-card p-8 hover:border-[#FFEB3B] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-[#FFEB3B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <h2 className="text-2xl font-bold text-white">Wallet Connection</h2>
            </div>
            {!isConnected ? (
              <button onClick={onConnect} className="btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Connect
              </button>
            ) : (
              <button onClick={onDisconnect} className="btn-danger">
                Disconnect
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-[#3A3A3A] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <p className="text-gray-400 mb-4">Connect your wallet to use FHEVM features</p>

              <div className="mt-4 p-3 bg-[#0A0A0A] border border-[#FFEB3B]/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#FFEB3B]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-[#FFEB3B] font-semibold text-xs">Network Notice</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  <strong className="text-[#FFEB3B]">Important:</strong> This app requires the Sepolia testnet.
                  After connecting your wallet, you'll be prompted to switch to Sepolia if you're on a different network.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>React compatible FHEVM</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>No webpack bundling issues</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Real contract interactions</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Framework-agnostic core</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Works in React, Next.js, Vue</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Clean, simple API</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#0A0A0A] border border-[#FFEB3B]/30 rounded-lg">
                <p className="text-gray-400 text-xs leading-relaxed">
                  <strong className="text-[#FFEB3B]">Note:</strong> This is a demonstration using REAL FHEVM SDK from Zama's CDN.
                  The SDK provides actual encryption/decryption functionality on Sepolia testnet.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="info-card">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm font-medium">Status</span>
                  <span className="text-green-400 font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Connected
                  </span>
                </div>
              </div>
              <div className="info-card">
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 text-sm font-medium">Address</span>
                  <span className="code-text text-[#FFEB3B]">{account}</span>
                </div>
              </div>
              <div className="info-card">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm font-medium">Chain ID</span>
                  <span className="text-white font-mono font-bold">{chainId}</span>
                </div>
              </div>
              <div className="info-card">
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 text-sm font-medium">Contract</span>
                  {contractAddress === 'Not supported chain' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 text-sm">Not supported chain</span>
                      <button
                        onClick={onSwitchNetwork}
                        disabled={isSwitchingNetwork}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        {isSwitchingNetwork ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                        )}
                        {isSwitchingNetwork ? 'Switching...' : 'Switch to Sepolia'}
                      </button>
                    </div>
                  ) : (
                    <span className="code-text text-[#FFEB3B]">{contractAddress}</span>
                  )}
                </div>
              </div>

              {networkError && (
                <div className="info-card border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-red-400 text-sm">{networkError}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ConfidentialNewsletter
          account={account}
          chainId={chainId}
          isConnected={isConnected}
          isInitialized={isInitialized}
          onMessage={onMessage}
        />
      </div>

      {isConnected && isInitialized && (
        <ContentUpload
          account={account}
          chainId={chainId}
          isConnected={isConnected}
          isInitialized={isInitialized}
          onMessage={onMessage}
        />
      )}
    </main>
  );
}
