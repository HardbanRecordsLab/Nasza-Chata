import React, { useState, useEffect } from 'react';
import { useChata } from '../../context/ChataContext';
import { TaskOccurrence, TaskDefinition } from '../../types';
import { calculateCleanlinessScore, getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { getTaskIcon, ChataFlameIcon, ChataWoodLogIcon } from '../icons/CustomChataIcons';
import {
  CheckCircle2,
  Circle,
  Camera,
  AlertTriangle,
  Sparkles,
  CloudSun,
  Flame,
  Layers,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  MessageCircle,
  Smartphone,
  Bell,
  ShieldCheck,
  UserCheck,
  CalendarDays,
  ShoppingBag,
  Receipt,
  DollarSign,
  Crown,
} from 'lucide-react';
import { MiniCalendarWidget } from '../widgets/MiniCalendarWidget';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { ProofModal } from '../modals/ProofModal';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface TodayViewProps {
  onOpenAddTask: () => void;
  onOpenSos: () => void;
  onOpenAiAssistant?: () => void;
  onOpenNotifications?: () => void;
  onOpenWidget?: () => void;
  onOpenScanHandwritten?: () => void;
  onChangeTab?: (tab: 'today' | 'calendar' | 'shopping' | 'house' | 'plan') => void;
  onSelectDate?: (date: Date) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  onOpenAddTask,
  onOpenSos,
  onOpenAiAssistant,
  onOpenNotifications,
  onOpenWidget,
  onOpenScanHandwritten,
  onChangeTab,
  onSelectDate,
}) => {
  const {
    currentProfile,
    profiles,
    tasks,
    completions,
    woodInventory,
    sosAlerts,
    shoppingItems,
    expenses,
    toggleTaskCompletion,
    resolveSosAlert,
    assignTask,
  } = useChata();

  const isAdmin = currentProfile.isAdmin || currentProfile.id === 'kamil';

  const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null);
  const [proofModalOccurrence, setProofModalOccurrence] = useState<TaskOccurrence | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [weatherAdvice, setWeatherAdvice] = useState<any>(null);

  const today = new Date();
  const occurrences = getOccurrencesForDate(tasks, completions, today);

  // Filter tasks based on category
  const filteredOccurrences = occurrences.filter(occ => {
    if (activeCategoryFilter === 'all') return true;
    if (activeCategoryFilter === 'wood_stove') return occ.task.category === 'wood' || occ.task.category === 'stove';
    if (activeCategoryFilter === 'cleaning') return occ.task.category === 'cleaning' || occ.task.category === 'dishes' || occ.task.category === 'laundry';
    if (activeCategoryFilter === 'garden') return occ.task.category === 'garden' || occ.task.category === 'plants';
    return occ.task.category === activeCategoryFilter;
  });

  const completedCount = occurrences.filter(o => o.isCompleted).length;
  const totalCount = occurrences.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Active SOS alerts
  const activeAlerts = sosAlerts.filter(a => a.status === 'active');

  // Load weather advice
  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => setWeatherAdvice(data))
      .catch(() => {});
  }, []);

  const categories = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'wood_stove', label: '🔥 Kotłownia & Drewno' },
    { id: 'cleaning', label: '🧹 Sprzątanie' },
    { id: 'garden', label: '🌿 Ogród' },
  ];

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-150">
      {/* SOS Alert Banner if any */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-500 text-white rounded-3xl p-4 shadow-lg border border-red-600 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                🚨
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-red-700/80 px-2 py-0.5 rounded-full">
                  Pilna awaria domowa (SOS)
                </span>
                <h3 className="text-base font-bold font-display mt-0.5">
                  {activeAlerts[0].title}
                </h3>
                <p className="text-xs text-red-100 mt-0.5">
                  Miejsce: {activeAlerts[0].room} • Zgłosił(a): {activeAlerts[0].reportedByName}
                </p>
                {activeAlerts[0].description && (
                  <p className="text-xs text-white/90 mt-1 bg-red-600/60 p-2 rounded-xl">
                    {activeAlerts[0].description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => resolveSosAlert(activeAlerts[0].id)}
              className="px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              Naprawione ✓
            </button>
          </div>
        </div>
      )}

      {/* Cozy Hero Greeting Card */}
      <div className="bg-[#2D4F1E] text-[#FDFCF0] rounded-[32px] p-6 shadow-md relative overflow-hidden">
        {/* Background Subtle Pattern */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
          <ChataFlameIcon size={160} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">{currentProfile.avatar}</span>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-[#FDFCF0]">
                Dzień dobry, {currentProfile.name}!
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#FDFCF0]/80 font-medium">
              {progressPercent === 100 && totalCount > 0
                ? 'Wszystkie dzisiejsze obowiązki zrobione! Czas na relaks przy herbacie. ☕'
                : `Dzisiaj do ogarnięcia w Chacie: ${totalCount - completedCount} z ${totalCount} zadań.`}
            </p>
          </div>

          {/* Wood status mini widget */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/20 text-[#D97706] flex items-center justify-center">
              <ChataWoodLogIcon size={24} />
            </div>
            <div>
              <div className="text-[10px] text-[#FDFCF0]/70 uppercase tracking-wider font-bold">
                Drewutnia & Piec
              </div>
              <div className="text-sm font-bold text-amber-200 font-mono">
                {woodInventory.estimatedM3} m³ drewna
              </div>
              <div className="text-[10px] text-[#FDFCF0]/80">
                Polana w kotłowni: <span className="font-semibold text-white">{woodInventory.logsInBoilerRoom} szt.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Progress Bar */}
        <div className="mt-5 relative z-10">
          <div className="flex items-center justify-between text-xs font-semibold text-[#FDFCF0]/85 mb-1.5">
            <span>Postęp domowych prac na dziś:</span>
            <span className="font-mono">{completedCount} / {totalCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#D97706] via-amber-300 to-emerald-400 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weather & Smart Chore Advisor */}
      {weatherAdvice && (
        <div className="glass-panel rounded-[24px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs mb-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center shrink-0">
              <CloudSun className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#2D4F1E]">
                  Pogoda dla Chaty: {weatherAdvice.temp}°C • {weatherAdvice.conditionText}
                </h4>
              </div>
              <p className="text-xs text-[#78350F]/80 mt-0.5 leading-relaxed font-medium">
                💡 {weatherAdvice.recommendation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#78350F]/10 w-full sm:w-auto justify-end">
            {onOpenScanHandwritten && (
              <button
                type="button"
                onClick={onOpenScanHandwritten}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-[#D97706]/30 text-[#78350F] rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Skanuj odręczną kartkę z lodówki (AI Vision)"
              >
                <Camera className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Skanuj kartkę</span>
              </button>
            )}

            {onOpenWidget && (
              <button
                type="button"
                onClick={onOpenWidget}
                className="px-3 py-1.5 bg-white hover:bg-[#D97706]/10 border border-[#78350F]/15 text-[#78350F] rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Pokaż widżet pulpitu"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Widżet PWA</span>
              </button>
            )}

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="px-3 py-1.5 bg-white hover:bg-[#2D4F1E]/10 border border-[#78350F]/15 text-[#2D4F1E] rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Konfiguruj powiadomienia"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Powiadomienia</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard Bento Widgets */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Shopping & Wallet Summary Widget */}
        <button 
          onClick={() => onChangeTab?.('shopping')}
          className="bg-white rounded-[24px] p-4 border border-[#78350F]/10 shadow-2xs flex flex-col justify-between text-left hover:shadow-sm hover:border-[#D97706]/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#2D4F1E] group-hover:text-[#D97706] transition-colors">Portfel & Zakupy</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-[#78350F]/30 group-hover:text-[#D97706] transition-colors" />
          </div>
          
          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between text-xs w-full">
              <span className="text-[#78350F]/70">Do kupienia:</span>
              <span className="font-bold text-[#D97706]">{shoppingItems.filter(i => !i.isBought).length} produktów</span>
            </div>
            <div className="flex items-center justify-between text-xs w-full">
              <span className="text-[#78350F]/70">Wydatki (m-c):</span>
              <span className="font-bold text-red-600">
                {expenses
                  .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toFixed(2)} zł
              </span>
            </div>
          </div>
        </button>

        {/* Calendar Summary Widget */}
        <button 
          onClick={() => onChangeTab?.('calendar')}
          className="bg-white rounded-[24px] p-4 border border-[#78350F]/10 shadow-2xs flex flex-col justify-between text-left hover:shadow-sm hover:border-[#D97706]/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#2D4F1E] group-hover:text-[#D97706] transition-colors">Kalendarz & Planer</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-[#78350F]/30 group-hover:text-[#D97706] transition-colors" />
          </div>
          
          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between text-xs w-full">
              <span className="text-[#78350F]/70">Zadania dzisiaj:</span>
              <span className="font-bold text-[#2D4F1E]">{totalCount} (Zrobiono: {completedCount})</span>
            </div>
            <div className="flex items-center justify-between text-xs w-full">
              <span className="text-[#78350F]/70">Zadania jutro:</span>
              <span className="font-bold text-[#78350F]">
                {getOccurrencesForDate(tasks, completions, new Date(Date.now() + 86400000)).length}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Panel Wspólny vs Zarządzanie — entry points */}
      {isAdmin ? (
        <button
          onClick={() => onChangeTab?.('plan')}
          className="w-full bg-gradient-to-br from-[#2D4F1E] to-[#1a3a12] rounded-[24px] p-4 border border-[#1f3715] shadow-md flex items-center justify-between text-left hover:shadow-lg hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-[#2D4F1E] flex items-center justify-center font-black shadow-sm">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Panel Zarządzania <span className="text-[10px] bg-amber-400 text-[#2D4F1E] px-1.5 py-0.5 rounded-full">ADMIN</span>
              </div>
              <div className="text-[11px] text-white/70">Przydziały osób • Plan tygodniowy z drukiem • Sprzątanie na tydzień</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </button>
      ) : (
        <div className="bg-white rounded-[24px] p-4 border border-[#78350F]/10 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-center text-xl">🏡</div>
          <div>
            <div className="text-sm font-bold text-[#2D4F1E]">Panel Wspólny — Nasza Chata</div>
            <div className="text-[11px] text-[#78350F]/70">Wspólne zadania, kalendarz i zakupy dla całej rodziny. Zarządzanie (przydziały) — tylko Kamil.</div>
          </div>
        </div>
      )}

      {/* Mini Calendar Widget */}
      <MiniCalendarWidget
        onSelectDate={(date) => {
          onSelectDate?.(date);
          onChangeTab?.('calendar');
        }}
      />

      {/* Floating AI Assistant Banner */}
      <div className="glass-panel rounded-[32px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] font-bold shrink-0">
            <Sparkles className="w-5 h-5 text-[#D97706] animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#2D4F1E]">
              Asystent Domowy Gemini 2.0 Flash
            </h4>
            <p className="text-xs text-[#78350F]/70">
              Zapytaj o stan drewna, serwis pieca, przepisy lub podział prac.
            </p>
          </div>
        </div>
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="px-4 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Zapytaj AI</span>
          </button>
        )}
      </div>

      {/* Modals */}
      {selectedOccurrence && (
        <TaskDetailModal
          occurrence={selectedOccurrence}
          onClose={() => setSelectedOccurrence(null)}
        />
      )}

      {proofModalOccurrence && (
        <ProofModal
          occurrence={proofModalOccurrence}
          onClose={() => setProofModalOccurrence(null)}
        />
      )}
    </div>
  );
};
