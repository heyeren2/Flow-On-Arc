import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { Twitter, MessageSquare, Bell, Menu, Plus, X, Github } from 'lucide-react';
import FeedbackModal from './components/FeedbackModal';
import ChangelogModal from './components/ChangelogModal';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';

// Custom Brand Icons
const XIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DiscordIcon = ({ className }) => (
  <svg viewBox="0 0 127.14 96.36" className={className} fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6,0.48,80.21a105.73,105.73,0,0,0,32.28,16.15,77.7,77.7,0,0,0,7.37-12,67.65,67.65,0,0,0-11.78-5.56,54.8,54.8,0,0,1,10-5.17,109.81,109.81,0,0,0,44.74,0,54.8,54.8,0,0,1,10,5.17,67.46,67.46,0,0,0-11.78,5.56,77.29,77.29,0,0,0,7.38,12,105.27,105.27,0,0,0,32.35-16.15C129.58,52,124,28.33,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.12-12.67,11.41-12.67S54,46,53.86,53,48.74,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.12-12.67,11.44-12.67S96.2,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

const queryClient = new QueryClient();

// Get WalletConnect Project ID from environment variable
const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;
if (!WALLET_CONNECT_PROJECT_ID) {
  throw new Error('VITE_WALLET_CONNECT_PROJECT_ID environment variable is required');
}

const config = getDefaultConfig({
  appName: 'Flow On Arc',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [ARC_TESTNET],
  ssr: false,
});

// Main App Layout Component
function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lendBorrowInitialTab, setLendBorrowInitialTab] = useState('supply');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);

  React.useEffect(() => {
    const handleNavigate = (e) => {
      const tab = e.detail;
      const pathMap = {
        'dashboard': '/dashboard',
        'swap': '/swap',
        'lend-borrow': '/lend-borrow',
        'faucet': '/faucet',
        'activity': '/activity'
      };
      if (pathMap[tab]) {
        navigate(pathMap[tab]);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [navigate]);

  return (
    <NotificationProvider>
      <div className="flex flex-col min-h-screen bg-black">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1a1a1a] p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold gradient-text">Flow On Arc</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="flex flex-1 pt-16 lg:pt-0">
          <Sidebar
            isMobileOpen={isMobileMenuOpen}
            setIsMobileOpen={setIsMobileMenuOpen}
          />
          <main className="flex-1 lg:ml-64 p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
            <Routes>
              <Route path="/dashboard" element={<Dashboard setLendBorrowInitialTab={setLendBorrowInitialTab} setActiveTab={(tab) => {
                const pathMap = {
                  'dashboard': '/dashboard',
                  'swap': '/swap',
                  'lend-borrow': '/lend-borrow',
                  'faucet': '/faucet',
                  'activity': '/activity'
                };
                if (pathMap[tab]) navigate(pathMap[tab]);
              }} />} />
              <Route path="/swap" element={<Swap />} />
              <Route path="/lend-borrow" element={<LendBorrow initialTab={lendBorrowInitialTab} />} />
              <Route path="/faucet" element={<Faucet />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>

        {/* Footer - responsive */}
        <footer className="lg:ml-64 py-6 px-4 lg:px-8 border-t border-[#1a1a1a] bg-black/50 backdrop-blur-sm mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-4">
              <a href="https://twitter.com/heyeren_" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#22c55e] transition-colors duration-200">
                <XIcon className="w-4 h-4" />
              </a>
              <a href="https://discord.gg/buildonarc" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#22c55e] transition-colors duration-200">
                <DiscordIcon className="w-4 h-4" />
              </a>
              <a href="https://github.com/lee785/Flow-On-Arc" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#22c55e] transition-colors duration-200">
                <Github className="w-4 h-4" />
              </a>
            </div>
            <div className="hidden sm:block h-3 w-[1px] bg-gray-800 mx-1"></div>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              Flow On Arc © 2025
            </p>
          </div>
        </footer>

        {/* Mobile Action Menu Overlay */}
        {isMobileActionMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] transition-opacity"
            onClick={() => setIsMobileActionMenuOpen(false)}
          />
        )}

        {/* Mobile Floating Action Menu */}
        <div className="lg:hidden fixed bottom-5 right-5 z-[1000]">
          {/* Expanded Menu */}
          {isMobileActionMenuOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2 mobile-action-menu">
              {/* Feedback Button - Icon Only */}
              <button
                onClick={() => {
                  setIsFeedbackOpen(true);
                  setIsMobileActionMenuOpen(false);
                }}
                className="w-12 h-12 rounded-full bg-[#5cb849] text-white flex items-center justify-center shadow-lg shadow-[#5cb849]/30 min-h-[48px] min-w-[48px] hover:bg-[#6bc956] transition-colors"
                aria-label="Feedback"
                title="Feedback"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* What's New Button - Icon Only */}
              <button
                onClick={() => {
                  setIsChangelogOpen(true);
                  setIsMobileActionMenuOpen(false);
                }}
                className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-white flex items-center justify-center shadow-lg min-h-[48px] min-w-[48px] hover:bg-[#222222] transition-colors"
                aria-label="What's New"
                title="What's New"
              >
                <Bell className="w-5 h-5 text-[#5cb849]" />
              </button>

              {/* Follow Button - Icon Only */}
              <a
                href="https://twitter.com/heyeren_"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileActionMenuOpen(false)}
                className="w-12 h-12 rounded-full bg-[#5cb849] text-white flex items-center justify-center shadow-lg shadow-[#5cb849]/30 min-h-[48px] min-w-[48px] hover:bg-[#6bc956] transition-colors"
                aria-label="Follow on X"
                title="Follow on X"
              >
                <XIcon className="w-5 h-5" />
              </a>
            </div>
          )}

          {/* Main FAB Button */}
          <button
            onClick={() => setIsMobileActionMenuOpen(!isMobileActionMenuOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg min-h-[56px] min-w-[56px] ${isMobileActionMenuOpen
              ? 'bg-[#ef4444] hover:bg-[#dc2626] rotate-45'
              : 'bg-[#5cb849] hover:bg-[#6bc956] shadow-[#5cb849]/30'
              }`}
            aria-label="Toggle action menu"
          >
            {isMobileActionMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Plus className="w-6 h-6 text-white" />
            )}
          </button>
        </div>


        {/* Desktop Floating Action Buttons (Vertical Stack) */}
        <div className="hidden lg:flex fixed bottom-6 right-6 z-[1000] flex-col items-center gap-3">
          {/* Feedback Button */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="w-10 h-10 rounded-full bg-[#5cb849] text-white flex items-center justify-center shadow-lg shadow-[#5cb849]/20 hover:bg-[#6bc956] hover:scale-110 transition-all duration-200 group relative"
            title="Feedback"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* What's New Button */}
          <button
            onClick={() => setIsChangelogOpen(true)}
            className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-white flex items-center justify-center shadow-lg hover:bg-[#222222] hover:scale-110 transition-all duration-200 group relative"
            title="What's New"
          >
            <Bell className="w-5 h-5 text-[#5cb849]" />
          </button>

          {/* Follow on X Button */}
          <a
            href="https://twitter.com/flowOnArc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-[#5cb849] text-white flex items-center justify-center shadow-lg shadow-[#5cb849]/20 hover:bg-[#6bc956] hover:scale-110 transition-all duration-200 group relative"
            title="Follow on X"
          >
            <XIcon className="w-5 h-5" />
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
  );
}

function App() {
  const isMaintenanceMode = false; // Set to false to disable maintenance mode

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
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <PageTransitionWrapper />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

function PageTransitionWrapper() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleStartTransition = (e) => {
      const { path } = e.detail;
      setIsTransitioning(true);
      setTimeout(() => {
        navigate(path);
        setIsTransitioning(false);
      }, 1500); // Animation duration
    };

    window.addEventListener('start-page-transition', handleStartTransition);
    return () => window.removeEventListener('start-page-transition', handleStartTransition);
  }, [navigate]);

  return (
    <>
      <PageTransition isVisible={isTransitioning} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </>
  );
}

export default App;

