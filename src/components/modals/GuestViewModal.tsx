import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Wrench, Flame } from 'lucide-react';
import { useChata } from '../../context/ChataContext';

interface GuestViewModalProps {
  onClose: () => void;
}

export const GuestViewModal: React.FC<GuestViewModalProps> = ({ onClose }) => {
  const { equipment, tasks, woodInventory, showToast } = useChata();
  const [selectedTopic, setSelectedTopic] = useState<'boiler' | 'garden' | 'general'>('boiler');
  const [copied, setCopied] = useState(false);

  const guestUrl = `${window.location.origin}/?guest_mode=${selectedTopic}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    showToast('Skopiowano link', 'Link dla serwisanta został skopiowany do schowka.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const boilerEq = equipment.find(e => e.room.toLowerCase().includes('kotłownia') || e.category.toLowerCase().includes('ogrzewanie'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/20 flex items-center justify-center text-[#D97706] font-bold">
            <Wrench className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-[#2D4F1E]">
              Tryb gościa i serwisanta
            </h3>
            <p className="text-xs text-[#78350F]/70">
              Udostępnij wybrane dane techniczne bez dostępu do finansów i notatek rodziny.
            </p>
          </div>
        </div>

        {/* Topic Selector */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'boiler', label: '🔥 Piec & Kotłownia' },
            { id: 'garden', label: '🌿 Ogród & Kosiarka' },
            { id: 'general', label: '🏡 Przegląd ogólny' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id as any)}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                selectedTopic === t.id
                  ? 'bg-[#2D4F1E] text-[#FDFCF0] border-[#2D4F1E]'
                  : 'bg-white text-[#78350F] border-[#78350F]/20 hover:bg-[#78350F]/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview of what technician sees */}
        <div className="bg-white border border-[#78350F]/15 rounded-2xl p-4 mb-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#78350F]/10">
            <span className="text-xs font-bold text-[#2D4F1E] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Podgląd karty technicznej (bezpieczny widok)
            </span>
            <span className="text-[10px] bg-[#D97706]/15 text-[#D97706] px-2 py-0.5 rounded font-mono">GOŚĆ</span>
          </div>

          {selectedTopic === 'boiler' && (
            <div className="space-y-2 text-xs text-[#2D4F1E]">
              <p><strong className="text-[#2D4F1E]">Urządzenie:</strong> {boilerEq?.name || 'Piec zasypowy Defro Optima 15kW'}</p>
              <p><strong className="text-[#2D4F1E]">Ostatni serwis / kominiarz:</strong> {boilerEq?.lastServiceDate || '2026-04-12'}</p>
              <p><strong className="text-[#2D4F1E]">Planowany przegląd:</strong> {boilerEq?.nextServiceDate || '2026-09-15'}</p>
              <p><strong className="text-[#2D4F1E]">Zapas drewna w drewutni:</strong> {woodInventory.estimatedM3} m³</p>
              <p className="bg-[#FDFCF0] p-2.5 rounded-xl border border-[#78350F]/15 text-[#78350F] italic">
                {boilerEq?.manualNotes || 'Wymagany coroczny przegląd przewodu dymowego przed sezonem grzewczym.'}
              </p>
            </div>
          )}

          {selectedTopic === 'garden' && (
            <div className="space-y-2 text-xs text-[#2D4F1E]">
              <p><strong className="text-[#2D4F1E]">Kosiarka:</strong> Stiga Combi 48 SQ (B&S 575 EXi)</p>
              <p><strong className="text-[#2D4F1E]">Olej silnikowy:</strong> SAE 30 (0.6L)</p>
              <p><strong className="text-[#2D4F1E]">Pilarka spalinowa:</strong> Stihl MS 181 (prowadnica 35cm)</p>
            </div>
          )}

          {selectedTopic === 'general' && (
            <div className="space-y-2 text-xs text-[#2D4F1E]">
              <p><strong className="text-[#2D4F1E]">Adres instalacji:</strong> Dom rodzinny z ogrodem</p>
              <p><strong className="text-[#2D4F1E]">Osoba kontaktowa:</strong> Kamil / Ilona</p>
            </div>
          )}
        </div>

        {/* Copy Link Bar */}
        <div className="bg-[#78350F]/5 border border-[#78350F]/15 rounded-xl p-2.5 flex items-center justify-between gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={guestUrl}
            className="bg-transparent text-xs text-[#78350F] font-mono w-full focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#78350F]/10 hover:bg-[#78350F]/20 text-[#78350F] rounded-xl text-xs font-bold transition-colors"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
};
