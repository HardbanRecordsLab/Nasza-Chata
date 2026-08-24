import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useChata } from '../../context/ChataContext';
import { getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { TaskOccurrence, TaskDefinition } from '../../types';
import { getTaskIcon } from '../icons/CustomChataIcons';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Camera,
  Plus,
} from 'lucide-react';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { ProofModal } from '../modals/ProofModal';

interface CalendarViewProps {
  onOpenAddTask: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onOpenAddTask }) => {
  const { tasks, completions, currentProfile, toggleTaskCompletion, showToast } = useChata();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null);
  const [proofOccurrence, setProofOccurrence] = useState<TaskOccurrence | null>(null);

  // Month navigation
  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  // Week navigation
  const nextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const prevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));

  // Days calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const daysToRender = eachDayOfInterval({ start: startDate, end: endDate });

  // Selected date occurrences (include overdue if looking at today, otherwise scheduled for that specific date)
  const isSelectedToday = isToday(selectedDate);
  const selectedOccurrences = getOccurrencesForDate(tasks, completions, selectedDate, {
    onlyScheduled: true,
    includeOverdue: isSelectedToday,
  });

  const handleExportIcs = () => {
    window.open('/api/export/calendar.ics', '_blank');
    showToast('Pobieranie kalendarza', 'Plik .ics dla Kalendarza Google/Apple został wygenerowany.', 'success');
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#2D4F1E] to-[#1f3715] rounded-[32px] p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-32 h-32 bg-[#D97706]/20 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-[#D97706]" />
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white capitalize tracking-tight">
              {format(currentDate, 'LLLL yyyy', { locale: pl })}
            </h2>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(new Date());
              }}
              className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-colors border border-white/10 backdrop-blur-sm"
            >
              Dziś
            </button>
          </div>
          <p className="text-sm text-white/70 mt-1.5 font-medium">
            Planuj obowiązki, śledź cykle i utrzymuj dom w ryzach.
          </p>
        </div>

        {/* Navigation + ICS export */}
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          {/* Prev / Next Arrows */}
          <div className="flex items-center bg-black/20 p-1 rounded-2xl backdrop-blur-md border border-white/10">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all"
              title="Poprzedni miesiąc"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-all"
              title="Następny miesiąc"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Export .ICS */}
          <button
            onClick={handleExportIcs}
            className="px-4 py-2.5 bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-[#D97706]/20"
            title="Eksportuj do Google/Apple Calendar (.ics)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Synchronizuj</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[32px] p-5 sm:p-7 shadow-sm border border-[#78350F]/10 relative overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'].map((day, idx) => {
            const isWeekend = idx >= 5;
            return (
              <div 
                key={day} 
                className={`text-xs font-black uppercase tracking-widest py-2 rounded-xl ${
                  isWeekend ? 'text-[#D97706] bg-[#D97706]/5' : 'text-[#78350F]/50'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {daysToRender.map(day => {
            const isCurrMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentToday = isToday(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            const dayOccurrences = getOccurrencesForDate(tasks, completions, day, {
              onlyScheduled: true,
              includeOverdue: isCurrentToday,
            });
            const completedInDay = dayOccurrences.filter(o => o.isCompleted).length;
            const totalInDay = dayOccurrences.length;
            const allCompleted = totalInDay > 0 && completedInDay === totalInDay;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] sm:min-h-[100px] p-2 sm:p-3 rounded-2xl text-left flex flex-col justify-between transition-all group relative ${
                  isSelected
                    ? 'bg-[#2D4F1E] shadow-md scale-[1.02] z-10 ring-4 ring-[#2D4F1E]/20'
                    : isCurrentToday
                    ? 'bg-[#D97706]/10 border-2 border-[#D97706]/30 hover:bg-[#D97706]/20'
                    : isCurrMonth
                    ? 'bg-zinc-50 border border-zinc-100 hover:border-[#2D4F1E]/30 hover:bg-white hover:shadow-sm'
                    : 'bg-transparent border border-transparent opacity-40 hover:opacity-100 hover:bg-zinc-50'
                }`}
              >
                {/* Date Number Badge */}
                <div className="flex items-start justify-between w-full">
                  <span
                    className={`text-sm sm:text-base font-bold w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-display transition-colors ${
                      isSelected
                        ? 'bg-white text-[#2D4F1E] shadow-sm'
                        : isCurrentToday
                        ? 'bg-[#D97706] text-white shadow-sm'
                        : isWeekend && isCurrMonth
                        ? 'text-[#D97706]'
                        : 'text-zinc-600 group-hover:text-[#2D4F1E]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {totalInDay > 0 && (
                    <div
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : allCompleted
                          ? 'bg-[#2D4F1E]/10 text-[#2D4F1E]'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {completedInDay}/{totalInDay}
                    </div>
                  )}
                </div>

                {/* Progress Bar / Dots */}
                {totalInDay > 0 && (
                  <div className="w-full mt-2">
                    <div className="flex gap-0.5 w-full h-1.5 sm:h-2 rounded-full overflow-hidden bg-black/5">
                      {Array.from({ length: totalInDay }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 ${
                            i < completedInDay
                              ? isSelected ? 'bg-white' : 'bg-[#2D4F1E]'
                              : isSelected ? 'bg-white/30' : 'bg-[#D97706]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda List */}
      <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-[#2D4F1E]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#78350F]/10 mb-5 gap-4">
          <div>
            <h3 className="text-xl font-display font-bold text-[#2D4F1E] capitalize flex items-center gap-2">
              <span className="w-2 h-8 rounded-full bg-[#D97706]" />
              {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
            </h3>
            <p className="text-sm text-[#78350F]/70 mt-1 ml-4">
              Agenda zadań wybranego dnia
            </p>
          </div>

          <button
            onClick={onOpenAddTask}
            className="px-5 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#2D4F1E]/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Zaplanuj coś</span>
          </button>
        </div>

        {/* Selected Date Tasks */}
        <div className="space-y-3 relative z-10">
          {selectedOccurrences.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-zinc-50 rounded-3xl border border-zinc-100 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                <CheckCircle2 className="w-8 h-8 text-zinc-300" />
              </div>
              <h4 className="text-zinc-600 font-bold text-lg mb-1">Czysta karta</h4>
              <p className="text-zinc-400 text-sm max-w-[250px]">
                Nie zaplanowano żadnych obowiązków na ten dzień. Możesz odpocząć lub dodać nowe zadanie!
              </p>
            </div>
          ) : (
            selectedOccurrences.map(occ => {
              const { task, isCompleted, completion } = occ;
              return (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md ${
                    isCompleted
                      ? 'bg-zinc-50 border-emerald-100/50 opacity-80'
                      : 'bg-white border-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner ${
                      isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {getTaskIcon(task.name, task.category, isCompleted)}
                    </div>
                    <div className="min-w-0">
                      <h4
                        onClick={() => setSelectedOccurrence(occ)}
                        className={`text-base sm:text-lg font-bold cursor-pointer hover:text-[#D97706] truncate transition-colors ${
                          isCompleted ? 'line-through text-zinc-400' : 'text-zinc-800'
                        }`}
                      >
                        {task.name}
                      </h4>
                      <div className="text-xs sm:text-sm text-zinc-500 font-medium flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100">{task.room}</span>
                        <span>•</span>
                        <span className="capitalize">{task.frequency === 'daily' ? 'Codziennie' : task.frequency === 'weekly' ? 'Co tydzień' : task.frequency === 'twice_weekly' ? '2× w tyg.' : 'Co miesiąc'}</span>
                      </div>
                      
                      {isCompleted && completion && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Zrobił(a): {completion.completedByName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
                    <button
                      onClick={() => setProofOccurrence(occ)}
                      className={`p-3 rounded-2xl text-sm transition-all ${
                        completion?.proofBeforeUrl || completion?.proofAfterUrl
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'
                      }`}
                      title="Zdjęcie dowodu"
                    >
                      <Camera className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => toggleTaskCompletion(task.id, selectedDate)}
                      className={`px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-[#D97706] hover:bg-[#b45309] text-white shadow-lg shadow-[#D97706]/20'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Odhaczone</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-5 h-5 text-white/70" />
                          <span>Wykonaj</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedOccurrence && (
        <TaskDetailModal
          occurrence={selectedOccurrence}
          onClose={() => setSelectedOccurrence(null)}
        />
      )}

      {proofOccurrence && (
        <ProofModal
          occurrence={proofOccurrence}
          onClose={() => setProofOccurrence(null)}
        />
      )}
    </div>
  );
};
