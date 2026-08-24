import React, { useState } from 'react';
import { Camera, Video, X, Check, Eye, Trash2, ArrowLeftRight } from 'lucide-react';
import { TaskDefinition, TaskOccurrence } from '../../types';
import { useChata } from '../../context/ChataContext';

interface ProofModalProps {
  occurrence: TaskOccurrence;
  onClose: () => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({ occurrence, onClose }) => {
  const { currentProfile, toggleTaskCompletion, showToast } = useChata();
  const [beforeUrl, setBeforeUrl] = useState<string>(occurrence.completion?.proofBeforeUrl || '');
  const [afterUrl, setAfterUrl] = useState<string>(occurrence.completion?.proofAfterUrl || '');
  const [proofType, setProofType] = useState<'photo' | 'video'>(occurrence.completion?.proofType || 'photo');
  const [note, setNote] = useState<string>(occurrence.completion?.proofNote || '');
  const [sliderPos, setSliderPos] = useState(50);
  const [isComparing, setIsComparing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (15MB)
    if (file.size > 15 * 1024 * 1024) {
      showToast('Plik za duży', 'Maksymalny rozmiar zdjęcia/wideo to 15MB.', 'error');
      return;
    }

    const isVid = file.type.startsWith('video');
    if (isVid) setProofType('video');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'before') {
        setBeforeUrl(result);
      } else {
        setAfterUrl(result);
      }
      showToast('Wczytano dowód', `Dodano plik ${target === 'before' ? 'PRZED' : 'PO'}.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndComplete = () => {
    toggleTaskCompletion(occurrence.task.id, new Date(occurrence.date), {
      beforeUrl,
      afterUrl,
      type: proofType,
      note,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/20 flex items-center justify-center text-[#D97706] font-bold">
            📸
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-[#2D4F1E]">
              Dowód wykonania — {occurrence.task.name}
            </h3>
            <p className="text-xs text-[#78350F]/70">
              Zdjęcie lub wideo z aparatu telefonu (opcjonalne).
            </p>
          </div>
        </div>

        {/* Side-by-Side Upload Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* PRZED */}
          <div className="bg-white border-2 border-dashed border-[#78350F]/20 rounded-2xl p-3 text-center flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden group">
            {beforeUrl ? (
              <div className="w-full h-full relative">
                {proofType === 'video' && beforeUrl.startsWith('data:video') ? (
                  <video src={beforeUrl} controls className="w-full h-36 object-cover rounded-xl" />
                ) : (
                  <img src={beforeUrl} alt="Przed" className="w-full h-36 object-cover rounded-xl shadow-xs" />
                )}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  PRZED
                </div>
                <button
                  onClick={() => setBeforeUrl('')}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"
                  title="Usuń"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2 hover:bg-[#78350F]/5 transition-colors rounded-xl">
                <Camera className="w-7 h-7 text-[#78350F]/40 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[#78350F] uppercase tracking-wide">Dodaj: PRZED</span>
                <span className="text-[10px] text-[#78350F]/50 mt-1">Aparat / Galeria</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => handleFileUpload(e, 'before')}
                />
              </label>
            )}
          </div>

          {/* PO */}
          <div className="bg-white border-2 border-dashed border-[#2D4F1E]/30 rounded-2xl p-3 text-center flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden group">
            {afterUrl ? (
              <div className="w-full h-full relative">
                {proofType === 'video' && afterUrl.startsWith('data:video') ? (
                  <video src={afterUrl} controls className="w-full h-36 object-cover rounded-xl" />
                ) : (
                  <img src={afterUrl} alt="Po" className="w-full h-36 object-cover rounded-xl shadow-xs" />
                )}
                <div className="absolute top-1 left-1 bg-[#2D4F1E] text-[#FDFCF0] text-[10px] font-bold px-2 py-0.5 rounded-md">
                  PO
                </div>
                <button
                  onClick={() => setAfterUrl('')}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"
                  title="Usuń"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2 hover:bg-[#2D4F1E]/5 transition-colors rounded-xl">
                <Camera className="w-7 h-7 text-[#2D4F1E] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-[#2D4F1E] uppercase tracking-wide">Dodaj: PO</span>
                <span className="text-[10px] text-[#2D4F1E]/70 mt-1">Aparat / Galeria</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => handleFileUpload(e, 'after')}
                />
              </label>
            )}
          </div>
        </div>

        {/* Interactive Comparison Slider if both photos present */}
        {beforeUrl && afterUrl && proofType === 'photo' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#78350F] flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#D97706]" />
                Porównanie przed / po:
              </span>
              <span className="text-[11px] text-[#78350F]/70 font-mono">
                {sliderPos}% Po
              </span>
            </div>
            <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-inner border border-[#78350F]/20 select-none">
              <img src={afterUrl} alt="Po" className="absolute inset-0 w-full h-full object-cover" />
              <div
                className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-xl"
                style={{ width: `${100 - sliderPos}%` }}
              >
                <img src={beforeUrl} alt="Przed" className="absolute inset-0 w-full h-full object-cover max-w-none" />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  PRZED
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-[#2D4F1E] text-[#FDFCF0] text-[10px] font-bold px-2 py-0.5 rounded">
                PO
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={e => setSliderPos(Number(e.target.value))}
              className="w-full mt-2 accent-[#2D4F1E] cursor-pointer"
            />
          </div>
        )}

        {/* Optional note */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#78350F] mb-1">
            Komentarz do wykonania (opcjonalny):
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="np. Skoszona część przy grządkach, noże wyczyszczone..."
            className="w-full px-3.5 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/30"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-[#78350F]/20 text-[#78350F] font-semibold text-xs hover:bg-[#78350F]/10 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSaveAndComplete}
            className="flex-2 py-3 px-4 rounded-xl bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            Zapisz dowód i odhacz
          </button>
        </div>
      </div>
    </div>
  );
};
