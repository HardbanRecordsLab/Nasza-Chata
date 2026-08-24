import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { getTaskIcon, ChataWoodLogIcon, ChataFlameIcon } from '../icons/CustomChataIcons';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Flame,
  ExternalLink,
  Plus,
  Sparkles,
  Smartphone,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface HomeScreenWidgetProps {
  compact?: boolean;
  onOpenApp?: () => void;
  onOpenAddTask?: () => void;
  onOpenSos?: () => void;
}

export const HomeScreenWidget: React.FC<HomeScreenWidgetProps> = ({
  compact = false,
  onOpenApp,
  onOpenAddTask,
  onOpenSos,
}) => {
  const {
    currentProfile,
    tasks,
    completions,
    woodInventory,
    sosAlerts,
    toggleTaskCompletion,
  } = useChata();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const today = new Date();
  const occurrences = getOccurrencesForDate(tasks, completions, today);
  const activeSos = sosAlerts.filter(a => a.status === 'active');

  const completedCount = occurrences.filter(o => o.isCompleted).length;
  const totalCount = occurrences.length;
  const pendingCount = totalCount - completedCount;

  const filteredOccurrences = occurrences.filter(occ => {
    if (activeFilter === 'pending') return !occ.isCompleted;
    if (activeFilter === 'completed') return occ.isCompleted;
    return true;
  });

  const todayFormatted = format(today, 'd MMMM, EEEE', { locale: pl });
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <div className="w-full bg-[#FDFCF0] text-[#2D4F1E] rounded-[32px] border-2 border-[#78350F]/20 p-5 shadow-xl flex flex-col relative overflow-hidden transition-all">
      {/* Widget Header Strip */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#78350F]/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-center text-sm font-bold shadow-2xs shrink-0">
            🏡
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-display font-bold text-[#2D4F1E] truncate">
                Nasza Chata — Widżet
              </h3>
              <span className="text-[10px] bg-[#D97706]/20 text-[#78350F] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                Pulpit
              </span>
            </div>
            <p className="text-[11px] text-[#78350F]/70 font-medium truncate capitalize">
              {todayFormatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAddTask && (
            <button
              onClick={onOpenAddTask}
              className="p-1.5 rounded-xl bg-white hover:bg-[#78350F]/10 border border-[#78350F]/15 text-[#2D4F1E] transition-colors"
              title="Dodaj zadanie"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {onOpenApp && (
            <button
              onClick={onOpenApp}
              className="px-2.5 py-1 rounded-xl bg-[#2D4F1E] text-[#FDFCF0] text-[11px] font-bold flex items-center gap-1 hover:bg-[#1f3715] transition-colors"
              title="Otwórz pełną aplikację"
            >
              <span>Otwórz</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* SOS Alert Bar on Widget if Active */}
      {activeSos.length > 0 && (
        <div
          onClick={onOpenSos}
          className="mt-3 bg-red-600 text-white p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xs cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span className="truncate">Awaria SOS: {activeSos[0].title}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Sprawdź</span>
        </div>
      )}

      {/* Quick Glance Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 my-3">
        {/* Metric 1: Pending Tasks */}
        <div className="bg-white rounded-2xl p-2.5 border border-[#78350F]/10 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-[#78350F]/70 uppercase tracking-wider">
            Zadania
          </p>
          <p className="text-lg font-display font-extrabold text-[#2D4F1E] leading-tight mt-0.5">
            {completedCount}/{totalCount}
          </p>
          <div className="w-full bg-[#78350F]/10 h-1.5 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-[#2D4F1E] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Wood Inventory */}
        <div className="bg-white rounded-2xl p-2.5 border border-[#78350F]/10 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-[#78350F]/70 uppercase tracking-wider flex items-center justify-center gap-0.5">
            <Flame className="w-3 h-3 text-[#D97706]" />
            Drewutnia
          </p>
          <p className="text-lg font-display font-extrabold text-[#D97706] leading-tight mt-0.5">
            {woodInventory.estimatedM3.toFixed(1)} <span className="text-xs font-medium">m³</span>
          </p>
          <p className="text-[9px] text-[#78350F]/60">Pojemność 14 m³</p>
        </div>

        {/* Metric 3: Boiler Room Logs */}
        <div className="bg-white rounded-2xl p-2.5 border border-[#78350F]/10 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-[#78350F]/70 uppercase tracking-wider">
            Kotłownia
          </p>
          <p className="text-lg font-display font-extrabold text-[#78350F] leading-tight mt-0.5">
            {woodInventory.logsInBoilerRoom} <span className="text-xs font-medium">szt.</span>
          </p>
          <p className="text-[9px] text-[#78350F]/60">przy piecu</p>
        </div>
      </div>

      {/* Filter Tabs on Widget */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-xs font-bold text-[#2D4F1E] flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#2D4F1E]" />
          Dzisiejsze obowiązki
        </span>

        <div className="flex bg-white/80 p-0.5 rounded-xl border border-[#78350F]/10 text-[10px] font-bold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#2D4F1E] text-[#FDFCF0]'
                : 'text-[#78350F] hover:bg-[#78350F]/10'
            }`}
          >
            Wszystkie ({totalCount})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-2 py-0.5 rounded-lg transition-colors ${
              activeFilter === 'pending'
                ? 'bg-[#2D4F1E] text-[#FDFCF0]'
                : 'text-[#78350F] hover:bg-[#78350F]/10'
            }`}
          >
            Do zrobienia ({pendingCount})
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-64 pr-1">
        {filteredOccurrences.length === 0 ? (
          <div className="p-4 bg-white/60 rounded-2xl text-center border border-[#78350F]/10 text-xs text-[#78350F]/70">
            {activeFilter === 'pending'
              ? '🎉 Wszystkie zadania na dziś zostały wykonane!'
              : 'Brak zadań w tej kategorii.'}
          </div>
        ) : (
          filteredOccurrences.map(occ => {
            const isDone = occ.isCompleted;
            return (
              <div
                key={occ.task.id}
                className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-white/50 border-[#78350F]/10 opacity-75'
                    : 'bg-white border-[#78350F]/15 hover:border-[#2D4F1E]/40 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => toggleTaskCompletion(occ.task.id, today)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      isDone
                        ? 'bg-[#2D4F1E] text-[#FDFCF0]'
                        : 'border-2 border-[#78350F]/30 hover:border-[#2D4F1E] text-transparent hover:text-[#2D4F1E]/30 bg-white'
                    }`}
                    title={isDone ? 'Oznacz jako niewykonane' : 'Oznacz jako wykonane'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate leading-tight ${
                        isDone ? 'line-through text-[#78350F]/60' : 'text-[#2D4F1E]'
                      }`}
                    >
                      {occ.task.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#78350F]/70 mt-0.5">
                      <span className="bg-[#78350F]/10 px-1.5 py-0.2 rounded font-medium">
                        {occ.task.room}
                      </span>
                      {occ.isOverdue && !isDone && (
                        <span className="text-red-700 font-bold">Zaległe!</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-base" title={occ.task.category}>
                    {getTaskIcon(occ.task.category, 'w-4 h-4 text-[#D97706]')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Widget Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#78350F]/10 flex items-center justify-between text-[11px] text-[#78350F]/70">
        <span className="flex items-center gap-1">
          <span>Profil:</span>
          <strong className="text-[#2D4F1E]">{currentProfile.name} {currentProfile.avatar}</strong>
        </span>
        <span className="font-mono text-[10px]">
          {pendingCount === 0 ? '✨ Czysto i zrobione' : `Pozostało: ${pendingCount}`}
        </span>
      </div>
    </div>
  );
};
