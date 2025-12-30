import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { ARC_TESTNET } from './constants/contracts';
import '@rainbow-me/rainbowkit/styles.css';
import { NotificationProvider } from './components/NotificationProvider';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Swap from './components/Swap';
import LendBorrow from './components/LendBorrow';
import Faucet from './components/Faucet';
import Activity from './components/Activity';
import { Twitter, MessageSquare } from 'lucide-react';
import FeedbackModal from './components/FeedbackModal';

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'Flow On Arc',
  projectId: 'd74f676fe32bb531fb9268bbd4e43a8f',
  chains: [ARC_TESTNET],
  ssr: false,
});

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  React.useEffect(() => {
    const handleNavigate = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

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
                <span>Feedbacks</span>
              </button>
              
              {/* Fixed Floating CTA Button */}
              <a
                href="https://twitter.com/heyeren_"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-5 right-5 z-[1000] bg-[#5cb849] text-white px-5 py-3 rounded-full flex items-center gap-2 font-medium transition-all duration-200"
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
                <span>Follow Up On X</span>
              </a>
              
              {/* Feedback Modal */}
              <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
              />
              <Analytics />
            </div>
          </NotificationProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

