import React from 'react';
import { X } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose }) => {
  // Google Form embed URL
  const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScOtSfvmBP5pWn1iudS0D-CqUKrpgE31b3I3xq4F9PRAc1hBg/viewform?embedded=true';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors bg-[#1a1a1a] rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-4">Send Feedback</h2>
        
        {/* Google Form Embed */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={GOOGLE_FORM_URL}
            width="100%"
            height="600"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            className="w-full h-full min-h-[500px]"
            title="Feedback Form"
          >
            Loading…
          </iframe>
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your responses will be sent directly to us. Thank you for your feedback!
        </p>
      </div>
    </div>
  );
};

export default FeedbackModal;
