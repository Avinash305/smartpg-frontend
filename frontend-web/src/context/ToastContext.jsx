import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ToastContext = createContext(null);

// Simple event bus so non-React modules (e.g., axios interceptors) can trigger toasts
export const toastBus = typeof window !== 'undefined' && window.EventTarget ? new EventTarget() : null;
export const emitToast = ({ message, type = 'info', duration = 5000 }) => {
  try {
    if (!toastBus) return;
    const evt = new CustomEvent('toast', { detail: { message, type, duration } });
    toastBus.dispatchEvent(evt);
  } catch (_) {
    // no-op
  }
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    const id = uuidv4();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Listen to global toast bus
  useEffect(() => {
    if (!toastBus) return;
    const handler = (e) => {
      const { message, type, duration } = e.detail || {};
      if (message) addToast({ message, type, duration });
    };
    toastBus.addEventListener('toast', handler);
    return () => toastBus.removeEventListener('toast', handler);
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Component
export const Toast = () => {
  const { toasts, removeToast } = useToast();

  const getToastStyles = (type) => {
    const baseStyles = 'p-4 rounded-lg shadow-lg mb-2 flex justify-between items-center';
    const typeStyles = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
    };
    return `${baseStyles} ${typeStyles[type] || typeStyles.info}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {toasts.map((toast) => (
        <div key={toast.id} className={getToastStyles(toast.type)}>
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
