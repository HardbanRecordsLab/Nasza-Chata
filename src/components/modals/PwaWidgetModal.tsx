import React, { useState, useEffect } from 'react';
import { useChata } from '../../context/ChataContext';
import { HomeScreenWidget } from '../widgets/HomeScreenWidget';
import {
  Smartphone,
  Download,
  Share2,
  Check,
  X,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  Monitor,
  Apple,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface PwaWidgetModalProps {
  onClose: () => void;
  onOpenAddTask?: () => void;
  onOpenSos?: () => void;
}

export const PwaWidgetModal: React.FC<PwaWidgetModalProps> = ({
  onClose,
  onOpenAddTask,
  onOpenSos,
}) => {
  const { showToast } = useChata();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<'preview' | 'ios' | 'android' | 'desktop'>('preview');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture PWA install prompt if available
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Instalacja rozpoczęta!', 'Nasza Chata zostanie dodana do Twojego ekranu głównego.', 'success');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Direct user to instructions tab
      setActiveDeviceTab('android');
      showToast('Wskazówki instalacji', 'Wybierz system operacyjny swojego telefonu.', 'info');
    }
  };

  const handleCopyWidgetUrl = () => {
    const url = window.location.origin + '/?widget=today';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Skopiowano link widżetu!', 'Możesz przypiąć ten URL jako skrót lub widżet.', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-xl shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
          title="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 text-[#D97706] flex items-center justify-center shadow-xs">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-display font-bold text-[#2D4F1E]">
                Widżet na pulpit & Ekran główny
              </h3>
              <span className="text-[10px] bg-[#2D4F1E] text-[#FDFCF0] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                PWA Widget
              </span>
            </div>
            <p className="text-xs text-[#78350F]/70">
              Dzisiejsze zadania i stan drewutni zawsze pod ręką bez otwierania przeglądarki.
            </p>
          </div>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex bg-[#78350F]/10 p-1 rounded-2xl mb-5 text-xs font-bold text-[#78350F]">
          <button
            onClick={() => setActiveDeviceTab('preview')}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeDeviceTab === 'preview'
                ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                : 'hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Podgląd widżetu</span>
          </button>

          <button
            onClick={() => setActiveDeviceTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeDeviceTab === 'ios'
                ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                : 'hover:bg-white/60'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>

          <button
            onClick={() => setActiveDeviceTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeDeviceTab === 'android'
                ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                : 'hover:bg-white/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>

          <button
            onClick={() => setActiveDeviceTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeDeviceTab === 'desktop'
                ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                : 'hover:bg-white/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Komputer</span>
          </button>
        </div>

        {/* TAB 1: INTERACTIVE WIDGET PREVIEW */}
        {activeDeviceTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-[#78350F]/5 rounded-3xl p-3 border border-[#78350F]/15">
              <HomeScreenWidget
                onOpenAddTask={onOpenAddTask}
                onOpenSos={onOpenSos}
                onOpenApp={onClose}
              />
            </div>

            {/* Quick Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleInstallClick}
                className="py-3 px-4 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalled ? 'Zainstalowano w systemie ✓' : 'Zainstaluj na telefonie / PC'}</span>
              </button>

              <button
                onClick={handleCopyWidgetUrl}
                className="py-3 px-4 bg-white hover:bg-[#78350F]/10 border border-[#78350F]/20 text-[#78350F] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#2D4F1E]" /> : <Share2 className="w-4 h-4 text-[#D97706]" />}
                <span>{copiedLink ? 'Skopiowano link widżetu!' : 'Kopiuj link widżetu'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: IOS SAFARI INSTRUCTIONS */}
        {activeDeviceTab === 'ios' && (
          <div className="bg-white rounded-3xl p-5 border border-[#78350F]/15 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#78350F]/10">
              <Apple className="w-5 h-5 text-[#2D4F1E]" />
              <h4 className="text-sm font-bold text-[#2D4F1E]">
                Jak dodać widżet Naszej Chaty na iPhone / iPad (iOS):
              </h4>
            </div>

            <ol className="space-y-3 text-xs text-[#2D4F1E] list-decimal list-inside font-medium">
              <li className="leading-relaxed">
                Otwórz aplikację w przeglądarce <strong>Safari</strong> na swoim iPhone.
              </li>
              <li className="leading-relaxed">
                Stuknij ikonę udostępniania <strong>⎋ (Kwadrat ze strzałką w górę)</strong> na dolnym pasku Safari.
              </li>
              <li className="leading-relaxed">
                Przewiń w dół i wybierz opcję <strong>„Do ekranu początkowego” (Add to Home Screen ⊞)</strong>.
              </li>
              <li className="leading-relaxed">
                Kliknij <strong>„Dodaj”</strong> w prawym górnym rogu. Ikona Chaty pojawi się na Twoim pulpicie jak natywna aplikacja!
              </li>
            </ol>

            <div className="bg-[#FDFCF0] p-3 rounded-2xl border border-[#78350F]/15 flex items-center gap-2.5 text-xs text-[#78350F]">
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>Działa offline i otwiera się natychmiast w pełnym oknie bez pasków przeglądarki!</span>
            </div>
          </div>
        )}

        {/* TAB 3: ANDROID CHROME INSTRUCTIONS */}
        {activeDeviceTab === 'android' && (
          <div className="bg-white rounded-3xl p-5 border border-[#78350F]/15 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#78350F]/10">
              <Smartphone className="w-5 h-5 text-[#2D4F1E]" />
              <h4 className="text-sm font-bold text-[#2D4F1E]">
                Jak dodać widżet Naszej Chaty na Android (Chrome / Edge / Samsung):
              </h4>
            </div>

            <ol className="space-y-3 text-xs text-[#2D4F1E] list-decimal list-inside font-medium">
              <li className="leading-relaxed">
                W przeglądarce <strong>Chrome</strong> stuknij menu <strong>⋮ (trzy kropki)</strong> w prawym górnym rogu.
              </li>
              <li className="leading-relaxed">
                Wybierz <strong>„Zainstaluj aplikację”</strong> lub <strong>„Dodaj do ekranu głównego”</strong>.
              </li>
              <li className="leading-relaxed">
                Zatwierdź instalację. Możesz również przytrzymać palec na pulpicie i dodać widżet systemowy PWA!
              </li>
            </ol>

            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-[#2D4F1E] text-[#FDFCF0] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-[#1f3715]"
              >
                <Download className="w-4 h-4" />
                <span>Zainstaluj teraz automatycznie</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 4: DESKTOP INSTRUCTIONS */}
        {activeDeviceTab === 'desktop' && (
          <div className="bg-white rounded-3xl p-5 border border-[#78350F]/15 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#78350F]/10">
              <Monitor className="w-5 h-5 text-[#2D4F1E]" />
              <h4 className="text-sm font-bold text-[#2D4F1E]">
                Widżet na Windows & macOS (Pulpit / Pasek zadań):
              </h4>
            </div>

            <p className="text-xs text-[#2D4F1E] font-medium leading-relaxed">
              W przeglądarce Chrome lub Edge kliknij ikonę <strong>Instaluj ⊕</strong> na pasku adresu po prawej stronie. Nasza Chata zostanie zainstalowana jako osobne okno aplikacji, które możesz przypiąć do paska zadań Windows lub Docka na Macu.
            </p>

            <div className="pt-2">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-[#2D4F1E] text-[#FDFCF0] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-[#1f3715]"
              >
                <Download className="w-4 h-4" />
                <span>Zainstaluj aplikację na komputerze</span>
              </button>
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-[#78350F]/20 text-[#78350F] font-bold text-xs hover:bg-[#78350F]/10 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
