import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose }) => {
  const TALLY_FORM_URL = 'https://tally.so/embed/OD4AvK?alignLeft=1&transparentBackground=1&dynamicHeight=1&formEventsForwarding=1';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const iframeRef = useRef(null);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Listen for Tally form submission events
  useEffect(() => {
    const handleMessage = (event) => {
      // Check if it's a Tally event
      if (event.data && typeof event.data === 'object') {
        // Tally sends 'Tally.FormSubmitted' when form is submitted
        if (event.data.event === 'Tally.FormSubmitted') {
          setIsSubmitted(true);
          setCountdown(5);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-close countdown after submission
  useEffect(() => {
    if (isSubmitted && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSubmitted && countdown === 0) {
      // Reset state and close
      setIsSubmitted(false);
      setCountdown(5);
      onClose();
    }
  }, [isSubmitted, countdown, onClose]);

  // Reset submitted state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitted(false);
      setCountdown(5);
    }
  }, [isOpen]);

  // Always render the iframe for preloading, but hide the modal when not open
  return (
    <>
      {/* Hidden preload iframe - always mounted */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={TALLY_FORM_URL}
          width="1"
          height="1"
          frameBorder="0"
          title="Feedback Form Preload"
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Visible modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={onClose} 
          />
          
          <div className="relative z-10 w-full max-w-[600px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between bg-[#111111]/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isSubmitted ? 'bg-[#5a8a3a]/30' : 'bg-[#5a8a3a]/20'}`}>
                  {isSubmitted ? (
                    <CheckCircle className="w-5 h-5 text-[#5cb849]" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-[#5cb849]" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {isSubmitted ? 'Thank You!' : 'Send Feedback'}
                  </h2>
                  <p className="text-gray-500 text-xs">
                    {isSubmitted 
                      ? `Closing in ${countdown} seconds...` 
                      : 'Help us improve the Flow On Arc experience'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* The Form Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a] min-h-[627px] relative">
              {/* Loading spinner */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#5a8a3a] animate-spin" />
                    <p className="text-gray-500 text-sm">Loading form...</p>
                  </div>
                </div>
              )}
              
              {/* Success message overlay */}
              {isSubmitted && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10">
                  <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="p-4 bg-[#5a8a3a]/20 rounded-full">
                      <CheckCircle className="w-12 h-12 text-[#5cb849]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Feedback Submitted!</h3>
                    <p className="text-gray-400 max-w-sm">
                      Thank you for helping us improve Flow On Arc. Your feedback is valuable to us!
                    </p>
                    <div className="mt-4 px-4 py-2 bg-[#1a1a1a] rounded-full">
                      <span className="text-gray-500 text-sm">
                        Auto-closing in <span className="text-[#5cb849] font-bold">{countdown}</span> seconds
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Iframe */}
              <iframe
                src={TALLY_FORM_URL}
                width="100%"
                height="1400"
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                title="Feedback Form"
                scrolling="no"
                className={`w-full transition-opacity duration-300 ${isLoading || isSubmitted ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleIframeLoad}
                style={{ 
                  background: 'transparent',
                  border: 'none',
                  overflow: 'hidden',
                  display: 'block'
                }}
              >
                Loading…
              </iframe>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-[#1a1a1a] bg-[#111111]/30 text-center">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                {isSubmitted ? 'Your feedback has been recorded' : 'Securely powered by Tally.so'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackModal;
