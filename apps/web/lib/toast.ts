import { ReactNode } from 'react';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'custom';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message?: string;
  component?: ReactNode;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Date.now().toString();
    const duration = toast.duration || 5000; // Default to 5 seconds

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto remove after specified duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));