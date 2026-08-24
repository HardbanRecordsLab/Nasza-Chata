import React from 'react';
import { useChata } from '../context/ChataContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useChata();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2">
      {toasts.map(t => {
        let icon = <Info className="w-5 h-5 text-[#2D4F1E]" />;
        let borderClass = 'border-[#78350F]/20 bg-[#FDFCF0] text-[#2D4F1E]';

        if (t.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-[#2D4F1E]" />;
          borderClass = 'border-[#2D4F1E]/30 bg-[#FDFCF0] text-[#2D4F1E]';
        } else if (t.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-red-600" />;
          borderClass = 'border-red-300 bg-[#FDFCF0] text-red-950';
        } else if (t.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-[#D97706]" />;
          borderClass = 'border-[#D97706]/40 bg-[#FDFCF0] text-[#78350F]';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-200 ${borderClass}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-display font-bold leading-tight">{t.title}</h5>
              {t.message && <p className="text-xs opacity-85 mt-0.5 leading-snug">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
