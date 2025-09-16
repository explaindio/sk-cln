import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <div>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const borderClass = toast.type === 'success' ? 'border-l-4 border-green-500' :
                             toast.type === 'error' ? 'border-l-4 border-red-500' :
                             toast.type === 'info' ? 'border-l-4 border-blue-500' :
                             toast.type === 'warning' ? 'border-l-4 border-yellow-500' : '';
          
          const textClass = toast.type === 'error' ? 'text-red-800' : 'text-gray-900';
          const messageClass = toast.type === 'error' ? 'text-red-700' : 'text-gray-500';

          return (
            <div
              key={toast.id}
              className={'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ' + borderClass}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className={'text-sm font-medium ' + textClass}>
                      {toast.title}
                    </p>
                    {toast.message && (
                      <p className={'mt-1 text-sm ' + messageClass}>
                        {toast.message}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => removeToast(toast.id)}
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}