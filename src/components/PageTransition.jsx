import React, { useEffect, useState } from 'react';
import FlowLogo from './FlowLogo';

const PageTransition = ({ isVisible, onComplete }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setAnimationClass('fade-in');
    } else {
      setAnimationClass('fade-out');
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onComplete) onComplete();
      }, 500); // Wait for fade-out duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${animationClass === 'fade-in' ? 'opacity-100' : 'opacity-0'}`}>
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 h-1 bg-[#5cb849] transition-all duration-[1500ms] ease-out" style={{ width: isVisible ? '100%' : '0%' }}></div>

      <div className="relative">
        <FlowLogo className="w-24 h-24 filter drop-shadow-[0_0_20px_rgba(92,184,73,0.5)] animate-pulse" />
      </div>

      <div className="mt-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold gradient-text animate-pulse">Flowing...</h2>
        <p className="text-gray-500 text-sm mt-2 font-medium tracking-widest uppercase">Everything is better in Motion</p>
      </div>

      <style>{`
        .fade-in {
          opacity: 1;
        }
        .fade-out {
          opacity: 0;
        }
        @keyframes progress-loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default PageTransition;
