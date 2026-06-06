import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Gauge, Repeat, Landmark, Coins, ScrollText, Wallet, X, ChevronDown, Home, Waves } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Sidebar = ({ isMobileOpen, setIsMobileOpen, isCollapsed = false, onToggleCollapse, className = '', onFaucetClick }) => {
  const location = useLocation();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/dashboard' },
    { id: 'swap', label: 'Swap', icon: Repeat, path: '/swap' },
    { id: 'pool', label: 'Pool', icon: Waves, path: '/pool' },
    { id: 'lend-borrow', label: 'Lend/Borrow', icon: Landmark, path: '/lend-borrow' },
    { id: 'faucet', label: 'Faucet', icon: Coins, path: '/faucet' },
    { id: 'activity', label: 'Activity', icon: ScrollText, path: '/activity' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[6px] z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Drawer on mobile, fixed on desktop */}
      <div className={`
        fixed left-0 top-0 h-full bg-black border-r border-[#1a1a1a] flex flex-col z-50
        transform transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} ${className}
      `}>
        {/* Logo Container */}
        <div className={`lg:pt-6 lg:pb-3 pt-0 pb-2 border-b border-[#1a1a1a] transition-all duration-150 ${isCollapsed ? 'px-0 flex justify-center' : 'px-6'} overflow-hidden`}>
          <div className={`flex flex-col items-center gap-0 overflow-hidden lg:flex-row lg:items-center lg:gap-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <img
              src="/icons/Flow (2).png"
              alt="Flow"
              className={`
                ${isCollapsed ? 'w-20 h-20 ml-0' : 'w-[197px] h-[96px] lg:w-[86px] lg:h-[81px] lg:ml-[-8px]'} 
                object-contain shrink-0 transition-all duration-150
                filter drop-shadow-[0_0_20px_rgba(90,138,58,0.6)]
              `}
            />
            <div className={`hidden lg:flex flex-col items-start pl-0 lg:-ml-[10px] flex-1 min-w-0 transition-all duration-150 ${isCollapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              <h1 className="text-2xl font-bold gradient-text leading-tight whitespace-nowrap">Flow On Arc</h1>
              <p className="text-xs text-gray-400 mt-0 whitespace-nowrap">Swap, lend and Earn on Arc</p>
            </div>
          </div>
        </div>

        {/* Mobile Close Button - Absolutely Positioned */}
        <button
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-xl hover:bg-[#1a1a1a] transition-colors z-[60]"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'faucet' ? false : (location.pathname === item.path);

            return (
              <NavLink
                key={item.id}
                to={item.id === 'faucet' ? '#' : item.path}
                onClick={(e) => {
                  setIsMobileOpen(false);
                  if (item.id === 'home') {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('start-page-transition', { detail: { path: item.path } }));
                  } else if (item.id === 'faucet') {
                    e.preventDefault();
                    if (onFaucetClick) {
                      onFaucetClick();
                    }
                  }
                }}
                className={() =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] ${isActive
                    ? 'gradient-bg text-white shadow-lg shadow-[#5a8a3a]/20 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`font-medium transition-all duration-150 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Connect Wallet Button */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
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
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className={`w-full gradient-bg text-white py-3 px-4 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md min-h-[44px] ${isCollapsed ? 'justify-center px-2' : 'justify-center'}`}
                        >
                          <Wallet className="w-5 h-5 shrink-0" />
                          <span className={`transition-all duration-150 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                            Connect Wallet
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        onClick={openAccountModal}
                        className={`w-full bg-[#1a1a1a] text-white py-3 px-4 rounded-xl font-medium flex items-center gap-2 hover:bg-[#222222] transition-colors min-h-[44px] ${isCollapsed ? 'justify-center px-2' : 'justify-center'}`}
                      >
                        <Wallet className="w-4 h-4 text-[#5a8a3a] shrink-0" />
                        <span className={`truncate transition-all duration-150 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                          {account.displayName}
                        </span>
                        {!isCollapsed && <ChevronDown className="w-4 h-4 shrink-0 opacity-60 transition-opacity duration-150" />}
                      </button>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

