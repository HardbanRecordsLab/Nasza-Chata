import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { Lock, X, Check } from 'lucide-react';

export const PinModal: React.FC = () => {
  const { isPinModalOpen, pendingProfile, verifyAndSetProfile, cancelProfileSwitch } = useChata();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isPinModalOpen || !pendingProfile) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        const success = verifyAndSetProfile(nextPin);
        if (!success) {
          setError(true);
          setTimeout(() => setPin(''), 600);
        } else {
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-xs shadow-2xl text-center relative">
        <button
          onClick={cancelProfileSwitch}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
          title="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl shadow-inner ring-2 ring-[#78350F]/10" style={{ backgroundColor: `${pendingProfile.colorHex}20` }}>
          {pendingProfile.avatar}
        </div>

        <h3 className="text-xl font-display font-bold text-[#2D4F1E]">
          Wpisz PIN: {pendingProfile.name}
        </h3>
        <p className="text-xs text-[#78350F]/70 mt-1 mb-5">
          Podaj 4-cyfrowy kod, aby przełączyć się na ten profil.
        </p>

        {/* PIN Dots Indicator */}
        <div className={`flex justify-center gap-3 mb-6 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                idx < pin.length
                  ? 'bg-[#2D4F1E] border-[#2D4F1E] scale-110'
                  : 'border-[#78350F]/25 bg-white'
              } ${error ? 'border-red-500 bg-red-100' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 font-semibold mb-3">
            Nieprawidłowy PIN. Spróbuj ponownie.
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="w-16 h-14 rounded-2xl bg-white hover:bg-[#78350F]/5 active:bg-[#78350F]/10 border border-[#78350F]/15 text-xl font-bold font-mono text-[#2D4F1E] shadow-xs flex items-center justify-center transition-transform active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="w-16 h-14 rounded-2xl bg-[#78350F]/10 hover:bg-[#78350F]/15 text-xs font-semibold text-[#78350F] flex items-center justify-center transition-transform active:scale-95"
          >
            Wyczyść
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-14 rounded-2xl bg-white hover:bg-[#78350F]/5 active:bg-[#78350F]/10 border border-[#78350F]/15 text-xl font-bold font-mono text-[#2D4F1E] shadow-xs flex items-center justify-center transition-transform active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-14 rounded-2xl bg-[#78350F]/10 hover:bg-[#78350F]/15 text-[#78350F] flex items-center justify-center transition-transform active:scale-95 text-lg"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};
