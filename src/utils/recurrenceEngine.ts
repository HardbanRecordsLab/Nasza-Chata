import { format, getISOWeek, getYear, getMonth, differenceInDays, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TaskDefinition, TaskCompletion, TaskOccurrence } from '../types';

/**
 * Checks if a task is active in a given month (1 = Jan, 12 = Dec).
 * Handles year-wrapping seasonal ranges (e.g. Oct-Mar: 10 -> 3, Sep-Apr: 9 -> 4).
 */
export function isSeasonalActive(task: TaskDefinition, month1to12: number): boolean {
  if (task.seasonStart === null || task.seasonEnd === null) {
    return true;
  }
  const { seasonStart, seasonEnd } = task;
  if (seasonStart <= seasonEnd) {
    return month1to12 >= seasonStart && month1to12 <= seasonEnd;
  } else {
    // Wrapping across New Year (e.g. 10 to 3 means Oct(10), Nov(11), Dec(12), Jan(1), Feb(2), Mar(3))
    return month1to12 >= seasonStart || month1to12 <= seasonEnd;
  }
}

export function getSeasonLabel(seasonStart: number | null, seasonEnd: number | null): string {
  if (seasonStart === null || seasonEnd === null) return 'Cały rok';
  const monthNames = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  return `${monthNames[seasonStart - 1]} – ${monthNames[seasonEnd - 1]}`;
}

/**
 * Generates the period key for completion tracking.
 * For twice_weekly:
 * - Days 1, 2, 3 (Mon-Wed) -> Part 1 ('YYYY-Www-1')
 * - Days 4, 5, 6, 0 (Thu-Sun) -> Part 2 ('YYYY-Www-2')
 */
export function getPeriodKey(task: TaskDefinition, date: Date): string {
  const year = getYear(date);
  const month = format(date, 'yyyy-MM');
  const dayStr = format(date, 'yyyy-MM-dd');
  const isoWeek = getISOWeek(date);
  const paddedWeek = isoWeek.toString().padStart(2, '0');

  switch (task.frequency) {
    case 'daily':
      return dayStr;

    case 'every_other_day':
      return dayStr;

    case 'twice_weekly': {
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday...
      const isFirstHalf = dayOfWeek >= 1 && dayOfWeek <= 3; // Mon, Tue, Wed
      const part = isFirstHalf ? 1 : 2;
      return `${year}-W${paddedWeek}-${part}`;
    }

    case 'weekly':
      return `${year}-W${paddedWeek}`;

    case 'monthly':
      return month;

    default:
      return dayStr;
  }
}

/**
 * Calculates how many times a twice_weekly task was completed in the current week (0, 1, or 2).
 */
export function getTwiceWeeklyProgress(
  taskId: string,
  completions: TaskCompletion[],
  date: Date
): { count: number; part1Done: boolean; part2Done: boolean } {
  const year = getYear(date);
  const isoWeek = getISOWeek(date);
  const paddedWeek = isoWeek.toString().padStart(2, '0');

  const part1Key = `${year}-W${paddedWeek}-1`;
  const part2Key = `${year}-W${paddedWeek}-2`;

  const part1Done = completions.some(c => c.taskId === taskId && c.periodKey === part1Key);
  const part2Done = completions.some(c => c.taskId === taskId && c.periodKey === part2Key);

  const count = (part1Done ? 1 : 0) + (part2Done ? 1 : 0);
  return { count, part1Done, part2Done };
}

/**
 * Expected frequency cycle in days for Tody-style cleanliness calculation.
 */
export function getFrequencyIntervalDays(frequency: string): number {
  switch (frequency) {
    case 'daily': return 1;
    case 'every_other_day': return 2;
    case 'twice_weekly': return 3.5;
    case 'weekly': return 7;
    case 'monthly': return 30;
    default: return 7;
  }
}

/**
 * Find the most recent completion for a task.
 */
export function getLastCompletion(taskId: string, completions: TaskCompletion[]): TaskCompletion | undefined {
  const taskCompletions = completions
    .filter(c => c.taskId === taskId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  return taskCompletions[0];
}

/**
 * Calculates days elapsed since last completion and Tody cleanliness score (0 = clean, 100 = critical/overdue).
 */
export function calculateCleanlinessScore(task: TaskDefinition, completions: TaskCompletion[], currentDate: Date): {
  daysSinceLast: number;
  score: number; // 0 to 100+
  percent: number;
  status: 'clean' | 'moderate' | 'due' | 'overdue';
  colorClass: string;
  label: string;
} {
  const last = getLastCompletion(task.id, completions);
  const targetDays = getFrequencyIntervalDays(task.frequency);

  let daysSinceLast = targetDays; // default fallback if never completed
  if (last) {
    const completedDate = parseISO(last.completedAt);
    daysSinceLast = Math.max(0, differenceInDays(currentDate, completedDate));
  } else {
    // If never completed, assume it's somewhat overdue
    daysSinceLast = targetDays + 1;
  }

  const ratio = daysSinceLast / targetDays;
  const score = Math.min(150, Math.round(ratio * 100));

  let status: 'clean' | 'moderate' | 'due' | 'overdue' = 'clean';
  let colorClass = 'bg-emerald-500';
  let label = 'Czysto i zrobione';
  let percent = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));

  if (score <= 60) {
    status = 'clean';
    colorClass = 'bg-emerald-500';
    label = 'Świeżo zrobione';
    percent = 100;
  } else if (score <= 95) {
    status = 'moderate';
    colorClass = 'bg-amber-400';
    label = 'W normie';
    percent = Math.round(100 - score / 2);
  } else if (score <= 110) {
    status = 'due';
    colorClass = 'bg-amber-600';
    label = 'Pora zrobić';
    percent = 30;
  } else {
    status = 'overdue';
    colorClass = 'bg-red-500';
    label = 'Zaległe!';
    percent = 10;
  }

  return { daysSinceLast, score, percent, status, colorClass, label };
}

/**
 * Hash helper to stably distribute weekly/monthly tasks across days
 */
function getTaskDayOffset(taskId: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash << 5) - hash + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

/**
 * Determines if a task is scheduled on a given date for calendar presentation.
 */
export function isTaskScheduledOnDate(task: TaskDefinition, targetDate: Date): boolean {
  const month = getMonth(targetDate) + 1; // 1-12
  if (!isSeasonalActive(task, month)) {
    return false;
  }

  const dayOfWeek = targetDate.getDay(); // 0 is Sun, 1 is Mon, 2 is Tue...
  const dayOfMonth = targetDate.getDate();

  switch (task.frequency) {
    case 'daily':
      return true;

    case 'every_other_day': {
      // Deterministic alternating pattern based on date day number
      const daysSinceEpoch = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));
      const offset = getTaskDayOffset(task.id, 2);
      return (daysSinceEpoch + offset) % 2 === 0;
    }

    case 'twice_weekly': {
      // Part 1: Tuesday (2) or Wednesday (3)
      // Part 2: Friday (5) or Saturday (6)
      const offset = getTaskDayOffset(task.id, 2);
      const part1Day = offset === 0 ? 2 : 3; // Tue or Wed
      const part2Day = offset === 0 ? 5 : 6; // Fri or Sat
      return dayOfWeek === part1Day || dayOfWeek === part2Day;
    }

    case 'weekly': {
      // Stable day of week per weekly task (1=Mon to 6=Sat)
      if (task.category === 'garden' || task.category === 'wood' || task.category === 'stove') {
        return dayOfWeek === 6; // Saturday for outdoor & heavy wood/garden chores
      }
      if (task.category === 'cleaning' || task.category === 'laundry') {
        // Friday or Saturday
        const cleanDay = getTaskDayOffset(task.id, 2) === 0 ? 5 : 6;
        return dayOfWeek === cleanDay;
      }
      // Distribute other weekly chores from Tuesday to Saturday
      const scheduledDay = 1 + getTaskDayOffset(task.id, 6); // 1 (Mon) to 6 (Sat)
      return dayOfWeek === scheduledDay;
    }

    case 'monthly': {
      // 1st, 10th or 15th of the month based on task
      const targetDay = [1, 10, 15, 20][getTaskDayOffset(task.id, 4)];
      return dayOfMonth === targetDay;
    }

    default:
      return true;
  }
}

export interface OccurrencesOptions {
  onlyScheduled?: boolean;
  includeOverdue?: boolean;
  includeAllNonArchived?: boolean;
}

/**
 * Returns full task occurrence breakdown for a target date.
 * Filters by seasonal activity and schedule appropriately so calendar doesn't duplicate everything every single day.
 */
export function getOccurrencesForDate(
  tasks: TaskDefinition[],
  completions: TaskCompletion[],
  targetDate: Date,
  options: OccurrencesOptions = { onlyScheduled: true, includeOverdue: true }
): TaskOccurrence[] {
  const month = getMonth(targetDate) + 1;
  const dateStr = format(targetDate, 'yyyy-MM-dd');

  return tasks
    .filter(t => !t.archivedAt)
    .filter(task => {
      // If caller explicitly requested all non-archived without scheduling filters
      if (options.includeAllNonArchived) {
        return true;
      }

      const activeSeasonal = isSeasonalActive(task, month);
      const periodKey = getPeriodKey(task, targetDate);
      const hasCompletion = completions.some(
        c => c.taskId === task.id && c.periodKey === periodKey
      );

      // If task was actually completed for this date/period, always include it
      if (hasCompletion) {
        return true;
      }

      // If task is not in season this month, do not schedule
      if (!activeSeasonal) {
        return false;
      }

      // If scheduled filtering is active
      if (options.onlyScheduled !== false) {
        const isScheduledToday = isTaskScheduledOnDate(task, targetDate);
        if (isScheduledToday) {
          return true;
        }

        // Also include if overdue and caller requested overdue inclusion (e.g. for TodayView)
        if (options.includeOverdue) {
          const { score } = calculateCleanlinessScore(task, completions, targetDate);
          if (score > 100) {
            return true;
          }
        }

        return false;
      }

      return true;
    })
    .map(task => {
      const activeSeasonal = isSeasonalActive(task, month);
      const periodKey = getPeriodKey(task, targetDate);

      const completion = completions.find(
        c => c.taskId === task.id && c.periodKey === periodKey
      );
      const isCompleted = !!completion;

      let twiceWeeklyCount = 0;
      let twiceWeeklyPart: 1 | 2 = 1;
      if (task.frequency === 'twice_weekly') {
        const dayOfWeek = targetDate.getDay();
        twiceWeeklyPart = (dayOfWeek >= 1 && dayOfWeek <= 3) ? 1 : 2;
        const progress = getTwiceWeeklyProgress(task.id, completions, targetDate);
        twiceWeeklyCount = progress.count;
      }

      const { daysSinceLast, score } = calculateCleanlinessScore(task, completions, targetDate);
      const isOverdue = !isCompleted && score > 100;

      // Smart suggested priority calculation
      let suggestedPriority = task.defaultOrder;
      if (isOverdue) suggestedPriority -= 50; // Boost overdue
      if (task.category === 'wood' || task.category === 'stove') suggestedPriority -= 20; // Morning heat essentials

      return {
        task,
        date: dateStr,
        periodKey,
        isCompleted,
        completion,
        isOverdue,
        isSeasonalActive: activeSeasonal,
        twiceWeeklyPart,
        twiceWeeklyCount,
        daysSinceLastCompleted: daysSinceLast,
        cleanlinessScore: score,
        suggestedPriority,
      };
    });
}
