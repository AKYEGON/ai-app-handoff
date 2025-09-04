import React from 'react';
import { toast as sonnerToast, Toaster } from 'sonner';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

// Production-optimized toast notifications
interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

const toastIcons = {
  default: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error: <XCircle className="w-5 h-5 text-red-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-orange-600" />,
  info: <Info className="w-5 h-5 text-blue-600" />
};

export const productionToast = {
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    sonnerToast.success(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      icon: toastIcons.success,
      className: 'border border-green-200 bg-green-50 text-green-900',
    });
  },

  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    sonnerToast.error(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      icon: toastIcons.error,
      className: 'border border-red-200 bg-red-50 text-red-900',
    });
  },

  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    sonnerToast.warning(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      icon: toastIcons.warning,
      className: 'border border-orange-200 bg-orange-50 text-orange-900',
    });
  },

  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => {
    sonnerToast.info(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      icon: toastIcons.info,
      className: 'border border-blue-200 bg-blue-50 text-blue-900',
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      duration: Infinity,
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  }
};

// Enhanced Toaster component with better mobile support
export const ProductionToaster: React.FC = () => {
  return (
    <Toaster 
      position="top-center"
      expand={false}
      richColors={false}
      closeButton={true}
      duration={3000}
      toastOptions={{
        className: 'rounded-xl border shadow-lg backdrop-blur-sm',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
        }
      }}
    />
  );
};