import React, { useState, useRef, useEffect } from 'react';
import { useChata } from '../../context/ChataContext';
import { compressImage } from '../../utils/imageCompression';
import { X, Camera, Sparkles, Receipt, Loader2, Check, Upload, ImageOff } from 'lucide-react';

interface ScanReceiptModalProps {
  onClose: () => void;
  onReceiptParsed: (total: number, itemsCount: number, merchant: string) => void;
}

interface ParsedItem {
  name: string;
  quantity?: string;
  unit?: string;
  price?: number;
  category?: string;
  selected: boolean;
}

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({ onClose, onReceiptParsed }) => {
  const {
    showToast,
    addExpense,
    addPantryItem,
    updatePantryItem,
    pantryItems,
    shoppingItems,
    toggleShoppingItem,
    budgetLimits,
    currentProfile,
  } = useChata();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [cameraError, setCameraError] = useState(false);

  const startCamera = async () => {
    setCameraError(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.warn('Camera unavailable, using upload fallback:', error);
      setCameraError(true);
      showToast('Brak dostępu do kamery', 'Wgraj zdjęcie paragonu z galerii.', 'warning');
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
    if (!videoRef.current || !videoRef.current.videoWidth) {
      showToast('Kamera nie jest gotowa', 'Poczekaj chwilę albo wgraj zdjęcie z galerii.', 'warning');
      return;
    }
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

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    stopCamera();
    const dataUrl = await compressImage(file, 1600, 0.85);
    setPhoto(dataUrl);
    processReceipt(dataUrl);
  };

  const processReceipt = async (dataUrl: string) => {
    setIsProcessing(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/ai?action=scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mode: 'receipt' }),
      });

      if (!res.ok) {
        throw new Error(`Serwer zwrócił błąd: ${res.status}`);
      }

      const data = await res.json();

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const result = {
        total: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
        itemsCount: rawItems.length || data.itemsCount || 1,
        merchant: data.note || data.merchant || 'Nieznany sklep',
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category || 'Spożywcze & Dom',
        items: rawItems,
      };

      setScanResult(result);
      setItems(
        rawItems.map((it: any): ParsedItem => ({
          name: it.name || 'Produkt',
          quantity: it.quantity ? String(it.quantity) : '1 szt.',
          unit: it.unit || undefined,
          price: typeof it.price === 'number' ? it.price : parseFloat(it.price) || undefined,
          category: it.category || result.category,
          selected: true,
        }))
      );
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

  const toggleItem = (idx: number) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)));

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

    // Spiżarnia — dopisz wybrane pozycje. Jeśli produkt już jest, doklej ilość zamiast duplikować.
    const chosen = items.filter(it => it.selected);
    let added = 0;
    let merged = 0;
    chosen.forEach(it => {
      const existing = pantryItems.find(
        p => p.name.trim().toLowerCase() === it.name.trim().toLowerCase()
      );
      if (existing) {
        const combined = [existing.quantity, it.quantity].filter(Boolean).join(' + ');
        updatePantryItem(existing.id, { quantity: combined || existing.quantity });
        merged++;
      } else {
        addPantryItem({
          name: it.name,
          category: it.category || scanResult.category || 'Spożywcze',
          quantity: it.quantity || '1 szt.',
          unit: it.unit || 'szt.',
          lowThreshold: 1,
          expiryDate: undefined,
        });
        added++;
      }
    });

    // Odhacz na liście zakupów pozycje, które pojawiły się na paragonie
    let checkedOff = 0;
    chosen.forEach(it => {
      const match = shoppingItems.find(
        s => !s.isBought &&
          (s.name.trim().toLowerCase().includes(it.name.trim().toLowerCase()) ||
           it.name.trim().toLowerCase().includes(s.name.trim().toLowerCase()))
      );
      if (match) { toggleShoppingItem(match.id); checkedOff++; }
    });

    if (chosen.length > 0) {
      const parts = [
        added ? `${added} nowych` : '',
        merged ? `${merged} zaktualizowanych` : '',
      ].filter(Boolean).join(', ');
      showToast('Spiżarnia zaktualizowana', `${parts || chosen.length + ' pozycji'} z paragonu`, 'success');
    }
    if (checkedOff > 0) {
      showToast('Lista zakupów', `Odhaczono ${checkedOff} pozycji jako kupione`, 'info');
    }

    // Limity budżetowe — sprawdź po zapisie
    const limit = budgetLimits[scanResult.category || 'Spożywcze & Dom'];
    if (limit) {
      showToast('Limit budżetowy', `Kategoria ${scanResult.category}: limit ${limit.limit} zł`, 'info');
    }

    onReceiptParsed(scanResult.total, scanResult.itemsCount, scanResult.merchant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />

      <div className="p-4 flex items-center justify-between bg-black/50 absolute top-0 left-0 right-0 z-10">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          Skaner Paragonów
        </h3>
        <div className="flex items-center gap-2">
          {!photo && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-white text-xs font-bold flex items-center gap-1.5"
              title="Wgraj zdjęcie paragonu z galerii"
            >
              <Upload className="w-3.5 h-3.5" /> Galeria
            </button>
          )}
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
        {!photo && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {photo && (
          <img src={photo} alt="Scanned receipt" className="absolute inset-0 w-full h-full object-contain opacity-50" />
        )}

        {!photo && !cameraError && (
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

        {!photo && cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <ImageOff className="w-12 h-12 text-white/40 mb-3" />
            <h4 className="text-white font-bold text-base mb-1">Kamera niedostępna</h4>
            <p className="text-white/60 text-sm max-w-[280px] mb-4">Zrób zdjęcie paragonu telefonem i wgraj je z galerii.</p>
            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4" /> Wgraj zdjęcie paragonu
            </button>
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
          <div className="absolute inset-x-3 bottom-4 top-16 bg-white rounded-3xl p-5 shadow-2xl z-20 animate-in slide-in-from-bottom-8 flex flex-col">
            <div className="text-center mb-3 shrink-0">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Paragon rozpoznany</h3>
              <p className="text-zinc-500 text-xs">{scanResult.merchant} • {scanResult.date}</p>
            </div>

            {/* Selectable items → pantry */}
            <div className="flex-1 min-h-0 flex flex-col bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden mb-3">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 shrink-0">
                <span className="text-xs font-bold text-zinc-600">
                  Pozycje → Spiżarnia ({items.filter(i => i.selected).length}/{items.length})
                </span>
                {items.length > 0 && (
                  <button
                    onClick={() => {
                      const allOn = items.every(i => i.selected);
                      setItems(prev => prev.map(i => ({ ...i, selected: !allOn })));
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    {items.every(i => i.selected) ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {items.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">
                    AI nie wyodrębniło pozycji. Zapiszesz sam wydatek.
                  </p>
                ) : (
                  items.map((it, i) => (
                    <button
                      key={i}
                      onClick={() => toggleItem(i)}
                      className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                        it.selected ? 'bg-white border-emerald-300' : 'bg-zinc-100 border-transparent opacity-60'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${it.selected ? 'bg-emerald-500 text-white' : 'border border-zinc-300'}`}>
                        {it.selected && <Check className="w-3 h-3" />}
                      </span>
                      <span className="flex-1 min-w-0 truncate">
                        {it.name} {it.quantity && <span className="text-zinc-400">({it.quantity})</span>}
                      </span>
                      {typeof it.price === 'number' && (
                        <span className="font-bold text-zinc-600 shrink-0">{it.price.toFixed(2)} zł</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-500 font-medium">Suma</span>
                <span className="font-extrabold text-xl text-emerald-600">{scanResult.total.toFixed(2)} zł</span>
              </div>
              {budgetLimits[scanResult.category] && (
                <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-lg mb-2">
                  Limit {scanResult.category}: {budgetLimits[scanResult.category].limit} zł/mies.
                </div>
              )}
              <button
                onClick={handleSaveExpense}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <Receipt className="w-5 h-5" />
                Zapisz wydatek{items.filter(i => i.selected).length > 0 ? ` + ${items.filter(i => i.selected).length} do spiżarni` : ''}
              </button>
            </div>
          </div>
        )}
      </div>

      {!photo && !cameraError && (
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
