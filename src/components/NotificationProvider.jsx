import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { ARC_TESTNET } from '../constants/contracts';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

const Notification = ({ notification, onDismiss }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-[#5a8a3a]" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#5a8a3a]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    if (notification.title) return notification.title;
    
    switch (notification.action) {
      case 'swap':
        return notification.type === 'pending' ? 'Swapping tokens...' : 
               notification.type === 'success' ? 'Swap successful' : 'Swap failed';
      case 'supply':
        return notification.type === 'pending' ? 'Supplying collateral...' : 
               notification.type === 'success' ? 'Collateral supplied' : 'Supply failed';
      case 'withdraw':
        return notification.type === 'pending' ? 'Withdrawing collateral...' : 
               notification.type === 'success' ? 'Collateral withdrawn' : 'Withdraw failed';
      case 'borrow':
        return notification.type === 'pending' ? 'Borrowing tokens...' : 
               notification.type === 'success' ? 'Tokens borrowed' : 'Borrow failed';
      case 'repay':
        return notification.type === 'pending' ? 'Repaying tokens...' : 
               notification.type === 'success' ? 'Tokens repaid' : 'Repay failed';
      case 'approve':
        return notification.type === 'pending' ? 'Approving token...' : 
               notification.type === 'success' ? 'Token approved' : 'Approval failed';
      case 'claim':
        return notification.type === 'pending' ? 'Claiming tokens...' : 
               notification.type === 'success' ? 'Tokens claimed' : 'Claim failed';
      default:
        return 'Transaction';
    }
  };

  return (
    <div className="glass-card p-4 min-w-[320px] max-w-[420px] animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white">
              {getTitle()}
            </p>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {notification.message && (
            <p className="text-xs text-gray-400 mt-1">
              {notification.message}
            </p>
          )}
          {notification.hash && (
            <a
              href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${notification.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#5a8a3a] hover:text-[#6b9a4a] mt-2 transition-colors"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = { ...notification, id };
    
    setNotifications((prev) => [...prev, newNotification]);
    
    // Auto-dismiss success/error notifications after 5 seconds
    if (notification.type !== 'pending') {
      setTimeout(() => {
        dismissNotification(id);
      }, 5000);
    }
    
    return id;
  }, []);

  const updateNotification = useCallback((id, updates) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, ...updates } : notif))
    );
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const showTransaction = useCallback(async (action, transactionPromise, options = {}) => {
    const pendingId = addNotification({
      type: 'pending',
      action,
      title: options.pendingTitle,
      message: options.pendingMessage,
    });

    try {
      const tx = await transactionPromise;
      
      // Update with transaction hash
      if (tx.hash) {
        updateNotification(pendingId, {
          hash: tx.hash,
          message: options.processingMessage || 'Transaction submitted',
        });

        // Dispatch event to notify Activity component
        window.dispatchEvent(new CustomEvent('transactionPending', {
          detail: {
            hash: tx.hash,
            type: action,
            data: options.transactionData || {},
          },
        }));
      }

      // Wait for confirmation
      let receipt = null;
      if (tx.wait) {
        receipt = await tx.wait();
      }

      // Show success
      dismissNotification(pendingId);
      addNotification({
        type: 'success',
        action,
        title: options.successTitle,
        message: options.successMessage,
        hash: tx.hash,
      });

      // Dispatch event to notify Activity component
      if (tx.hash) {
        window.dispatchEvent(new CustomEvent('transactionConfirmed', {
          detail: {
            hash: tx.hash,
            type: action,
            blockNumber: receipt?.blockNumber,
            data: options.transactionData || {},
          },
        }));
      }

      return tx;
    } catch (error) {
      // Show error
      dismissNotification(pendingId);
      
      let errorMessage = error.message || 'Unknown error';
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.code === -32603) {
        errorMessage = 'Transaction failed';
      }

      addNotification({
        type: 'error',
        action,
        title: options.errorTitle,
        message: errorMessage,
      });

      throw error;
    }
  }, [addNotification, updateNotification, dismissNotification]);

  return (
    <NotificationContext.Provider
      value={{
        addNotification,
        updateNotification,
        dismissNotification,
        showTransaction,
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification
              notification={notification}
              onDismiss={() => dismissNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

