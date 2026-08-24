import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  X,
  Loader2,
  FileText,
  Trash2,
  Plus,
  Clock,
  MapPin,
  Flame,
  CloudSun,
  User,
  AlertCircle,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';
import { useChata } from '../../context/ChataContext';
import { ScannedTaskProposal, TaskCategory, FrequencyType } from '../../types';
import { getTaskIcon } from '../icons/CustomChataIcons';
import confetti from 'canvas-confetti';

interface ScanHandwrittenModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_SHEETS = [
  {
    id: 'sample-weekend',
    title: '📝 Odręczna lista: Porządki na weekend',
    subtitle: 'Kotłownia, ogród, kosiarka, kuchnia i pokój',
    description: 'Typowa kartka z lodówki z podziałem prac na Kamila, Ilonę i Olivię.',
  },
  {
    id: 'sample-spring',
    title: '🌱 Odręczna lista: Przygotowanie ogrodu i drewutni',
    subtitle: 'Rąbanie drewna, szklarnia, rynny, trawnik',
    description: 'Wiosenno-jesienna lista prac sezonowych wokół domu jednorodzinnego.',
  },
];

export const ScanHandwrittenModal: React.FC<ScanHandwrittenModalProps> = ({ onClose, onSuccess }) => {
  const { profiles, addTask, showToast } = useChata();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('');
  const [proposals, setProposals] = useState<ScannedTaskProposal[]>([]);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [rawTranscription, setRawTranscription] = useState<string>('');
  const [showTranscription, setShowTranscription] = useState(false);
  const [isAiPowered, setIsAiPowered] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Trigger analysis via backend API route
  const analyzeImage = async (base64Data: string) => {
    setImagePreview(base64Data);
    setIsAnalyzing(true);
    setAnalyzingStep('Odczytywanie pisma odręcznego (Model Wizyjny)...');

    const stepTimer1 = setTimeout(() => {
      setAnalyzingStep('Dopasowywanie stref Chaty, pieca i drewutni...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setAnalyzingStep('Kategoryzacja zadań i przypisywanie domowników...');
    }, 2400);

    try {
      const familyProfilesList = profiles.map(p => `${p.name} (${p.roleTitle || 'Domownik'})`);

      const response = await fetch('/api/ai?action=scan-chores-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          familyProfiles: familyProfilesList,
          houseContext: 'Dom jednorodzinny z kotłownią, drewutnią, piecem CO i ogrodem.',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd analizy obrazu.');
      }

      setNoteTitle(data.noteTitle || 'Rozpoznana lista zadań');
      setSummary(data.summary || 'Wykryto zadania z odręcznej notatki.');
      setRawTranscription(data.rawTranscription || '');
      setIsAiPowered(!!data.aiPowered);

      const items: ScannedTaskProposal[] = (data.items || []).map((it: any, idx: number) => ({
        id: it.id || `prop-${Date.now()}-${idx}`,
        name: it.name || 'Zadanie z kartki',
        category: (it.category as TaskCategory) || 'cleaning',
        frequency: (it.frequency as FrequencyType) || 'weekly',
        room: it.room || 'Dom',
        suggestedAssignee: it.suggestedAssignee || 'Wszyscy',
        estimatedMinutes: it.estimatedMinutes || 30,
        weatherSensitive: !!it.weatherSensitive,
        notes: it.notes || '',
        confidence: it.confidence || 'high',
        selected: true,
      }));

      setProposals(items);

      if (items.length > 0) {
        showToast(
          'Odczytano odręczną kartkę!',
          `Wykryto ${items.length} propozycji zadań do zatwierdzenia.`,
          'success'
        );
      } else {
        showToast('Brak zadań', 'Nie udało się rozpoznać konkretnych pozycji na kartce.', 'warning');
      }
    } catch (err: any) {
      console.error('Vision OCR error:', err);
      showToast('Błąd skanowania', err.message || 'Wystąpił problem z analizą zdjęcia.', 'error');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = (sampleId: string) => {
    // Generate synthetic handwritten note graphic on a canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Paper background
      ctx.fillStyle = '#FCF8ED';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Notebook lines
      ctx.strokeStyle = '#E2D9C8';
      ctx.lineWidth = 1;
      for (let y = 80; y < canvas.height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 30, y);
        ctx.stroke();
      }

      // Red margin line
      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(80, canvas.height);
      ctx.stroke();

      // Handwritten text representation
      ctx.fillStyle = '#1E3A8A'; // Blue pen ink
      ctx.font = 'bold 22px "Caveat", "Comic Sans MS", cursive, sans-serif';

      if (sampleId === 'sample-weekend') {
        ctx.fillText('🏡 ZADANIA NA WEEKEND - CHATA', 100, 60);
        ctx.font = '19px "Caveat", "Comic Sans MS", cursive, sans-serif';
        ctx.fillText('1. Kamil: Przynieść drewno do kotłowni (15 polan)', 100, 116);
        ctx.fillText('2. Kamil: Wyczyścić ruszt w piecu CO i popiół', 100, 152);
        ctx.fillText('3. Kamil: Skosić trawnik wokół domu i altany', 100, 188);
        ctx.fillText('4. Ilona: Przetrzeć blaty i zlew w kuchni', 100, 224);
        ctx.fillText('5. Ilona: Podlać pomidory w szklarni', 100, 260);
        ctx.fillText('6. Olivia: Odkurzyć pokój na poddaszu i zetrzeć kurze', 100, 296);
        ctx.fillText('7. Wszyscy: Uporządkować taras i meble ogrodowe', 100, 332);
      } else {
        ctx.fillText('🌱 PRACE WOKÓŁ DOMU I W OGRODZIE', 100, 60);
        ctx.font = '19px "Caveat", "Comic Sans MS", cursive, sans-serif';
        ctx.fillText('1. Ułożyć porąbane drewno w drewutni (Kamil)', 100, 116);
        ctx.fillText('2. Oczyścić rynny z liści przed deszczem', 100, 152);
        ctx.fillText('3. Przyciąć suche gałęzie w sadzie', 100, 188);
        ctx.fillText('4. Przesadzić zioła do doniczek na tarasie (Ilona)', 100, 224);
        ctx.fillText('5. Umyć okna w salonie i na ganku', 100, 260);
        ctx.fillText('6. Karmienie psa i wyczesanie sierści (Olivia)', 100, 296);
      }

      const sampleDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      analyzeImage(sampleDataUrl);
    }
  };

  // Toggle selection
  const toggleSelectProposal = (id: string) => {
    setProposals(prev =>
      prev.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (selected: boolean) => {
    setProposals(prev => prev.map(p => ({ ...p, selected })));
  };

  // Update proposal field
  const updateProposalField = (id: string, field: keyof ScannedTaskProposal, val: any) => {
    setProposals(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Delete proposal
  const deleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  // Add empty custom proposal
  const handleAddNewProposal = () => {
    const newProp: ScannedTaskProposal = {
      id: `prop-new-${Date.now()}`,
      name: 'Nowe zadanie z kartki',
      category: 'cleaning',
      frequency: 'weekly',
      room: 'Dom',
      suggestedAssignee: 'Wszyscy',
      estimatedMinutes: 30,
      weatherSensitive: false,
      notes: '',
      confidence: 'high',
      selected: true,
    };
    setProposals(prev => [...prev, newProp]);
  };

  // Save selected proposals to ChataContext
  const handleImportSelected = () => {
    const selectedItems = proposals.filter(p => p.selected && p.name.trim());
    if (selectedItems.length === 0) {
      showToast('Brak zaznaczonych', 'Wybierz co najmniej jedno zadanie do zaimportowania.', 'warning');
      return;
    }

    selectedItems.forEach(item => {
      addTask({
        name: item.name.trim(),
        category: item.category,
        frequency: item.frequency,
        room: item.room || 'Dom',
        seasonStart: null,
        seasonEnd: null,
        isCustom: true,
        defaultOrder: 20,
        weatherSensitive: item.weatherSensitive,
        description: item.notes
          ? `${item.notes} (Zeskanowano z odręcznej kartki: ${item.suggestedAssignee || 'Wszyscy'})`
          : `Zadanie zeskanowane z odręcznej kartki (Sugerowany wykonawca: ${item.suggestedAssignee || 'Wszyscy'}).`,
      });
    });

    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 },
    });

    showToast(
      'Zaimportowano zadania!',
      `Dodano ${selectedItems.length} nowych zadań do rejestru Naszej Chaty.`,
      'success'
    );

    if (onSuccess) onSuccess();
    onClose();
  };

  const selectedCount = proposals.filter(p => p.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-[#78350F]/20 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D97706] text-[#FDFCF0] flex items-center justify-center shadow-xs">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#FDFCF0]">
                  Skanuj Odręczną Kartkę Obowiązków
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D97706]/30 text-amber-200 border border-[#D97706]/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D97706]" />
                  AI Vision
                </span>
              </div>
              <p className="text-xs text-[#FDFCF0]/80 mt-0.5">
                Prześlij zdjęcie notatki z lodówki lub zeszytu — AI zamieni je w zadania Chaty
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-[#FDFCF0] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Upload / Capture Section */}
          {!imagePreview && (
            <div className="space-y-6">
              {/* Drag & Drop / Buttons */}
              <div className="border-2 border-dashed border-[#78350F]/30 hover:border-[#2D4F1E] rounded-[28px] p-8 text-center bg-[#FDFCF0] transition-colors">
                <div className="w-16 h-16 rounded-3xl bg-[#2D4F1E]/10 text-[#2D4F1E] flex items-center justify-center mx-auto mb-4 shadow-2xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-[#2D4F1E] mb-1">
                  Wybierz lub zrób zdjęcie odręcznej kartki
                </h4>
                <p className="text-xs text-[#78350F]/70 max-w-md mx-auto mb-6">
                  Obsługuje odręczne listy zadań, kartki z lodówki, notatki po polsku z podziałem prac na domowników, kotłownię i ogród.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-5 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Zrób zdjęcie aparatem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-white hover:bg-[#78350F]/5 text-[#78350F] border border-[#78350F]/20 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Wybierz z galerii / plik</span>
                  </button>
                </div>
              </div>

              {/* Sample Presets for Instant Testing */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#D97706]" />
                  <h5 className="text-xs font-bold text-[#78350F] uppercase tracking-wider">
                    Lub przetestuj na przykładowej kartce:
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SAMPLE_SHEETS.map(sample => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleLoadSample(sample.id)}
                      className="p-4 rounded-2xl bg-white border border-[#78350F]/15 hover:border-[#D97706] hover:bg-amber-50/50 text-left transition-all shadow-2xs group flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#2D4F1E] group-hover:text-[#D97706] transition-colors">
                          {sample.title}
                        </p>
                        <p className="text-[11px] font-medium text-[#78350F]/80 mt-0.5">
                          {sample.subtitle}
                        </p>
                        <p className="text-[10px] text-[#78350F]/60 mt-1">
                          {sample.description}
                        </p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 bg-[#2D4F1E]/10 group-hover:bg-[#D97706] group-hover:text-white rounded-xl text-[10px] font-bold text-[#2D4F1E] transition-colors">
                        Testuj →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analyzing Loading Radar */}
          {isAnalyzing && (
            <div className="py-12 px-6 bg-[#FDFCF0] rounded-[28px] border border-[#78350F]/15 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#2D4F1E]/20 animate-ping"></div>
                <div className="w-20 h-20 rounded-full bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-center shadow-lg relative">
                  <Sparkles className="w-9 h-9 text-amber-300 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="text-base font-bold text-[#2D4F1E]">
                  Analizowanie zdjęcia przez Model Wizyjny Gemini
                </h4>
                <p className="text-xs text-[#D97706] font-semibold mt-1">
                  {analyzingStep || 'Odczytywanie pisma odręcznego...'}
                </p>
              </div>
              <p className="text-[11px] text-[#78350F]/70 max-w-sm mx-auto">
                AI transkrybuje tekst, rozpoznaje strefy domu (kotłownia, ogród, kuchnia) oraz sugeruje wykonawców.
              </p>
            </div>
          )}

          {/* Scanned Proposals Results */}
          {!isAnalyzing && imagePreview && (
            <div className="space-y-6">
              {/* Scanned Image & Summary Top Banner */}
              <div className="bg-[#FDFCF0] rounded-2xl border border-[#78350F]/15 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Podgląd kartki"
                    className="w-16 h-16 rounded-xl object-cover border border-[#78350F]/20 shrink-0 shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#2D4F1E]">
                        {noteTitle || 'Rozpoznana lista zadań'}
                      </h4>
                      {!isAiPowered && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                          Podgląd demo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#78350F]/80 mt-0.5">
                      {summary || `Wykryto ${proposals.length} propozycji zadań.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTranscription(!showTranscription)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-50 text-[#78350F] border border-[#78350F]/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>{showTranscription ? 'Ukryj transkrypcję' : 'Pokaż tekst OCR'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setProposals([]);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Skanuj inną</span>
                  </button>
                </div>
              </div>

              {/* Raw Transcription Collapsible */}
              {showTranscription && rawTranscription && (
                <div className="bg-white rounded-2xl border border-[#78350F]/15 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-[#2D4F1E] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#D97706]" />
                    Odręczny tekst odczytany z kartki:
                  </h5>
                  <pre className="text-xs text-[#78350F] whitespace-pre-wrap font-mono bg-[#FDFCF0] p-3 rounded-xl border border-[#78350F]/10">
                    {rawTranscription}
                  </pre>
                </div>
              )}

              {/* Proposals List Header */}
              <div className="flex items-center justify-between pt-2 border-t border-[#78350F]/10">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-1.5">
                    <span>Propozycje Zadań ({proposals.length})</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectAll(true)}
                      className="text-[11px] font-bold text-[#D97706] hover:underline"
                    >
                      Zaznacz wszystkie
                    </button>
                    <span className="text-xs text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={() => selectAll(false)}
                      className="text-[11px] font-medium text-[#78350F]/60 hover:underline"
                    >
                      Odznacz
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewProposal}
                  className="px-3 py-1.5 bg-[#2D4F1E]/10 hover:bg-[#2D4F1E]/20 text-[#2D4F1E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj pozycję</span>
                </button>
              </div>

              {/* Proposals Cards */}
              <div className="space-y-3">
                {proposals.map((item, index) => {
                  const isChecked = !!item.selected;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all p-4 ${
                        isChecked
                          ? 'bg-white border-[#2D4F1E]/40 shadow-xs'
                          : 'bg-gray-50/70 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectProposal(item.id)}
                          className="mt-1 text-[#2D4F1E] hover:text-[#D97706] transition-colors shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-[#2D4F1E]" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {/* Proposal Form Fields */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Task Name Input */}
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#FDFCF0] text-[#78350F] border border-[#78350F]/20 flex items-center justify-center text-xs font-bold shrink-0">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => updateProposalField(item.id, 'name', e.target.value)}
                              placeholder="Nazwa zadania..."
                              className="w-full text-sm font-bold text-[#2D4F1E] bg-transparent border-b border-transparent hover:border-[#78350F]/30 focus:border-[#2D4F1E] focus:bg-white px-1.5 py-0.5 rounded outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => deleteProposal(item.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              title="Usuń propozycję"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Attributes Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            {/* Room */}
                            <div>
                              <label className="block text-[10px] font-bold text-[#78350F]/60 uppercase tracking-wider mb-1">
                                Pomieszczenie
                              </label>
                              <select
                                value={item.room}
                                onChange={e => updateProposalField(item.id, 'room', e.target.value)}
                                className="w-full text-xs font-semibold text-[#78350F] bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl px-2 py-1.5 outline-none"
                              >
                                <option value="Kotłownia">🔥 Kotłownia</option>
                                <option value="Drewutnia">🪵 Drewutnia</option>
                                <option value="Ogród">🌱 Ogród</option>
                                <option value="Kuchnia">🍳 Kuchnia</option>
                                <option value="Salon">🛋️ Salon</option>
                                <option value="Łazienka">🚿 Łazienka</option>
                                <option value="Taras">☀️ Taras</option>
                                <option value="Garaż">🔧 Garaż</option>
                                <option value="Poddasze">🏠 Poddasze</option>
                                <option value="Dom">🏡 Cały Dom</option>
                              </select>
                            </div>

                            {/* Category */}
                            <div>
                              <label className="block text-[10px] font-bold text-[#78350F]/60 uppercase tracking-wider mb-1">
                                Kategoria
                              </label>
                              <select
                                value={item.category}
                                onChange={e => updateProposalField(item.id, 'category', e.target.value)}
                                className="w-full text-xs font-semibold text-[#78350F] bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl px-2 py-1.5 outline-none"
                              >
                                <option value="wood">🪵 Drewno</option>
                                <option value="stove">🔥 Piec CO</option>
                                <option value="garden">🌱 Ogród</option>
                                <option value="cleaning">🧹 Sprzątanie</option>
                                <option value="dishes">🍽️ Naczynia</option>
                                <option value="laundry">🧺 Pranie</option>
                                <option value="plants">🪴 Rośliny</option>
                                <option value="shopping">🛒 Zakupy</option>
                                <option value="maintenance">🔧 Konserwacja</option>
                              </select>
                            </div>

                            {/* Frequency */}
                            <div>
                              <label className="block text-[10px] font-bold text-[#78350F]/60 uppercase tracking-wider mb-1">
                                Częstotliwość
                              </label>
                              <select
                                value={item.frequency}
                                onChange={e => updateProposalField(item.id, 'frequency', e.target.value)}
                                className="w-full text-xs font-semibold text-[#78350F] bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl px-2 py-1.5 outline-none"
                              >
                                <option value="daily">Codziennie</option>
                                <option value="every_other_day">Co 2 dni</option>
                                <option value="twice_weekly">2x w tygodniu</option>
                                <option value="weekly">Raz w tygodniu</option>
                                <option value="monthly">Miesięcznie</option>
                              </select>
                            </div>

                            {/* Suggested Assignee */}
                            <div>
                              <label className="block text-[10px] font-bold text-[#78350F]/60 uppercase tracking-wider mb-1">
                                Wykonawca
                              </label>
                              <select
                                value={item.suggestedAssignee || 'Wszyscy'}
                                onChange={e => updateProposalField(item.id, 'suggestedAssignee', e.target.value)}
                                className="w-full text-xs font-semibold text-[#78350F] bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl px-2 py-1.5 outline-none"
                              >
                                <option value="Wszyscy">👥 Wszyscy</option>
                                {profiles.map(p => (
                                  <option key={p.id} value={p.name}>
                                    👤 {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Extra Notes / Weather Sensitivity Check */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#78350F]/80">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!item.weatherSensitive}
                                  onChange={e => updateProposalField(item.id, 'weatherSensitive', e.target.checked)}
                                  className="rounded text-[#D97706] focus:ring-0"
                                />
                                <span className="flex items-center gap-1">
                                  <CloudSun className="w-3.5 h-3.5 text-[#D97706]" />
                                  Zależne od pogody
                                </span>
                              </label>

                              <span className="flex items-center gap-1 text-[#78350F]/60">
                                <Clock className="w-3.5 h-3.5" />
                                {item.estimatedMinutes || 30} min
                              </span>
                            </div>

                            {item.notes && (
                              <span className="italic text-[#78350F]/70 text-[10px]">
                                💡 Dopiski: {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#FDFCF0] border-t border-[#78350F]/15 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-[#78350F] hover:bg-[#78350F]/10 rounded-xl transition-colors"
          >
            Anuluj
          </button>

          {proposals.length > 0 && (
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedCount === 0}
              className={`px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                selectedCount > 0
                  ? 'bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] scale-100 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Dodaj wybrane zadania ({selectedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
