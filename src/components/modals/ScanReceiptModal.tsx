import React, { useState, useRef, useEffect } from 'react';
import { useChata } from '../../context/ChataContext';
import { X, Camera, Sparkles, Receipt, Loader2, Check } from 'lucide-react';

interface ScanReceiptModalProps {
  onClose: () => void;
  onReceiptParsed: (total: number, itemsCount: number, merchant: string) => void;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({ onClose, onReceiptParsed }) => {
  const { showToast, addExpense, currentProfile } = useChata();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('Błąd kamery', 'Nie udało się uruchomić aparatu', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
    processReceipt(dataUrl);
  };

  const processReceipt = async (dataUrl: string) => {
    setIsProcessing(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/ai?action=scan-handwritten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mode: 'receipt' }),
      });

      if (!res.ok) {
        throw new Error(`Serwer zwrócił błąd: ${res.status}`);
      }

      const data = await res.json();

      const result = {
        total: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
        itemsCount: data.itemsCount || 1,
        merchant: data.note || data.merchant || 'Nieznany sklep',
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category || 'Spożywcze & Dom',
      };

      setScanResult(result);
    } catch (err: any) {
      console.error('Receipt scan error:', err);
      showToast(
        'Błąd skanowania',
        err.message || 'Nie udało się przeanalizować paragonu. Spróbuj ponownie.',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveExpense = () => {
    if (!scanResult) return;

    addExpense({
      amount: scanResult.total,
      note: `Zakupy ${scanResult.merchant} (Zeskanowano Paragon)`,
      category: scanResult.category || 'Spożywcze & Dom',
      date: scanResult.date || new Date().toISOString().split('T')[0],
      boughtById: currentProfile.id,
      boughtByName: currentProfile.name,
    });
    onReceiptParsed(scanResult.total, scanResult.itemsCount, scanResult.merchant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in">
      <div className="p-4 flex items-center justify-between bg-black/50 absolute top-0 left-0 right-0 z-10">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          Skaner Paragonów
        </h3>
        <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
        {!photo && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {photo && (
          <img src={photo} alt="Scanned receipt" className="absolute inset-0 w-full h-full object-contain opacity-50" />
        )}

        {!photo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[70%] border-2 border-white/40 border-dashed rounded-xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
            </div>
            <p className="absolute bottom-[10%] text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full">
              Wyrównaj paragon w ramce
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-20">
            <Sparkles className="w-12 h-12 text-emerald-400 animate-pulse mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Analiza Paragonu AI...</h3>
            <p className="text-emerald-400/80 text-sm">Rozpoznawanie kwoty i produktów</p>
          </div>
        )}

        {scanResult && !isProcessing && (
          <div className="absolute inset-x-4 bottom-8 bg-white rounded-3xl p-6 shadow-2xl z-20 animate-in slide-in-from-bottom-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-inner">
              <Check className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-center text-zinc-900 mb-1">Paragon Przetworzony!</h3>
            <p className="text-center text-zinc-500 text-sm mb-6">Sztuczna inteligencja odczytała dane.</p>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 mb-6 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-200 border-dashed">
                <span className="text-zinc-500 font-medium">Sklep</span>
                <span className="font-bold text-zinc-900">{scanResult.merchant}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-200 border-dashed">
                <span className="text-zinc-500 font-medium">Produkty</span>
                <span className="font-bold text-zinc-900">{scanResult.itemsCount} szt.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium text-lg">Suma całkowita</span>
                <span className="font-extrabold text-2xl text-emerald-600">{scanResult.total.toFixed(2)} zł</span>
              </div>
            </div>

            <button
              onClick={handleSaveExpense}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Zapisz jako wydatek
            </button>
          </div>
        )}
      </div>

      {!photo && (
        <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={takePhoto}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-zinc-300 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-dashed animate-[spin_10s_linear_infinite]" />
            <Camera className="w-8 h-8 text-emerald-600 absolute" />
          </button>
        </div>
      )}
    </div>
  );
};
