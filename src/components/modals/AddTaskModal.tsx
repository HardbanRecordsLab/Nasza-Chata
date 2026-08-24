import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Camera, X, Plus, Sparkles, Loader2, Calendar, MapPin, Repeat } from 'lucide-react';
import { FrequencyType, TaskCategory, TaskDefinition } from '../../types';
import { useChata } from '../../context/ChataContext';
import { getTaskIcon } from '../icons/CustomChataIcons';

interface AddTaskModalProps {
  onClose: () => void;
  taskToEdit?: TaskDefinition;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, taskToEdit }) => {
  const { addTask, updateTask, showToast, profiles } = useChata();

  const [name, setName] = useState(taskToEdit?.name || '');
  const [category, setCategory] = useState<TaskCategory>(taskToEdit?.category || 'cleaning');
  const [frequency, setFrequency] = useState<FrequencyType>(taskToEdit?.frequency || 'weekly');
  const [room, setRoom] = useState(taskToEdit?.room || 'Kuchnia');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [isSeasonal, setIsSeasonal] = useState(!!(taskToEdit?.seasonStart && taskToEdit?.seasonEnd));
  const [seasonStart, setSeasonStart] = useState<number>(taskToEdit?.seasonStart || 4); // Kwiet
  const [seasonEnd, setSeasonEnd] = useState<number>(taskToEdit?.seasonEnd || 10);      // Paźdz
  const [weatherSensitive, setWeatherSensitive] = useState(taskToEdit?.weatherSensitive || false);

  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  // OCR scanning state
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setRecognitionSupported(true);
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Brak wsparcia mowy', 'Przeglądarka nie obsługuje Web Speech API.', 'warning');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Mów teraz...', 'Wypowiedz nazwę obowiązku po polsku', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setName(prev => (prev ? `${prev} ${transcript}` : transcript));
          showToast('Rozpoznano głos', transcript, 'success');
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Błąd mikrofonu', 'Nie udało się rozpoznać mowy.', 'error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      showToast('Błąd mikrofonu', 'Nie można uruchomić nagrywania.', 'error');
    }
  };

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    showToast('Analizowanie zdjęcia...', 'AI odczytuje odręczną listę zadań', 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/ai?action=scan-chores-vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            familyProfiles: profiles.map(p => `${p.name} (${p.roleTitle})`),
            houseContext: 'Dom jednorodzinny z kotłownią, drewutnią, piecem CO i ogrodem.',
          }),
        });
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          const first = data.items[0];
          setName(first.name);
          if (first.category) setCategory(first.category);
          if (first.frequency) setFrequency(first.frequency);
          if (first.room) setRoom(first.room);
          if (first.weatherSensitive !== undefined) setWeatherSensitive(first.weatherSensitive);
          if (first.notes) setDescription(first.notes);

          // If multiple items, add the rest directly to tasks registry
          if (data.items.length > 1) {
            for (let i = 1; i < data.items.length; i++) {
              const it = data.items[i];
              addTask({
                name: it.name,
                category: it.category || 'cleaning',
                frequency: it.frequency || 'weekly',
                room: it.room || 'Dom',
                seasonStart: null,
                seasonEnd: null,
                isCustom: true,
                defaultOrder: 15,
                weatherSensitive: !!it.weatherSensitive,
                description: it.notes
                  ? `${it.notes} (Zeskanowano z odręcznej kartki: ${it.suggestedAssignee || 'Wszyscy'})`
                  : `Zadanie zeskanowane z odręcznej kartki (Wykonawca: ${it.suggestedAssignee || 'Wszyscy'}).`,
              });
            }
            showToast('Zeskanowano listę!', `Wczytano ${data.items.length} zadań z odręcznej notatki.`, 'success');
          } else {
            showToast('Rozpoznano zadanie!', first.name, 'success');
          }
        } else {
          showToast('Brak zadań', 'Nie znaleziono czytelnych pozycji na zdjęciu.', 'warning');
        }
      } catch (err) {
        showToast('Błąd skanowania', 'Wystąpił problem z rozpoznawaniem tekstu.', 'error');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (taskToEdit) {
      updateTask({
        ...taskToEdit,
        name: name.trim(),
        category,
        frequency,
        room,
        description: description.trim(),
        seasonStart: isSeasonal ? seasonStart : null,
        seasonEnd: isSeasonal ? seasonEnd : null,
        weatherSensitive,
      });
    } else {
      addTask({
        name: name.trim(),
        category,
        frequency,
        room,
        description: description.trim(),
        seasonStart: isSeasonal ? seasonStart : null,
        seasonEnd: isSeasonal ? seasonEnd : null,
        isCustom: true,
        defaultOrder: 20,
        weatherSensitive,
      });
    }
    onClose();
  };

  const months = [
    { num: 1, name: 'Styczeń' },
    { num: 2, name: 'Luty' },
    { num: 3, name: 'Marzec' },
    { num: 4, name: 'Kwiecień' },
    { num: 5, name: 'Maj' },
    { num: 6, name: 'Czerwiec' },
    { num: 7, name: 'Lipiec' },
    { num: 8, name: 'Sierpień' },
    { num: 9, name: 'Wrzesień' },
    { num: 10, name: 'Październik' },
    { num: 11, name: 'Listopad' },
    { num: 12, name: 'Grudzień' },
  ];

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
          <div className="w-10 h-10 rounded-2xl bg-[#2D4F1E]/10 border border-[#2D4F1E]/20 flex items-center justify-center text-[#2D4F1E]">
            {getTaskIcon(name, category)}
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-[#2D4F1E]">
              {taskToEdit ? 'Edytuj obowiązek' : 'Dodaj nowy obowiązek'}
            </h3>
            <p className="text-xs text-[#78350F]/70">
              Zdefiniuj regułę powtarzalności dla wspólnego zadania rodziny.
            </p>
          </div>
        </div>

        {/* Quick OCR / Voice Bar */}
        {!taskToEdit && (
          <div className="glass-panel rounded-2xl p-3 mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#78350F]">
              <Sparkles className="w-4 h-4 text-[#D97706] animate-pulse" />
              Szybkie wprowadzanie:
            </div>
            <div className="flex items-center gap-2">
              {/* Voice button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  isListening
                    ? 'bg-red-600 text-white animate-bounce'
                    : 'bg-white hover:bg-[#78350F]/10 text-[#78350F] border border-[#78350F]/20'
                }`}
                title="Wprowadź głosem"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#D97706]" />}
                <span>{isListening ? 'Słucham...' : 'Głos'}</span>
              </button>

              {/* OCR Scan button */}
              <label
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white hover:bg-[#78350F]/10 text-[#78350F] border border-[#78350F]/20 shadow-xs transition-colors ${
                  isScanning ? 'opacity-70 pointer-events-none' : ''
                }`}
                title="Skanuj odręczną kartkę"
              >
                {isScanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D97706]" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-[#D97706]" />
                )}
                <span>{isScanning ? 'Skanuję...' : 'Skanuj kartkę'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleScanCard}
                  disabled={isScanning}
                />
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Nazwa obowiązku: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Przetarcie kurzu na poddaszu, Czyszczenie rynien..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-sm font-semibold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
            />
          </div>

          {/* Category & Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#78350F] mb-1">
                Kategoria:
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs font-semibold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              >
                <option value="cleaning">🧹 Sprzątanie i mycie</option>
                <option value="wood">🪵 Drewno i opał</option>
                <option value="stove">🔥 Piec i kotłownia</option>
                <option value="garden">🌿 Ogród i trawnik</option>
                <option value="plants">🪴 Kwiaty i rośliny</option>
                <option value="shopping">🛒 Zakupy domowe</option>
                <option value="dishes">🍽️ Naczynia i kuchnia</option>
                <option value="laundry">🛏️ Pościel i pranie</option>
                <option value="maintenance">🔧 Konserwacja i dom</option>
                <option value="seasonal">🌸 Sezonowe</option>
                <option value="occasional">🎉 Okazjonalne (święta, urodziny, goście)</option>
                <option value="administrative">📑 Administracyjne (rachunki, dokumenty, urzędy)</option>
                <option value="organizational">🧠 Organizacyjne (planowanie, podział)</option>
                <option value="custom">✨ Inne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78350F] mb-1">
                Pomieszczenie:
              </label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="np. Kuchnia, Kotłownia, Ogród..."
                className="w-full px-3 py-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs font-semibold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1.5 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[#2D4F1E]" />
              Częstotliwość powtarzania:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'daily', label: 'Codziennie' },
                { id: 'every_other_day', label: 'Co drugi dzień' },
                { id: 'twice_weekly', label: '1–2× w tygodniu' },
                { id: 'weekly', label: 'Raz w tygodniu' },
                { id: 'monthly', label: 'Raz w miesiącu' },
              ].map(f => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setFrequency(f.id as FrequencyType)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    frequency === f.id
                      ? 'bg-[#2D4F1E] text-[#FDFCF0] border-[#2D4F1E] shadow-sm'
                      : 'bg-white text-[#78350F] border-[#78350F]/20 hover:bg-[#78350F]/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seasonal Switch */}
          <div className="bg-white border border-[#78350F]/15 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#2D4F1E] block">
                  Zadanie sezonowe (np. tylko zimą lub latem)
                </span>
                <span className="text-[11px] text-[#78350F]/70">
                  Zadanie będzie aktywne w kalendarzu tylko w wybranym okresie roku.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isSeasonal}
                onChange={e => setIsSeasonal(e.target.checked)}
                className="w-5 h-5 accent-[#2D4F1E] rounded cursor-pointer"
              />
            </div>

            {isSeasonal && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#78350F]/10 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-[#78350F] mb-1">
                    Od miesiąca:
                  </label>
                  <select
                    value={seasonStart}
                    onChange={e => setSeasonStart(Number(e.target.value))}
                    className="w-full p-2 bg-[#FDFCF0] border border-[#78350F]/20 rounded-lg text-xs font-semibold text-[#2D4F1E]"
                  >
                    {months.map(m => (
                      <option key={m.num} value={m.num}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#78350F] mb-1">
                    Do miesiąca:
                  </label>
                  <select
                    value={seasonEnd}
                    onChange={e => setSeasonEnd(Number(e.target.value))}
                    className="w-full p-2 bg-[#FDFCF0] border border-[#78350F]/20 rounded-lg text-xs font-semibold text-[#2D4F1E]"
                  >
                    {months.map(m => (
                      <option key={m.num} value={m.num}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Weather Sensitive */}
          <div className="flex items-center gap-2.5 px-1">
            <input
              type="checkbox"
              id="weather"
              checked={weatherSensitive}
              onChange={e => setWeatherSensitive(e.target.checked)}
              className="w-4 h-4 accent-[#2D4F1E] rounded cursor-pointer"
            />
            <label htmlFor="weather" className="text-xs text-[#78350F] font-medium cursor-pointer">
              Zadanie zależne od pogody (sugeruj przesunięcie przy deszczu)
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Wskazówki / opis dla domowników (opcjonalne):
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="np. Gdzie leży sprzęt, jakie środki czystości zastosować..."
              className="w-full px-3.5 py-2 bg-white border border-[#78350F]/20 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40 resize-none"
            />
          </div>

          {/* Actions */}
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
              className="flex-2 py-3 px-4 rounded-xl bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              {taskToEdit ? 'Zapisz zmiany' : 'Dodaj obowiązek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
