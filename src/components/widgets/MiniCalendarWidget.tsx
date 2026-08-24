import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useChata } from '../../context/ChataContext';
import { getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface MiniCalendarWidgetProps {
  onSelectDate?: (date: Date) => void;
}

export const MiniCalendarWidget: React.FC<MiniCalendarWidgetProps> = ({ onSelectDate }) => {
  const { tasks, completions } = useChata();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysToRender = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-white rounded-[24px] border border-[#78350F]/10 p-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#D97706]" />
          <h3 className="text-sm font-bold text-[#2D4F1E]">
            {format(currentDate, 'LLLL yyyy', { locale: pl })}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
            className="p-1.5 rounded-lg hover:bg-[#78350F]/10 text-[#78350F] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-0.5 text-[10px] font-bold text-[#D97706] bg-[#D97706]/10 rounded-full hover:bg-[#D97706]/20 transition-colors"
          >
            Dziś
          </button>
          <button
            onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
            className="p-1.5 rounded-lg hover:bg-[#78350F]/10 text-[#78350F] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Day Name Headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day, idx) => (
          <div
            key={day}
            className={`text-[9px] font-black uppercase tracking-wider py-1 rounded ${
              idx >= 5 ? 'text-[#D97706]' : 'text-[#78350F]/40'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {daysToRender.map(day => {
          const isCurrMonth = isSameMonth(day, currentDate);
          const isCurrentToday = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          const dayOccurrences = getOccurrencesForDate(tasks, completions, day, {
            onlyScheduled: true,
            includeOverdue: isCurrentToday,
          });
          const completedCount = dayOccurrences.filter(o => o.isCompleted).length;
          const totalCount = dayOccurrences.length;
          const allDone = totalCount > 0 && completedCount === totalCount;
          const hasPartial = completedCount > 0 && !allDone;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate?.(day)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all group ${
                !isCurrMonth
                  ? 'opacity-30'
                  : isCurrentToday
                  ? 'bg-[#D97706]/10 ring-1 ring-[#D97706]/30'
                  : 'hover:bg-[#2D4F1E]/5'
              }`}
            >
              <span
                className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                  isCurrentToday
                    ? 'bg-[#D97706] text-white'
                    : isWeekend && isCurrMonth
                    ? 'text-[#D97706]'
                    : 'text-zinc-600 group-hover:text-[#2D4F1E]'
                }`}
              >
                {format(day, 'd')}
              </span>

              {/* Progress dots */}
              {totalCount > 0 && (
                <div className="flex gap-px mt-0.5">
                  {totalCount <= 4 ? (
                    Array.from({ length: totalCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          i < completedCount
                            ? 'bg-[#2D4F1E]'
                            : 'bg-[#D97706]/40'
                        }`}
                      />
                    ))
                  ) : (
                    <>
                      <div
                        className={`w-1 h-1 rounded-full ${
                          allDone ? 'bg-[#2D4F1E]' : hasPartial ? 'bg-amber-400' : 'bg-[#D97706]/40'
                        }`}
                      />
                      <span className="text-[7px] font-bold text-[#78350F]/60 leading-none self-center">
                        {completedCount}/{totalCount}
                      </span>
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
