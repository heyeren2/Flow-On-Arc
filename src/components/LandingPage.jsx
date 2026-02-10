import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Gauge, Waves, Landmark, Coins, Rocket, Github, ChevronDown, Wallet, BarChart3, ArrowLeftRight, X, Info, MousePointer2 } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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

  // Add styles for the flowing waves
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes wave-flow {
        0% { transform: translateX(-20%) skewX(-5deg); }
        50% { transform: translateX(0%) skewX(5deg); }
        100% { transform: translateX(-20%) skewX(-5deg); }
      }
      .animate-wave-flow {
        animation: wave-flow 15s ease-in-out infinite;
      }
      .animate-wave-flow-slow {
        animation: wave-flow 25s ease-in-out infinite;
      }
      .animate-wave-flow-fast {
        animation: wave-flow 10s ease-in-out infinite;
      }
      .starfield {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: transparent;
      }
      .star-layer-1 {
        width: 1px;
        height: 1px;
        background: transparent;
        box-shadow: 1744px 110px #FFF, 1269px 1058px #FFF, 1022px 1419px #FFF, 1515px 446px #FFF, 1145px 125px #FFF, 1876px 1493px #FFF, 1729px 1383px #FFF, 1332px 1863px #FFF, 1695px 1561px #FFF, 1801px 406px #FFF, 154px 381px #FFF, 1693px 802px #FFF, 911px 470px #FFF, 1618px 436px #FFF, 10px 1083px #FFF, 421px 408px #FFF, 1551px 710px #FFF, 182px 1215px #FFF, 107px 1198px #FFF, 1420px 248px #FFF;
        animation: star-drift 150s linear infinite;
      }
      .star-layer-2 {
        width: 2px;
        height: 2px;
        background: transparent;
        box-shadow: 1533px 1475px #FFF, 1637px 424px #FFF, 1289px 409px #FFF, 1104px 502px #FFF, 1928px 1017px #FFF, 1461px 376px #FFF, 24px 1740px #FFF, 483px 1022px #FFF, 1205px 1656px #FFF, 1105px 1546px #FFF;
        animation: star-drift 100s linear infinite;
      }
      .star-layer-3 {
        width: 3px;
        height: 3px;
        background: transparent;
        box-shadow: 1374px 1640px #FFF, 1243px 1279px #FFF, 834px 281px #FFF, 1622px 1004px #FFF, 804px 1546px #FFF;
        animation: star-drift 50s linear infinite;
      }
      @keyframes star-drift {
        from { transform: translateY(0px); }
        to { transform: translateY(-2000px); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
            icon: Gauge,
            title: 'Dashboard',
            description: 'Real-time portfolio analytics and tracking.',
            type: 'dashboard'
          },
          {
            icon: Repeat,
            title: 'Swap',
            description: 'Instant token exchange with minimal slippage.',
            type: 'swap'
          },
          {
            icon: Waves,
            title: 'Pool',
            description: 'Provide liquidity and earn trading fees.',
            type: 'pool'
          },
          {
            icon: Landmark,
            title: 'Lend & Borrow',
            description: 'Earn yield or borrow assets seamlessly.',
            type: 'lend'
          },
          {
            icon: Coins,
            title: 'Faucet Claim',
            description: 'Get testnet tokens to start experimenting.',
            type: 'faucet'
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
                  <div className="flex items-center gap-0 cursor-pointer" onClick={() => navigate('/')}>
                    <img
                      src="/icons/Flow (2).png"
                      alt="Flow"
                      className="w-14 h-14 filter drop-shadow-[0_0_8px_rgba(90,138,58,0.5)] object-contain"
                    />
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
                        <Wallet className="w-4 h-4 text-[#5a8a3a]" />
                        {account.displayName}
                        <ChevronDown className="w-4 h-4 ml-1 opacity-60" />
                      </button>
                    )}
                  </div>
                </div>
              </header>


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

                {/* Stats Bar */}
                <div className="max-w-5xl mx-auto w-full mt-24">
                  <div className="relative py-8 px-6 border-y border-[#5a8a3a]/10">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-0">
                      {/* Total TVL */}
                      <div className="flex-1 text-center md:border-r border-[#5a8a3a]/10 px-8">
                        <p className="text-[#5a8a3a] text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Total TVL</p>
                        <p className="text-white font-bold text-4xl tracking-tight">
                          {loading ? '...' : formatCompactUSD(tvl)}
                        </p>
                      </div>

                      {/* Total Vol */}
                      <div className="flex-1 text-center md:border-r border-[#5a8a3a]/10 px-8">
                        <p className="text-[#5a8a3a] text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Total Volume</p>
                        <p className="text-white font-bold text-4xl tracking-tight">
                          {loading ? '...' : formatCompactUSD(volume)}
                        </p>
                      </div>

                      {/* Pairs */}
                      <div className="flex-1 text-center px-8">
                        <p className="text-[#5a8a3a] text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Pairs Active</p>
                        <p className="text-white font-bold text-4xl tracking-tight">4</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotional Text */}
                <div className="mt-32 text-center max-w-3xl mx-auto">
                  <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6 leading-relaxed py-2">
                    Everything you need to Flow.
                  </h2>
                  <p className="text-gray-400 text-lg md:text-xl leading-relaxed font-medium">
                    From instant token swaps to secure money markets, explore the tools powering the future of finance on Arc.
                  </p>
                </div>

                {/* Feature Cards */}
                <div className="max-w-7xl mx-auto w-full mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={index}
                        className="glass-card p-8 rounded-[2rem] group relative flex flex-col items-start overflow-hidden min-h-[280px]"
                      >
                        <div className="relative z-10 w-full">
                          <div className="w-14 h-14 rounded-2xl bg-[#5a8a3a]/10 border border-[#5a8a3a]/20 flex items-center justify-center mb-6 group-hover:bg-[#5a8a3a]/20 transition-all duration-300 group-hover:scale-110">
                            <Icon className="w-7 h-7 text-[#5a8a3a]" />
                          </div>
                          <h3 className="text-white font-bold text-xl mb-3">{feature.title}</h3>
                          <p className="text-gray-500 text-sm leading-relaxed font-medium mb-8">{feature.description}</p>
                        </div>

                        {/* Card-Specific Visual Elements */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {/* Dashboard Viz: Mini Bar Chart - Increased Visibility, Removed Pulse */}
                          {feature.type === 'dashboard' && (
                            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-1.5 h-10 opacity-80 group-hover:opacity-100 transition-opacity">
                              <div className="flex-1 bg-[#5a8a3a]/40 rounded-t-sm" style={{ height: '30%' }}></div>
                              <div className="flex-1 bg-[#5a8a3a]/50 rounded-t-sm" style={{ height: '55%' }}></div>
                              <div className="flex-1 bg-[#5a8a3a]/40 rounded-t-sm" style={{ height: '40%' }}></div>
                              <div className="flex-1 bg-[#22c55e]/70 rounded-t-sm" style={{ height: '85%' }}></div>
                              <div className="flex-1 bg-[#5a8a3a]/50 rounded-t-sm" style={{ height: '70%' }}></div>
                            </div>
                          )}

                          {/* Swap Viz: Floating Token Icons - Increased Visibility */}
                          {feature.type === 'swap' && (
                            <div className="absolute bottom-2 right-2 w-24 h-24">
                              <img src="/icons/USDC.png" className="absolute top-0 right-4 w-10 h-10 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" alt="" />
                              <img src="/icons/CAT.png" className="absolute bottom-4 right-8 w-12 h-12 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all delay-75" alt="" />
                              <img src="/icons/PANDA.png" className="absolute bottom-8 right-0 w-10 h-10 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all delay-150" alt="" />
                            </div>
                          )}

                          {/* Pool Viz: Clustered Token Icons - Removed Borders */}
                          {feature.type === 'pool' && (
                            <div className="absolute bottom-6 right-6 flex items-center">
                              <div className="relative flex -space-x-4 opacity-80 group-hover:opacity-100 group-hover:-space-x-2 transition-all">
                                <img src="/icons/USDC.png" className="w-10 h-10 rounded-full" alt="" />
                                <img src="/icons/CAT.png" className="w-10 h-10 rounded-full" alt="" />
                                <img src="/icons/DARC.png" className="w-10 h-10 rounded-full" alt="" />
                              </div>
                            </div>
                          )}

                          {/* Lend/Borrow Viz: Upward Trend */}
                          {feature.type === 'lend' && (
                            <div className="absolute bottom-6 right-8 opacity-20 group-hover:opacity-40 transition-opacity">
                              <svg className="w-20 h-20 text-[#5a8a3a] transform rotate-[-5deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                          )}

                          {/* Faucet Viz: Coin Drop */}
                          {feature.type === 'faucet' && (
                            <div className="absolute bottom-8 right-8 w-12 h-12 rounded-full border-2 border-[#5a8a3a]/20 flex items-center justify-center opacity-40 group-hover:opacity-80 transition-all group-hover:scale-110">
                              <div className="w-6 h-6 rounded-full border border-[#5a8a3a] flex items-center justify-center">
                                <div className="w-0.5 h-3 bg-[#5a8a3a]"></div>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-[#5a8a3a]/30 animate-ping"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>


                {/* Brand-Aligned CTA Card */}
                <div className="max-w-[98%] mx-auto w-full mt-32 mb-24 lg:px-6 px-4">
                  <div className="relative py-20 md:py-24 lg:px-12 px-8 rounded-[3.5rem] text-center overflow-hidden group bg-[#5a8a3a] border border-[#5a8a3a]/20 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)]">
                    {/* Flowing Waves Background - 9 High-Visibility Layers */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {/* Layer 1 */}
                      <svg className="absolute w-[200%] h-full top-0 left-0 animate-wave-flow-slow opacity-30" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,200 C300,100 900,300 1200,200 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="2" />
                      </svg>
                      {/* Layer 2 */}
                      <svg className="absolute w-[200%] h-full top-4 left-0 animate-wave-flow opacity-25" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,210 C350,110 850,310 1200,210 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1.8" />
                      </svg>
                      {/* Layer 3 */}
                      <svg className="absolute w-[200%] h-full top-8 left-0 animate-wave-flow-fast opacity-20" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,220 C400,120 800,320 1200,220 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                      </svg>
                      {/* Layer 4 */}
                      <svg className="absolute w-[200%] h-full top-12 left-[-50%] animate-wave-flow-slow opacity-15" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,230 C450,130 750,330 1200,230 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                      </svg>
                      {/* Layer 5 */}
                      <svg className="absolute w-[180%] h-full top-16 left-0 animate-wave-flow opacity-10" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,240 C500,140 700,340 1200,240 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1" />
                      </svg>
                      {/* Layer 6 */}
                      <svg className="absolute w-[200%] h-full top-20 left-[-20%] animate-wave-flow-fast opacity-5" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,250 C550,150 650,350 1200,250 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                      </svg>
                      {/* New Layer 7 */}
                      <svg className="absolute w-[220%] h-full top-2 right-0 animate-wave-flow opacity-20" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,205 C200,150 1000,250 1200,205 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                      </svg>
                      {/* New Layer 8 */}
                      <svg className="absolute w-[190%] h-full top-24 left-[-10%] animate-wave-flow-slow opacity-15" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,260 C300,180 900,300 1200,260 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                      </svg>
                      {/* New Layer 9 */}
                      <svg className="absolute w-[250%] h-full top-[-5%] left-0 animate-wave-flow opacity-10" viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0,190 C400,90 800,290 1200,190 L1200,400 L0,400 Z" fill="none" stroke="#ffffff" strokeWidth="1" />
                      </svg>
                    </div>

                    <div className="relative z-10 max-w-4xl mx-auto">
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-sm">
                        Get Started!
                      </h2>
                      <p className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-semibold drop-shadow-sm">
                        Claim testnet tokens and start Flowing in the #1 Lending Protocol on Arc. No drama, all Community-driven.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                        <button
                          onClick={() => setIsGuideOpen(true)}
                          className="w-full sm:w-auto px-12 py-4 border-2 border-white/40 hover:border-white/70 text-white rounded-[1.5rem] font-bold text-xl transition-all duration-300 hover:bg-white/10"
                        >
                          How to Flow?
                        </button>
                        <button
                          onClick={handleAction}
                          className="w-full sm:w-auto px-16 py-4 bg-white hover:bg-gray-100 text-[#5a8a3a] rounded-[1.5rem] font-black text-xl transition-all duration-300 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.3)] hover:transform hover:translate-y-[-2px]"
                        >
                          Enter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guide Modal */}
                {isGuideOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                      className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                      onClick={() => setIsGuideOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden glass-card rounded-[2.5rem] border border-[#5a8a3a]/20 shadow-[0_0_50px_rgba(90,138,58,0.15)] flex flex-col animate-in fade-in zoom-in duration-300">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-8 border-b border-[#5a8a3a]/10 bg-[#5a8a3a]/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#5a8a3a]/20 flex items-center justify-center">
                            <Info className="w-5 h-5 text-[#5a8a3a]" />
                          </div>
                          <h2 className="text-2xl font-black text-white tracking-tight">How to Flow</h2>
                        </div>
                        <button
                          onClick={() => setIsGuideOpen(false)}
                          className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Modal Content */}
                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* Step 1: Connect */}
                        <div className="flex gap-6 group">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">1</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <MousePointer2 className="w-4 h-4 text-[#5a8a3a]" />
                              Connect Your Wallet
                            </h3>
                            <p className="text-gray-400 leading-relaxed">Click <span className="text-white font-semibold">Connect Wallet</span> in the navigation bar or page header to connect your wallet and start your DeFi journey on Arc.</p>
                          </div>
                        </div>

                        {/* Step 2: Faucet */}
                        <div className="flex gap-6 group">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">2</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <Coins className="w-4 h-4 text-[#5a8a3a]" />
                              Claim Testnet Tokens
                            </h3>
                            <p className="text-gray-400 leading-relaxed">Navigate to the <span className="text-white font-semibold">Faucet</span> tab to claim testnet tokens like CAT and USDC. These are necessary to interact with the protocol's features.</p>
                          </div>
                        </div>

                        {/* Step 3: Swap */}
                        <div className="flex gap-6 group">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">3</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <Repeat className="w-4 h-4 text-[#5a8a3a]" />
                              Swap Tokens
                            </h3>
                            <p className="text-gray-400 leading-relaxed">Exchange your tokens instantly in the <span className="text-white font-semibold">Swap</span> tab. For example, you can swap <span className="text-[#5a8a3a]">CAT</span> to <span className="text-[#5a8a3a]">USDC</span> with minimal slippage.</p>
                          </div>
                        </div>

                        {/* Step 4: Lend */}
                        <div className="flex gap-6 group">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">4</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-[#5a8a3a]" />
                              Lend & Borrow
                            </h3>
                            <p className="text-gray-400 leading-relaxed">Go to the <span className="text-white font-semibold">Lend</span> tab and select a token (CAT or USDC). You can <span className="text-[#5a8a3a]">Supply</span> to earn yield, <span className="text-[#5a8a3a]">Withdraw</span>, <span className="text-[#5a8a3a]">Borrow</span> against collateral, or <span className="text-[#5a8a3a]">Repay</span> your loans.</p>
                          </div>
                        </div>

                        {/* Step 5: Pool */}
                        <div className="flex gap-6 group">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">5</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <Waves className="w-4 h-4 text-[#5a8a3a]" />
                              Manage Liquidity
                            </h3>
                            <div className="space-y-4 text-gray-400 leading-relaxed text-sm">
                              <p><span className="text-white font-semibold">To Add:</span> Go to the <span className="text-white">Pool</span> tab, click your preferred pool, enter an amount, click 'Add Liquidity', and confirm.</p>
                              <p><span className="text-white font-semibold">To Remove:</span> Click the dropdown, scroll down to see your liquidity, select the pool, enter amount, click 'Remove', and confirm.</p>
                            </div>
                          </div>
                        </div>

                        {/* Step 6: Activity */}
                        <div className="flex gap-6 group pb-4">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[#5a8a3a] text-xl group-hover:border-[#5a8a3a]/30 transition-colors">6</div>
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4 text-[#5a8a3a]" />
                              Track Activity
                            </h3>
                            <p className="text-gray-400 leading-relaxed">Monitor all your on-chain transactions and history in the <span className="text-white font-semibold">Activity</span> tab to stay on top of your portfolio.</p>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-8 border-t border-[#5a8a3a]/10 bg-[#5a8a3a]/5">
                        <button
                          onClick={() => setIsGuideOpen(false)}
                          className="w-full py-4 bg-[#5a8a3a] hover:bg-[#6b9a4a] text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_20px_rgba(90,138,58,0.2)]"
                        >
                          Got it, let's Flow!
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scrolling Icons Section */}
                <div className="w-full mt-24 relative overflow-hidden">
                  {/* CSS Starfield Background - Massive Bandwidth Saving */}
                  <div className="starfield opacity-40 pointer-events-none">
                    <div className="star-layer-1"></div>
                    <div className="star-layer-2"></div>
                    <div className="star-layer-3"></div>
                  </div>

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
              <footer className="w-full px-6 py-16 lg:px-12 bg-black border-t border-[#5a8a3a]/10 mt-auto">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-8">
                    {/* Branding Column - Stays Left */}
                    <div className="flex flex-col gap-6 max-w-sm">
                      <div className="flex items-center gap-0">
                        <img
                          src="/icons/Flow (2).png"
                          alt="Flow"
                          className="w-14 h-14 filter drop-shadow-[0_0_8px_rgba(90,138,58,0.5)] object-contain"
                        />
                        <span className="text-white font-bold text-xl tracking-tight">Flow On Arc</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        The premier DeFi ecosystem on Arc. Experience seamless lending, borrowing, and swapping with a focus on efficiency and elegant design.
                      </p>
                      <div className="flex items-center gap-4">
                        <a href="https://twitter.com/flowOnArc" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-[#5a8a3a]/20 flex items-center justify-center text-gray-500 hover:text-white hover:border-[#5a8a3a]/50 transition-all duration-300">
                          <XIcon className="w-4 h-4" />
                        </a>
                        <a href="https://github.com/heyeren2/Flow-On-Arc" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-[#5a8a3a]/20 flex items-center justify-center text-gray-500 hover:text-white hover:border-[#5a8a3a]/50 transition-all duration-300">
                          <Github className="w-4 h-4" />
                        </a>
                        <div className="w-10 h-10 rounded-full border border-[#5a8a3a]/20 flex items-center justify-center text-gray-500 cursor-default transition-all duration-300">
                          <DiscordIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Content Columns - Shifted Right and Tighter Spacing */}
                    <div className="flex flex-wrap lg:flex-nowrap gap-x-8 sm:gap-x-12 lg:gap-x-14 gap-y-10 lg:justify-end flex-1 lg:pl-12">
                      {/* Product Column */}
                      <div className="flex flex-col gap-6 min-w-[120px]">
                        <h4 className="text-white font-bold text-lg">Product</h4>
                        <ul className="flex flex-col gap-4">
                          <li><button onClick={() => window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: '/faucet' } }))} className="text-gray-400 hover:text-white transition-colors text-sm text-left">Faucet</button></li>
                          <li><button onClick={() => window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: '/swap' } }))} className="text-gray-400 hover:text-white transition-colors text-sm text-left">Swap</button></li>
                          <li><button onClick={() => window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: '/pool' } }))} className="text-gray-400 hover:text-white transition-colors text-sm text-left">Pools</button></li>
                          <li><button onClick={() => window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: '/lend-borrow' } }))} className="text-gray-400 hover:text-white transition-colors text-sm text-left">Lend & Borrow</button></li>
                        </ul>
                      </div>

                      {/* Tokens Column */}
                      <div className="flex flex-col gap-6 min-w-[120px]">
                        <h4 className="text-white font-bold text-lg">Tokens</h4>
                        <ul className="flex flex-col gap-4">
                          <li className="text-gray-400 hover:text-white transition-colors text-sm cursor-default">USDC</li>
                          <li className="text-gray-400 hover:text-white transition-colors text-sm cursor-default">CAT</li>
                          <li className="text-gray-400 hover:text-white transition-colors text-sm cursor-default">DARC</li>
                          <li className="text-gray-400 hover:text-white transition-colors text-sm cursor-default">PANDA</li>
                        </ul>
                      </div>

                      {/* Resources Column */}
                      <div className="flex flex-col gap-6 min-w-[120px]">
                        <h4 className="text-white font-bold text-lg">Resources</h4>
                        <ul className="flex flex-col gap-4">
                          <li><a href="https://docs.arc.network" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Arc Docs</a></li>
                          <li><a href="https://developers.circle.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Circle Docs</a></li>
                          <li><a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Arc Explorer</a></li>
                        </ul>
                      </div>

                      {/* Support Column */}
                      <div className="flex flex-col gap-6 min-w-[120px]">
                        <h4 className="text-white font-bold text-lg">Support</h4>
                        <ul className="flex flex-col gap-4">
                          <li><a href="https://discord.gg/buildonarc" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Arc Discord</a></li>
                          <li><a href="https://twitter.com/i/communities/2002598923404214743" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Arc Community</a></li>
                          <li><a href="https://twitter.com/heyeren_" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Builder X</a></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="mt-16 pt-8 border-t border-[#5a8a3a]/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-gray-500 text-sm">
                      © 2026 Flow On Arc. All rights reserved.
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="text-gray-500 text-sm cursor-default">Privacy Policy</span>
                      <span className="text-gray-500 text-sm cursor-default">Terms of Service</span>
                    </div>
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
