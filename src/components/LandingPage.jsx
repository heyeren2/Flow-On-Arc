import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, BarChart3, Droplet, Wallet, Rocket, Github, ChevronDown } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import FlowLogo from './FlowLogo';
import { useEthersProvider } from '../hooks/useEthers';
import { getProtocolStats } from '../services/statsService';
import { formatCompactUSD } from '../utils/formatters';

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

const LandingPage = () => {
  const navigate = useNavigate();
  const provider = useEthersProvider();
  const [tvl, setTvl] = useState(0);
  const [volume, setVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch stats on mount and set up periodic updates
  useEffect(() => {
    const fetchStats = async () => {
      if (!provider) {
        setLoading(false);
        return;
      }

      try {
        const stats = await getProtocolStats(provider);
        setTvl(stats.tvl || 0);
        setVolume(stats.volume || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Update every 60 seconds (same as ProtocolStats component)
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [provider]);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        const handleAction = (e) => {
          if (e) e.preventDefault();
          window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: '/dashboard' } }));
        };

        const features = [
          {
            icon: ArrowLeftRight,
            title: 'Swap',
            description: 'Instant token exchange with minimal slippage.',
          },
          {
            icon: BarChart3,
            title: 'Dashboard',
            description: 'Real-time portfolio analytics and tracking.',
          },
          {
            icon: Droplet,
            title: 'Faucet Claim',
            description: 'Get testnet tokens to start experimenting.',
          },
          {
            icon: Wallet,
            title: 'Lend & Borrow',
            description: 'Earn yield or borrow assets seamlessly.',
          },
        ];

        return (
          <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">

            {/* Subtle Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#5a8a3a]/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#5a8a3a]/5 rounded-full blur-[120px]"></div>
              <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-[600px] h-[300px] bg-[#5a8a3a]/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col flex-1">
              {/* Header */}
              <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-[#5a8a3a]/10 px-6 py-4 lg:px-12">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  {/* Logo */}
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <FlowLogo className="w-8 h-8 filter drop-shadow-[0_0_8px_rgba(90,138,58,0.5)]" />
                    <span className="text-white font-bold text-xl tracking-tight">flowonarc<span className="text-[#5a8a3a]">.xyz</span></span>
                  </div>

                  {/* Navigation */}
                  <nav className="hidden md:flex items-center gap-6">
                    <div className="flex items-center gap-1.5 opacity-60 cursor-not-allowed group">
                      <span className="text-gray-400 text-sm font-medium">Docs</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#5a8a3a]/10 text-[#5a8a3a] border border-[#5a8a3a]/20 rounded-md uppercase font-bold tracking-tighter">Coming Soon</span>
                    </div>
                    <a
                      href="https://discord.gg/buildonarc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                      Community
                    </a>
                  </nav>

                  {/* Connect Wallet Button */}
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        className="px-6 py-2 bg-[#5a8a3a] hover:bg-[#6b9a4a] text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(90,138,58,0.3)] hover:shadow-[0_0_20px_rgba(90,138,58,0.5)] flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4 text-black" />
                        Connect Wallet
                      </button>
                    ) : (
                      <button
                        onClick={openAccountModal}
                        className="px-6 py-2 bg-[#1a1a1a] border border-[#5a8a3a]/30 text-white rounded-xl font-bold text-sm transition-all duration-300 hover:bg-[#222222] flex items-center gap-2 shadow-[0_0_15px_rgba(90,138,58,0.1)]"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#5a8a3a] animate-pulse"></div>
                        {account.displayName}
                        <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
                      </button>
                    )}
                  </div>
                </div>
              </header>

              {/* Scrolling Notification */}
              <div className="fixed top-[73px] left-0 right-0 z-40 bg-black/40 backdrop-blur-sm border-b border-[#5a8a3a]/5 h-8 flex items-center overflow-hidden">
                <div className="max-w-7xl mx-auto w-full relative h-full">
                  <div className="animate-scroll-ltr flex items-center gap-2 px-4 h-full">
                    <span className="w-1.5 h-1.5 bg-[#5a8a3a] rounded-full animate-pulse shadow-[0_0_8px_#5a8a3a]"></span>
                    <span className="text-[#5a8a3a]/80 text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                      Please make use of testnet wallet!!
                    </span>
                  </div>
                </div>
              </div>

              {/* Hero Section */}
              <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-12 lg:pt-40 lg:pb-20">
                <div className="max-w-4xl mx-auto w-full text-center">
                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5a8a3a]/20 bg-[#5a8a3a]/5 mb-10">
                    <span className="w-2 h-2 bg-[#5a8a3a] rounded-full shadow-[0_0_8px_#5a8a3a]"></span>
                    <span className="text-[#5a8a3a] text-[10px] font-bold tracking-[0.2em] uppercase">LIVE ON ARC TESTNET</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-6xl lg:text-8xl font-black text-white mb-8 tracking-tighter">
                    flowonarc<span className="text-[#5a8a3a]">.xyz</span>
                  </h1>

                  {/* Tagline */}
                  <p className="text-gray-400 text-lg lg:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                    Liquidity in Motion. Experience the premier DeFi hub built specifically for the Arc ecosystem. Fast, secure, and organic.
                  </p>

                  {/* Launch App Button */}
                  <button
                    onClick={handleAction}
                    className="px-10 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-black rounded-xl font-black text-xl transition-all duration-300 inline-flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(34,197,94,0.5)] hover:transform hover:translate-y-[-2px] active:translate-y-[0px]"
                  >
                    Launch App
                    <Rocket className="w-6 h-6 text-black" />
                  </button>
                </div>

                {/* Feature Cards */}
                <div className="max-w-6xl mx-auto w-full mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={index}
                        className="glass-card p-8 rounded-[2rem] group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-[#5a8a3a]/10 border border-[#5a8a3a]/20 flex items-center justify-center mb-6 group-hover:bg-[#5a8a3a]/20 transition-all duration-300 group-hover:scale-110">
                          <Icon className="w-7 h-7 text-[#5a8a3a]" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-3">{feature.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">{feature.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Stats Bar */}
                <div className="max-w-5xl mx-auto w-full mt-20">
                  <div className="flex flex-col md:flex-row items-stretch justify-center gap-0 rounded-[2rem] border border-[#1a1a1a] bg-[rgba(17,17,17,0.95)] backdrop-blur-md overflow-hidden">
                    {/* Total TVL */}
                    <div className="flex-1 flex items-center gap-5 px-8 py-6 border-b md:border-b-0 md:border-r border-[#1a1a1a]">
                      <div className="w-12 h-12 rounded-xl bg-[#5a8a3a]/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-[#5a8a3a]" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">Total TVL</p>
                        <p className="text-white font-black text-2xl tracking-tight">
                          {loading ? '...' : formatCompactUSD(tvl)}
                        </p>
                      </div>
                    </div>

                    {/* Total Vol */}
                    <div className="flex-1 flex items-center gap-5 px-8 py-6 border-b md:border-b-0 md:border-r border-[#1a1a1a]">
                      <div className="w-12 h-12 rounded-xl bg-[#5a8a3a]/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-[#5a8a3a]" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">Total Vol</p>
                        <p className="text-white font-black text-2xl tracking-tight">
                          {loading ? '...' : formatCompactUSD(volume)}
                        </p>
                      </div>
                    </div>

                    {/* Pairs */}
                    <div className="flex-1 flex items-center gap-5 px-8 py-6">
                      <div className="w-12 h-12 rounded-xl bg-[#5a8a3a]/10 flex items-center justify-center">
                        <ArrowLeftRight className="w-6 h-6 text-[#5a8a3a]" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-[0.15em] font-bold mb-1">Pairs</p>
                        <p className="text-white font-black text-2xl tracking-tight">4</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* New CTA Card */}
                <div className="max-w-7xl mx-auto w-full mt-20 mb-16">
                  <div className="glass-card py-7 md:py-9 px-8 md:px-12 rounded-[2rem] text-center relative overflow-hidden group">
                    {/* Decorative Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#5a8a3a]/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-[#5a8a3a]/15 transition-colors"></div>

                    <div className="relative z-10">
                      <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
                        Ready to Explore?
                      </h2>
                      <p className="text-gray-400 text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
                        Claim testnet tokens and start Flowing in the #1 Lending Protocol on Arc. No drama, all Community-driven.
                      </p>
                      <button
                        onClick={handleAction}
                        className="px-10 py-3 bg-[#ffffff] hover:bg-[#f0f0f0] text-[#060906] rounded-2xl font-black text-lg transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)] hover:transform hover:translate-y-[-2px]"
                      >
                        Flow
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrolling Icons Section */}
                <div className="w-full mt-24 relative overflow-hidden">
                  {/* Pendle Dots Background Video */}
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-30 pointer-events-none"
                  >
                    <source src="/videos/dots.mp4" type="video/mp4" />
                  </video>

                  <div className="relative z-10 w-full">
                    <div className="w-full border-t border-[#5a8a3a]/10 pt-12">
                      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center gap-10">
                        <h3 className="text-white text-3xl font-bold tracking-tight uppercase">Most Traded Tokens</h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0 mt-10">
                      <div className="w-full overflow-hidden relative h-24 bg-black/20 flex items-center animate-alternate-top">
                        <div className="animate-scroll-rtl-slow flex items-center gap-24 h-full">
                          {[
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                            // Second set
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                            // Third set
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                          ].map((icon, idx) => (
                            <div key={idx} className="flex items-center gap-4 transition-all duration-300 group cursor-default hover:scale-105">
                              <img src={icon.src} alt={icon.name} className="w-14 h-14 object-contain transition-all" />
                              <span className="text-white text-sm font-black tracking-widest">{icon.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="w-full overflow-hidden relative h-24 bg-black/10 flex items-center border-t border-[#5a8a3a]/5 animate-alternate-bottom">
                        <div className="animate-scroll-ltr-slow flex items-center gap-24 h-full">
                          {[
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                            // Second set
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                            // Third set
                            { src: '/icons/USDC.png', name: 'USDC' },
                            { src: '/icons/CAT.png', name: 'CAT' },
                            { src: '/icons/PANDA.png', name: 'PANDA' },
                            { src: '/icons/DARC.png', name: 'DARC' },
                          ].map((icon, idx) => (
                            <div key={idx} className="flex items-center gap-4 transition-all duration-300 group cursor-default hover:scale-105">
                              <img src={icon.src} alt={icon.name} className="w-14 h-14 object-contain transition-all" />
                              <span className="text-white text-sm font-black tracking-widest">{icon.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>

              {/* Footer */}
              <footer className="w-full px-6 py-8 lg:px-12 bg-black/80 backdrop-blur-xl border-t border-[#5a8a3a]/10 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Left Side: Socials & Docs */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <a href="https://twitter.com/flowOnArc" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                      </a>
                      <a href="https://discord.gg/buildonarc" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                        <DiscordIcon className="w-5 h-5" />
                      </a>
                      <a href="https://github.com/lee785/Flow-On-Arc" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                        <Github className="w-5 h-5" />
                      </a>
                    </div>
                    <div className="h-4 w-[1px] bg-gray-800 hidden md:block"></div>
                    <div className="flex items-center gap-2 group cursor-not-allowed">
                      <span className="text-gray-500 text-sm font-medium">Docs</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#5a8a3a]/10 text-[#5a8a3a] border border-[#5a8a3a]/20 rounded uppercase font-bold tracking-tighter">Coming Soon!</span>
                    </div>
                  </div>

                  {/* Right Side: Copyright */}
                  <div className="text-gray-600 text-sm font-medium tracking-tight">
                    Flow On ARC © 2025
                  </div>
                </div>
              </footer>
            </div>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default LandingPage;
