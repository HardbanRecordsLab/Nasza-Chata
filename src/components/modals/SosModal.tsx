import React, { useState } from 'react';
import { AlertTriangle, Camera, X, Check, Flame, Wrench } from 'lucide-react';
import { useChata } from '../../context/ChataContext';

interface SosModalProps {
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ onClose }) => {
  const { currentProfile, createSosAlert, showToast } = useChata();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'critical' | 'high' | 'medium'>('high');
  const [room, setRoom] = useState('Kotłownia');
  const [photoUrl, setPhotoUrl] = useState('');

  const roomsList = [
    'Kotłownia (Piec)',
    'Ogród / Drewutnia',
    'Kuchnia',
    'Łazienka',
    'Ganek / Drzwi',
    'Dach / Rynny',
    'Instalacja wodna / Prąd',
    'Inne',
  ];

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Wpisz tytuł awarii', 'Podaj krótki opis problemu.', 'warning');
      return;
    }

    createSosAlert({
      title: title.trim(),
      description: description.trim(),
      urgency,
      room,
      reportedById: currentProfile.id,
      reportedByName: currentProfile.name,
      photoUrl: photoUrl || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border-2 border-red-300 rounded-[32px] p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 text-2xl font-bold animate-pulse">
            🚨
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-red-900">
              Tryb SOS — Coś się zepsuło!
            </h3>
            <p className="text-xs text-[#78350F]/70">
              Zgłoś pilną usterkę lub awarię w domu. Zostanie przypięta na samej górze.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Co się stało? <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="np. Piec wygasł / Wyciek z zaworu / Kosiarka nie odpala"
              className="w-full px-3.5 py-2.5 bg-white border border-red-200 rounded-xl text-sm text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#78350F] mb-1">
                Miejsce / Pomieszczenie:
              </label>
              <select
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs text-[#2D4F1E] font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {roomsList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78350F] mb-1">
                Priorytet pilności:
              </label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="critical">🔴 KRYTYCZNY (Zimno/Zalanie)</option>
                <option value="high">🟠 WYSOKI (Pilne dziś)</option>
                <option value="medium">🟡 ŚREDNI (Do naprawy)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Szczegóły / Co trzeba zrobić:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="np. Trzeba kupić nową uszczelkę 1/2 cala w markecie i odpowietrzyć grzejnik na piętrze..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Photo attachment */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Zdjęcie usterki (opcjonalne):
            </label>
            {photoUrl ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-red-300">
                <img src={photoUrl} alt="Usterka" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-red-200 hover:border-red-400 bg-red-50/30 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-red-800 text-xs font-semibold">
                <Camera className="w-4 h-4" />
                <span>Zrób zdjęcie usterki aparatem</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[#78350F]/20 text-[#78350F] font-semibold text-xs hover:bg-[#78350F]/10 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
            >
              <AlertTriangle className="w-4 h-4" />
              Wyślij alert SOS do rodziny
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
