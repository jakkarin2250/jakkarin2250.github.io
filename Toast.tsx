
import React from 'react';
import { useToast } from '../context/ToastContext';
import { X, CheckCircle2, AlertCircle, Trash2, Sparkles } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-sm p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-right-full fade-in
            ${toast.type === 'success' ? 'bg-white/95 border-green-100' : 'bg-white/95 border-red-100'}
          `}
        >
          {/* Icon */}
          <div className={`mt-0.5 p-2 rounded-full ${toast.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {toast.type === 'success' ? (
                toast.title.includes('ลบ') ? <Trash2 className="w-5 h-5" /> : 
                toast.title.includes('อัปเดต') || toast.title.includes('แก้ไข') ? <Sparkles className="w-5 h-5" /> :
                <CheckCircle2 className="w-5 h-5" />
            ) : (
                <AlertCircle className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h4 className={`text-sm font-bold ${toast.type === 'success' ? 'text-gray-800' : 'text-red-800'}`}>
              {toast.title}
            </h4>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
