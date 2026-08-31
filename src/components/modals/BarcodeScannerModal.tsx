import React, { useState, useRef, useEffect } from 'react';
import { X, Barcode, Plus, Camera, Receipt } from 'lucide-react';
import { useChata } from '../../context/ChataContext';
import { ScanReceiptModal } from './ScanReceiptModal';

interface BarcodeScannerModalProps {
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onClose }) => {
  const { addShoppingItem, showToast } = useChata();
  const [manualCode, setManualCode] = useState('');
  const [productName, setProductName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Try BarcodeDetector if available
        const AnyWindow = window as any;
        if ('BarcodeDetector' in AnyWindow) {
          const detector = new AnyWindow.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a'] });
          const detect = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              requestAnimationFrame(detect);
              return;
            }
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                setManualCode(code);
                showToast('Zeskanowano kod', code, 'success');
                stopScan();
                return;
              }
            } catch {}
            if (isScanning) requestAnimationFrame(detect);
          };
          detect();
        }
      }
    } catch {
      showToast('Brak kamery', 'Wpisz kod ręcznie', 'warning');
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => {
    return () => stopScan();
  }, []);

  const handleAdd = () => {
    const name = productName.trim() || `Produkt ${manualCode.slice(-4)}`;
    if (!name) return;
    // Try to guess category from name
    const lower = name.toLowerCase();
    let cat = 'Spożywcze';
    if (lower.includes('mleko') || lower.includes('ser') || lower.includes('jogurt')) cat = 'Nabiał';
    else if (lower.includes('chleb') || lower.includes('bułka')) cat = 'Pieczywo';
    addShoppingItem(name, cat);
    showToast('Dodano z kodu', `${name} (${manualCode || 'ręcznie'})`, 'success');
    onClose();
  };

  if (showReceiptScanner) {
    return (
      <ScanReceiptModal
        onClose={() => setShowReceiptScanner(false)}
        onReceiptParsed={() => onClose()}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl border border-[#78350F]/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[#D97706]" /> Skan kodu kreskowego
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#78350F]/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Whole-receipt scanner entry point */}
        <button
          onClick={() => { stopScan(); setShowReceiptScanner(true); }}
          className="w-full mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-left flex items-center gap-3 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-emerald-800">Skanuj cały paragon (AI)</span>
            <span className="block text-[11px] text-emerald-700/70">Rozpozna wszystkie pozycje i doda je do spiżarni</span>
          </span>
        </button>

        <div className="rounded-2xl overflow-hidden bg-zinc-900 aspect-[4/3] relative flex items-center justify-center">
          {isScanning ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-6">
              <Barcode className="w-12 h-12 text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-xs">Kliknij „Uruchom skaner” i skieruj kamerę na kod</p>
            </div>
          )}
          <div className="absolute inset-0 border-2 border-white/20 pointer-events-none m-4 rounded-xl" />
        </div>

        <div className="flex gap-2 mt-3">
          {!isScanning ? (
            <button onClick={startScan} className="flex-1 py-2.5 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <Camera className="w-4 h-4" /> Uruchom skaner
            </button>
          ) : (
            <button onClick={stopScan} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold">
              Zatrzymaj
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <input
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            placeholder="Kod kreskowy (np. 5901234123457)"
            className="w-full px-3 py-2 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-mono"
          />
          <input
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="Nazwa produktu (np. Mleko 1L)"
            className="w-full px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs"
          />
          <button onClick={handleAdd} className="w-full py-2.5 bg-[#D97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Dodaj do listy zakupów
          </button>
          <p className="text-[10px] text-[#78350F]/50 text-center">Kategoria dobierana automatycznie • działa też ręcznie bez kamery</p>
        </div>
      </div>
    </div>
  );
};
