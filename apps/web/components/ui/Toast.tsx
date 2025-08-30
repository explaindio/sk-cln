'use client';

import { ReactNode } from 'react';
import { useToast } from '../../lib/toast';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'custom';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message?: string;
  component?: ReactNode;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 z-50">
      {toasts.map((toast: Toast) => {
        // If toast has a custom component, render it directly
        if (toast.component) {
          return (
            <div key={toast.id} className="relative">
              {toast.component}
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2 right-2 bg-black/20 hover:bg-black/30 rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          );
        }

        // Default toast rendering
        const Icon = icons[toast.type as keyof typeof icons];
        const colorClass = colors[toast.type as keyof typeof colors] || colors.info;

        return (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg border ${colorClass} max-w-sm`}
          >
            {Icon && <Icon className="h-5 w-5 mr-3 flex-shrink-0" />}
            <div className="flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm opacity-90">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}