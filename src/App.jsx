import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ARC_TESTNET } from './constants/contracts';
import '@rainbow-me/rainbowkit/styles.css';
import { NotificationProvider } from './components/NotificationProvider';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import LendBorrow from './components/LendBorrow';
import Faucet from './components/Faucet';
import Activity from './components/Activity';
import { Twitter, MessageSquare, Bell } from 'lucide-react';
import FeedbackModal from './components/FeedbackModal';
import ChangelogModal from './components/ChangelogModal';

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'Flow On Arc',
  projectId: 'd74f676fe32bb531fb9268bbd4e43a8f',
  chains: [ARC_TESTNET],
  ssr: false,
});

function App() {
  const isMaintenanceMode = false; // Set to false to disable maintenance mode

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  React.useEffect(() => {
    const handleNavigate = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (isMaintenanceMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center p-6 text-center">
        <div className="glass-card p-12 max-w-lg w-full border-[#5cb849]/30">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-[#5cb849]/10 rounded-full flex items-center justify-center border-2 border-[#5cb849]/20">
              <svg className="w-10 h-10 text-[#5cb849] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Under Maintenance
          </h1>
          
          <p className="text-xl text-gray-400 mb-8 leading-relaxed">
            We are pushing some major updates to enhance your experience. 
            We will be back soon!! keep an eye on our socials!
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden relative">
              <div className="h-full bg-[#5cb849] w-1/3 animate-progress-maintenance absolute left-0 top-0"></div>
            </div>
            <p className="text-xs text-[#5cb849] font-medium tracking-widest uppercase">
              System Upgrade in Progress
            </p>
          </div>
        </div>
        
        <style>{`
          @keyframes progress-maintenance {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
          .animate-progress-maintenance {
            animation: progress-maintenance 2s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <NotificationProvider>
            <div className="flex flex-col min-h-screen bg-black">
              <div className="flex flex-1">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="flex-1 ml-64 p-8">
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'swap' && <Swap />}
                  {activeTab === 'lend-borrow' && <LendBorrow />}
                  {activeTab === 'faucet' && <Faucet />}
                  {activeTab === 'activity' && <Activity />}
                </main>
              </div>
              
              {/* Footer */}
              <footer className="ml-64 py-4 px-8 border-t border-[#1a1a1a]">
                <p className="text-sm text-gray-400 text-center">Flow On ARC © 2025</p>
              </footer>
              
              {/* Fixed Floating Feedback Button - Top Right */}
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="fixed top-5 right-5 z-[1000] bg-[#5cb849] text-white px-5 py-3 rounded-full flex items-center gap-2 font-medium transition-all duration-200"
                style={{
                  boxShadow: '0 4px 12px rgba(92, 184, 73, 0.3), 0 0 20px rgba(92, 184, 73, 0.15)',
                  transform: 'scaleX(0.8)',
                  transformOrigin: 'right center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scaleX(0.8) translateY(-3px)';
                  e.currentTarget.style.backgroundColor = '#6bc956';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 201, 86, 0.4), 0 0 24px rgba(107, 201, 86, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scaleX(0.8) translateY(0)';
                  e.currentTarget.style.backgroundColor = '#5cb849';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(92, 184, 73, 0.3), 0 0 20px rgba(92, 184, 73, 0.15)';
                }}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Feedback</span>
              </button>
              
              {/* Fixed Floating Buttons Container (Bottom Right) */}
              <div className="fixed bottom-5 right-5 z-[1000] flex items-center gap-1">
                {/* What's New Button */}
                <button
                  onClick={() => setIsChangelogOpen(true)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-5 py-3 rounded-full flex items-center gap-2 font-medium transition-all duration-200"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    transform: 'scaleX(0.8)',
                    transformOrigin: 'right center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scaleX(0.8) translateY(-3px)';
                    e.currentTarget.style.backgroundColor = '#222222';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scaleX(0.8) translateY(0)';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }}
                >
                  <Bell className="w-4 h-4 text-[#5cb849]" />
                  <span>What's New</span>
                </button>

                {/* Fixed Floating CTA Button */}
                <a
                  href="https://twitter.com/heyeren_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#5cb849] text-white px-5 py-3 rounded-full flex items-center gap-2 font-medium transition-all duration-200"
                  style={{
                    boxShadow: '0 4px 12px rgba(92, 184, 73, 0.3), 0 0 20px rgba(92, 184, 73, 0.15)',
                    transform: 'scaleX(0.8)',
                    transformOrigin: 'right center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scaleX(0.8) translateY(-3px)';
                    e.currentTarget.style.backgroundColor = '#6bc956';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 201, 86, 0.4), 0 0 24px rgba(107, 201, 86, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scaleX(0.8) translateY(0)';
                    e.currentTarget.style.backgroundColor = '#5cb849';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(92, 184, 73, 0.3), 0 0 20px rgba(92, 184, 73, 0.15)';
                  }}
                >
                  <Twitter className="w-4 h-4" />
                  <span>Follow on X</span>
                </a>
              </div>
              
              {/* Feedback Modal */}
              <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
              />

              {/* Changelog Modal */}
              <ChangelogModal
                isOpen={isChangelogOpen}
                onClose={() => setIsChangelogOpen(false)}
              />
            </div>
          </NotificationProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

