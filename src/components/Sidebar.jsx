import React from 'react';
import { LayoutDashboard, ArrowLeftRight, DollarSign, Droplet, Clock, Wallet } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
    { id: 'lend-borrow', label: 'Lend/Borrow', icon: DollarSign },
    { id: 'faucet', label: 'Faucet', icon: Droplet },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-black border-r border-[#1a1a1a] flex flex-col">
      {/* Logo */}
      <div className="pt-6 pr-6 pb-3 pl-0 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-0">
          <img src="/icons/Arc.png" alt="Arc" className="w-[90px] h-[90px]" />
          <div className="flex flex-col pl-0 -ml-[8px] flex-1 min-w-0">
            <h1 className="text-2xl font-bold gradient-text leading-tight whitespace-nowrap">Flow On Arc</h1>
            <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">Swap, lend and Earn on Arc</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'gradient-bg text-white shadow-lg shadow-[#5a8a3a]/20 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
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
                        className="w-full gradient-bg text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                      >
                        <Wallet className="w-5 h-5" />
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={openAccountModal}
                      className="w-full bg-[#1a1a1a] text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#5a8a3a]"></div>
                      {account.displayName}
                    </button>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  );
};

export default Sidebar;

