import React, { useState, useMemo } from 'react';
import { useChata } from '../../context/ChataContext';
import { getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { TaskCategory } from '../../types';
import { getTaskIcon } from '../icons/CustomChataIcons';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ShieldCheck,
  Users,
  CalendarRange,
  Search,
  Printer,
  Shuffle,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  ClipboardList,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  Camera,
  Home,
  TreePine,
  Layers,
  Plus,
  Eye,
  Video,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { VisualZoneModal } from '../modals/VisualZoneModal';

type InnerTab = 'assign' | 'weekly' | 'visual';

const CATEGORY_OPTIONS: { id: TaskCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'cleaning', label: '🧹 Sprzątanie' },
  { id: 'dishes', label: '🍽️ Naczynia' },
  { id: 'laundry', label: '👕 Pranie' },
  { id: 'garden', label: '🌿 Ogród' },
  { id: 'plants', label: '🪴 Rośliny' },
  { id: 'shopping', label: '🛒 Zakupy' },
  { id: 'wood', label: '🪵 Drewno' },
  { id: 'stove', label: '🔥 Piec' },
  { id: 'maintenance', label: '🔧 Utrzymanie' },
  { id: 'seasonal', label: '❄️ Sezonowe' },
  { id: 'organizational', label: '📋 Organizacyjne' },
];

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Codziennie',
  every_other_day: 'Co 2 dni',
  twice_weekly: '2× tydz.',
  weekly: 'Tygodniowo',
  monthly: 'Miesięcznie',
};

function getMonday(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export const AdminPlanView: React.FC = () => {
  const {
    currentProfile,
    profiles,
    tasks,
    completions,
    assignTask,
    weeklyPlans,
    getWeeklyPlan,
    setWeeklyAssignment,
    saveWeeklyPlan,
    deleteWeeklyPlan,
    visualZones,
    addVisualZone,
    deleteVisualZone,
    createWalkinGraph,
    createAutoHotspots,
    showToast,
  } = useChata();

  const isAdmin = currentProfile.isAdmin || currentProfile.id === 'kamil';
  const [innerTab, setInnerTab] = useState<InnerTab>('assign');

  // --- TAB 1: assignments ---
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => !t.archivedAt)
      .filter(t => {
        if (catFilter !== 'all' && t.category !== catFilter) return false;
        if (assigneeFilter === 'unassigned' && t.assignedTo) return false;
        if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && t.assignedTo !== assigneeFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return t.name.toLowerCase().includes(q) || t.room.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (a.category.localeCompare(b.category) || a.defaultOrder - b.defaultOrder));
  }, [tasks, catFilter, assigneeFilter, search]);

  const countsByAssignee = useMemo(() => {
    const c: Record<string, number> = { unassigned: 0 };
    profiles.forEach(p => (c[p.id] = 0));
    tasks.forEach(t => {
      if (t.assignedTo && c[t.assignedTo] !== undefined) c[t.assignedTo]++;
      else c.unassigned++;
    });
    return c;
  }, [tasks, profiles]);

  const handleAutoBalance = () => {
    const cleanTasks = tasks.filter(t => !t.archivedAt && t.category === 'cleaning');
    const ids = profiles.map(p => p.id);
    // divide evenly
    cleanTasks.forEach((t, idx) => {
      const target = ids[idx % ids.length];
      assignTask(t.id, target);
    });
    showToast('Rozdzielono po równo', `${cleanTasks.length} zadań sprzątania rozdzielonych między ${profiles.length} osoby`, 'success');
  };

  const handleClearAssignments = () => {
    if (!confirm('Wyczyścić wszystkie przydziały sprzątania?')) return;
    tasks.filter(t => t.category === 'cleaning').forEach(t => assignTask(t.id, null));
    showToast('Wyczyszczono przydziały', 'Wszystkie sprzątania jako „każdy"', 'info');
  };

  // --- TAB 2: weekly plan ---
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => addWeeks(getMonday(new Date()), 1)); // default next week
  const weekStart = getMonday(weekAnchor);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weeklyPlan = getWeeklyPlan(weekStartStr);
  const [weeklyNote, setWeeklyNote] = useState('');

  React.useEffect(() => {
    if (weeklyPlan?.note !== undefined) setWeeklyNote(weeklyPlan.note || '');
    else setWeeklyNote('');
  }, [weeklyPlan?.note, weekStartStr]);

  const weekOccurrences = useMemo(() => {
    return weekDays.map(d => ({
      date: d,
      occ: getOccurrencesForDate(tasks, completions, d),
    }));
  }, [weekDays, tasks, completions]);

  const weeklyCounts = useMemo(() => {
    const c: Record<string, number> = { unassigned: 0 };
    profiles.forEach(p => (c[p.id] = 0));
    weekOccurrences.forEach(({ occ }) => {
      occ.forEach(o => {
        const eff = weeklyPlan?.assignments[o.task.id] ?? o.task.assignedTo ?? null;
        if (eff && c[eff] !== undefined) c[eff]++;
        else c.unassigned++;
      });
    });
    return c;
  }, [weekOccurrences, weeklyPlan, profiles]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyFromAssignments = () => {
    // create weekly plan from current global assignments
    const assignments: Record<string, string | null> = {};
    tasks.forEach(t => {
      if (t.assignedTo) assignments[t.id] = t.assignedTo;
    });
    const plan = {
      id: weekStartStr,
      weekStart: weekStartStr,
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      assignments,
      note: weeklyNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: currentProfile.id,
    };
    saveWeeklyPlan(plan as any);
    showToast('Skopiowano przydziały stałe', `Plan na tydzień ${weekStartStr} utworzony`, 'success');
  };

  const handleSaveNote = () => {
    const existing = weeklyPlan;
    if (existing) {
      saveWeeklyPlan({ ...existing, note: weeklyNote, updatedAt: new Date().toISOString() });
    } else {
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      saveWeeklyPlan({
        id: weekStartStr,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        assignments: {},
        note: weeklyNote,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: currentProfile.id,
      } as any);
    }
  };

  // --- TAB 3: wizualizacja przestrzenna ---
  const [selectedVisualZone, setSelectedVisualZone] = useState<any | null>(null);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<'room' | 'garden' | 'utility'>('room');
  const [visualFilter, setVisualFilter] = useState<'all' | 'room' | 'garden'>('all');

  const HOUSE_FLOORS = [
    { name: 'Dół', icon: Home, rooms: ['Dół Ganek+Kotłownia', 'Kuchnia', 'Łazienka'] },
    { name: 'Góra', icon: Layers, rooms: ['Sypialnia Góra', 'Pokój Olivii', 'Góra Przedpokój', 'Schody'] },
  ];

  const filteredVisualZones = visualFilter === 'all' ? visualZones : visualZones.filter(z => z.zoneType === visualFilter);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-white rounded-[32px] border border-amber-200 p-8 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#2D4F1E]">Tylko dla admina</h2>
          <p className="text-sm text-[#78350F]/70 mt-2">
            To narzędzie jest dostępne tylko dla Kamila (admina). Przełącz profil na <b>Kamil</b>, aby zarządzać przydziałami i planem tygodniowym.
          </p>
          <p className="text-xs text-[#78350F]/50 mt-2">Aktualny profil: {currentProfile.name} {currentProfile.isAdmin ? '(admin)' : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 animate-in fade-in">
      {/* Header */}
      <div className="bg-[#2D4F1E] text-[#FDFCF0] rounded-[32px] p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none -translate-y-2 translate-x-6">
          <ClipboardList size={140} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-300" />
            <span className="text-[10px] font-black tracking-widest uppercase bg-white/15 px-2 py-0.5 rounded-full">Panel admina</span>
          </div>
          <h1 className="text-xl font-display font-bold">Plan sprzątania & przydziały</h1>
          <p className="text-xs text-[#FDFCF0]/80 mt-1 max-w-2xl">
            Oznacz kto za co odpowiada na stałe, a potem zrób plan na konkretny tydzień z wyprzedzeniem. Plan tygodniowy nadpisuje przydział stały — idealny gdy ktoś wyjeżdża. Druk dodatkowo.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
            {profiles.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px]">{p.avatar}</span>
                <b>{p.name}</b>
                <span className="opacity-70">{countsByAssignee[p.id] ?? 0} zadań</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-300/30 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> Nieprzypisane: {countsByAssignee.unassigned}
            </span>
          </div>
        </div>
      </div>

      {/* Inner tabs — Wspólny vs Zarządzanie + Wizualizacja */}
      <div className="flex gap-2 p-1 bg-white rounded-2xl border border-[#78350F]/10 w-fit shadow-xs no-print overflow-x-auto">
        <button
          onClick={() => setInnerTab('assign')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${innerTab === 'assign' ? 'bg-[#2D4F1E] text-white shadow-sm' : 'text-[#78350F]/70 hover:bg-[#78350F]/5'}`}
        >
          <Users className="w-4 h-4" /> Osoby
        </button>
        <button
          onClick={() => setInnerTab('weekly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${innerTab === 'weekly' ? 'bg-[#2D4F1E] text-white shadow-sm' : 'text-[#78350F]/70 hover:bg-[#78350F]/5'}`}
        >
          <CalendarRange className="w-4 h-4" /> Plan
        </button>
        <button
          onClick={() => setInnerTab('visual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${innerTab === 'visual' ? 'bg-[#2D4F1E] text-white shadow-sm' : 'text-[#78350F]/70 hover:bg-[#78350F]/5'}`}
        >
          <Camera className="w-4 h-4" /> Wizualizacja
        </button>
      </div>

      {innerTab === 'assign' && (
        <div className="space-y-4">
          {/* Filters + bulk */}
          <div className="bg-white rounded-[24px] border border-[#78350F]/10 p-4 shadow-xs space-y-3 no-print">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78350F]/40" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Szukaj: odkurzanie, kuchnia, łazienka..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/20"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-[#FDFCF0] border border-[#78350F]/10 rounded-xl px-2 py-1">
                  <Filter className="w-3.5 h-3.5 text-[#78350F]/50" />
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-transparent text-xs font-bold text-[#2D4F1E] focus:outline-none">
                    {CATEGORY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs font-bold">
                  <option value="all">Wszyscy</option>
                  <option value="unassigned">Nieprzypisane</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleAutoBalance} className="px-3 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5" /> Rozdziel po równo (sprzątanie)
              </button>
              <button onClick={handleClearAssignments} className="px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Eraser className="w-3.5 h-3.5" /> Wyczyść sprzątania
              </button>
              <span className="text-[11px] text-[#78350F]/60 self-center ml-1">Pokazano {filteredTasks.length} z {tasks.length} zadań</span>
            </div>
          </div>

          {/* Assignment table */}
          <div className="bg-white rounded-[24px] border border-[#78350F]/10 shadow-xs overflow-hidden">
            <div className="max-h-[64vh] overflow-auto divide-y divide-[#78350F]/5">
              {filteredTasks.length === 0 && <div className="p-8 text-center text-sm text-[#78350F]/60">Brak zadań dla filtra.</div>}
              {filteredTasks.map(task => {
                const assignee = task.assignedTo;
                return (
                  <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-[#FDFCF0]/70 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[#2D4F1E]/10 border border-[#2D4F1E]/10 flex items-center justify-center text-[#2D4F1E] shrink-0 mt-0.5">
                        {getTaskIcon(task.name, task.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2D4F1E] leading-tight truncate">{task.name}</div>
                        <div className="text-[11px] text-[#78350F]/70 flex flex-wrap gap-1.5 mt-0.5">
                          <span className="bg-[#78350F]/10 px-1.5 py-0.5 rounded-full">{task.category}</span>
                          <span>{FREQUENCY_LABEL[task.frequency] || task.frequency}</span>
                          <span>• {task.room}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                      {assignee && profiles.find(p => p.id === assignee) && (
                        <ProfileAvatar profile={profiles.find(p => p.id === assignee)!} size="sm" />
                      )}
                      <select
                        value={assignee || ''}
                        onChange={e => assignTask(task.id, e.target.value || null)}
                        className="px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs font-bold min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/20"
                      >
                        <option value="">— Nieprzypisane (każdy) —</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.avatar} {p.name} — {p.roleTitle}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {innerTab === 'weekly' && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="bg-white rounded-[24px] border border-[#78350F]/10 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekAnchor(d => subWeeks(d, 1))} className="p-2 rounded-xl hover:bg-[#78350F]/10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-sm font-bold text-[#2D4F1E]">
                  {format(weekStart, 'd MMM', { locale: pl })} – {format(weekEnd, 'd MMM yyyy', { locale: pl })}
                </div>
                <div className="text-[11px] text-[#78350F]/70">
                  {format(weekStart, 'yyyy-MM-dd')} → {format(weekEnd, 'yyyy-MM-dd')}
                  {format(weekStart, 'yyyy-MM-dd') === format(getMonday(new Date()), 'yyyy-MM-dd') && ' • Ten tydzień'}
                  {format(weekStart, 'yyyy-MM-dd') === format(getMonday(addWeeks(new Date(), 1)), 'yyyy-MM-dd') && ' • Następny tydzień'}
                </div>
              </div>
              <button onClick={() => setWeekAnchor(d => addWeeks(d, 1))} className="p-2 rounded-xl hover:bg-[#78350F]/10">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setWeekAnchor(getMonday(new Date()))} className="px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs font-bold">Dziś</button>
              <button onClick={() => setWeekAnchor(addWeeks(getMonday(new Date()), 1))} className="px-3 py-2 bg-[#D97706] text-white rounded-xl text-xs font-bold">Następny tydzień</button>
              <button onClick={handlePrint} className="px-3 py-2 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Drukuj plan (dodatkowo)
              </button>
            </div>
          </div>

          {/* Weekly note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2 no-print">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Notatka na tydzień (np. Olivia na kolonii, goście w weekend)</label>
              <textarea
                value={weeklyNote}
                onChange={e => setWeeklyNote(e.target.value)}
                placeholder="Wpisz notatkę widoczną na wydruku..."
                className="mt-1 w-full p-2 bg-white border border-amber-200 rounded-xl text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <button onClick={handleSaveNote} className="self-end px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Zapisz
            </button>
          </div>

          {/* Weekly summary */}
          <div className="bg-white rounded-2xl border border-[#78350F]/10 p-3 flex flex-wrap gap-2 text-xs no-print">
            <span className="font-bold">Podsumowanie tygodnia:</span>
            {profiles.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 bg-[#2D4F1E]/5 border border-[#2D4F1E]/10 px-2 py-1 rounded-full">
                <span>{p.avatar}</span> {p.name}: <b>{weeklyCounts[p.id] ?? 0}</b>
              </span>
            ))}
            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Nieprzypisane: <b>{weeklyCounts.unassigned ?? 0}</b></span>
            <button onClick={handleCopyFromAssignments} className="ml-auto px-3 py-1.5 bg-white border border-[#78350F]/15 rounded-xl text-xs font-bold flex items-center gap-1">
              <Copy className="w-3.5 h-3.5" /> Skopiuj z przydziałów stałych
            </button>
            {weeklyPlan && (
              <button onClick={() => deleteWeeklyPlan(weekStartStr)} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Wyczyść nadpisania
              </button>
            )}
          </div>

          {/* Weekly grid — printable */}
          <div id="weekly-print" className="bg-white rounded-[24px] border border-[#78350F]/10 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#78350F]/10 flex items-start justify-between gap-4 print:pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#D97706]" />
                  Plan sprzątania — {format(weekStart, 'd MMMM yyyy', { locale: pl })} – {format(weekEnd, 'd MMMM yyyy', { locale: pl })}
                </h3>
                <p className="text-[11px] text-[#78350F]/70">Nasza Chata • przydziały tygodniowe • {weeklyNote ? `Notatka: ${weeklyNote}` : 'Brak notatki'}</p>
              </div>
              <div className="hidden print:block text-[10px] text-[#78350F]/60">Wydruk: {new Date().toLocaleString('pl-PL')} • Admin: {currentProfile.name}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-[#78350F]/10">
              {weekDays.map(d => {
                const dayStr = format(d, 'yyyy-MM-dd');
                const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const occ = getOccurrencesForDate(tasks, completions, d);
                // sort: assigned first
                const sorted = [...occ].sort((a, b) => {
                  const ae = weeklyPlan?.assignments[a.task.id] ?? a.task.assignedTo ?? '';
                  const be = weeklyPlan?.assignments[b.task.id] ?? b.task.assignedTo ?? '';
                  return (ae || 'zzz').localeCompare(be || 'zzz');
                });
                return (
                  <div key={dayStr} className={`p-3 min-h-[180px] ${isToday ? 'bg-amber-50/60' : ''}`}>
                    <div className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-[#D97706]' : 'text-[#78350F]/70'}`}>
                      {format(d, 'EEE', { locale: pl })} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] ${isToday ? 'bg-[#D97706] text-white' : 'bg-[#78350F]/10'}`}>{format(d, 'd MMM', { locale: pl })}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {sorted.length === 0 && <div className="text-[11px] text-[#78350F]/40 italic">Brak zadań</div>}
                      {sorted.map(o => {
                        const effId = (weeklyPlan?.assignments[o.task.id] ?? o.task.assignedTo ?? null) as string | null;
                        const effProfile = effId ? profiles.find(p => p.id === effId) : null;
                        return (
                          <div key={o.task.id + o.periodKey} className="group bg-[#FDFCF0] border border-[#78350F]/10 rounded-xl p-2 flex flex-col gap-1 hover:border-[#D97706]/30 transition-colors">
                            <div className="flex items-start gap-1.5">
                              <span className="w-5 h-5 rounded-lg bg-white border border-[#78350F]/10 flex items-center justify-center shrink-0">{getTaskIcon(o.task.name, o.task.category)}</span>
                              <span className="text-[11px] font-bold leading-tight text-[#2D4F1E] line-clamp-2">{o.task.name}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] text-[#78350F]/60">{o.task.room} • {FREQUENCY_LABEL[o.task.frequency] || o.task.frequency}</span>
                              {effProfile ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white border border-[#78350F]/10 px-1.5 py-0.5 rounded-full">
                                  <span>{effProfile.avatar}</span> {effProfile.name}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Każdy</span>
                              )}
                            </div>
                            <select
                              value={effId || ''}
                              onChange={e => setWeeklyAssignment(weekStartStr, o.task.id, e.target.value || null)}
                              className="mt-0.5 w-full px-2 py-1 bg-white border border-[#78350F]/15 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#2D4F1E]/20 no-print"
                            >
                              <option value="">— Każdy —</option>
                              {profiles.map(p => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
                            </select>
                            <div className="hidden print:block text-[10px] text-center font-bold border-t border-dashed border-[#78350F]/20 pt-1 mt-1">☐ {effProfile ? effProfile.name : 'Do zrobienia'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#FDFCF0] border-t border-[#78350F]/10 flex flex-wrap gap-2 text-[11px] print:mt-2">
              <span className="font-bold">Legenda:</span>
              {profiles.map(p => <span key={p.id} className="inline-flex items-center gap-1"><span>{p.avatar}</span> {p.name} = {p.roleTitle}</span>)}
              <span className="ml-auto text-[#78350F]/60">☐ = do odhaczenia na wydruku</span>
            </div>
          </div>

          <div className="no-print flex justify-center">
            <button onClick={handlePrint} className="px-5 py-3 bg-[#2D4F1E] hover:bg-[#1f3715] text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md">
              <Printer className="w-4 h-4" /> Drukuj plan tygodnia (dodatkowo)
            </button>
          </div>
        </div>
      )}

      {innerTab === 'visual' && (
        <div className="space-y-4">
          {/* Wizualizacja header — Panel Zarządzania + Wspólny */}
          <div className="bg-white rounded-[24px] border border-[#78350F]/10 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#D97706]" /> Przestrzenna wizualizacja — pomieszczenia jak w domu
              </h3>
              <p className="text-[11px] text-[#78350F]/70">Wejdź w pokój → zobacz oś czasu zdjęć/wideo, porównaj „miesiąc temu vs dziś”, dodaj hotspoty. <b>Panel Wspólny</b> = podgląd dla wszystkich, <b>Zarządzanie</b> = dodawanie/edycja stref.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1 bg-[#78350F]/5 p-1 rounded-full border border-[#78350F]/10">
                {(['all','room','garden'] as const).map(f => (
                  <button key={f} onClick={() => setVisualFilter(f)} className={`px-3 py-1 rounded-full text-[11px] font-bold ${visualFilter===f ? 'bg-[#2D4F1E] text-white' : 'text-[#78350F]/70'}`}>{f==='all'?'Wszystkie':f==='room'?'Pomieszczenia':'Ogród'}</button>
                ))}
              </div>
              <button onClick={() => setIsAddingZone(true)} className="px-3.5 py-2 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Dodaj strefę
              </button>
            </div>
          </div>

          {/* Walk-In CPU — bez GPU */}
          <div className="bg-gradient-to-br from-[#2D4F1E] to-[#1a3a12] rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/10">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-300" /> Virtual Walk-In — CPU, bez GPU
              </h4>
              <p className="text-[11px] text-white/70 mt-0.5 max-w-xl">
                Photo-based: zdjęcia/wideo → punkty widokowe → graf połączeń → hotspoty przejścia. Działa na zwykłym CPU/VPS. Wejdź w pokój → Walk-In → przechodź między widokami.
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                {visualZones.filter(z => z.viewpointLinks && z.viewpointLinks.length > 0).length}/{visualZones.length} stref ma Walk-In • {visualZones.reduce((s,z)=>s+(z.viewpointLinks?.length||0),0)} połączeń • {visualZones.reduce((s,z)=>s+z.entries.reduce((a,e)=>a+(e.tags?.filter(t=>t.targetEntryId)?.length||0),0),0)} hotspotów
              </p>
            </div>
            <div className="text-[10px] bg-white/10 border border-white/15 px-3 py-2 rounded-xl">
              <div className="font-bold">Bez GPU</div>
              <div className="text-white/60">OpenCV/sharp/FFmpeg tylko CPU</div>
              <div className="text-white/60">4 CPU / 8GB wystarczy</div>
            </div>
          </div>

          {/* Spatial map — 3 piętra */}
          <div className="space-y-4">
            {HOUSE_FLOORS.map(floor => {
              const FloorIcon = floor.icon;
              return (
                <div key={floor.name} className="bg-white rounded-[24px] border border-[#78350F]/10 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-[#FDFCF0] border-b border-[#78350F]/10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#2D4F1E] text-white flex items-center justify-center">
                      <FloorIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[#2D4F1E]">{floor.name}</h4>
                    <span className="text-[11px] text-[#78350F]/60">{floor.rooms.length} pomieszczeń</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {floor.rooms.map(room => {
                      const zonesForRoom = filteredVisualZones.filter(z => {
                        const zn = z.name.toLowerCase();
                        const rn = room.toLowerCase();
                        if (rn.includes('+')) {
                          const parts = rn.split('+').map(s => s.replace('dół','').replace('góra','').trim()).filter(Boolean);
                          return parts.some(p => zn.includes(p));
                        }
                        const clean = rn.replace('dół','').replace('góra','').trim();
                        return zn.includes(clean) || clean.includes(zn);
                      });
                      const hasZone = zonesForRoom.length > 0;
                      if (!hasZone) {
                        return (
                          <div key={room} className="rounded-2xl border-2 border-dashed border-[#78350F]/15 p-3 flex flex-col items-center justify-center min-h-[140px] bg-[#FDFCF0]/50 hover:border-[#D97706]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#78350F]/10 flex items-center justify-center text-xl mb-1">🏠</div>
                            <div className="text-xs font-bold text-[#2D4F1E]">{room}</div>
                            <div className="text-[10px] text-[#78350F]/50 mb-2">Brak strefy</div>
                            <button onClick={() => { setNewZoneName(room); setNewZoneType(floor.name.includes('Ogród')?'garden':'room'); setIsAddingZone(true); }} className="px-2.5 py-1 bg-white border border-[#78350F]/15 rounded-full text-[11px] font-bold flex items-center gap-1 hover:bg-[#2D4F1E] hover:text-white">
                              <Plus className="w-3 h-3" /> Dodaj strefę
                            </button>
                          </div>
                        );
                      }
                      return zonesForRoom.map(zone => {
                        const latest = zone.entries[zone.entries.length-1];
                        const thumb = latest?.thumbnailUrl || latest?.mediaUrl;
                        const isVideo = latest?.mediaType==='video';
                        return (
                          <div key={zone.id} className="rounded-2xl border border-[#78350F]/10 overflow-hidden bg-white hover:shadow-md hover:border-[#D97706]/30 transition-all group">
                            <div className="relative h-[110px] bg-[#FDFCF0] overflow-hidden">
                              {thumb ? (
                                isVideo ? (
                                  <div className="w-full h-full relative">
                                    <img src={thumb} alt={zone.name} className="w-full h-full object-cover" />
                                    <span className="absolute top-1.5 left-1.5 bg-[#D97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"><Video className="w-3 h-3" /> wideo</span>
                                  </div>
                                ) : (
                                  <img src={thumb} alt={zone.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">📸</div>
                              )}
                              <span className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${zone.zoneType==='garden'?'bg-emerald-600 text-white':'bg-[#2D4F1E] text-white'}`}>{zone.zoneType==='garden'?'Ogród':'Pokój'}</span>
                            </div>
                            <div className="p-2.5">
                              <div className="text-xs font-bold text-[#2D4F1E] truncate">{zone.name}</div>
                              <div className="text-[11px] text-[#78350F]/60">{zone.entries.length} wpisów • {latest ? format(new Date(latest.capturedAt), 'd MMM yyyy', {locale: pl}) : 'brak'}</div>
                              <div className="flex gap-1.5 mt-2">
                                <button onClick={() => setSelectedVisualZone(zone)} className="flex-1 py-1.5 bg-[#2D4F1E] text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                                  <Eye className="w-3 h-3" /> Wejdź
                                </button>
                                <button onClick={() => setSelectedVisualZone(zone)} className="p-1.5 bg-white border border-[#78350F]/15 rounded-xl hover:bg-[#FDFCF0]">
                                  <Camera className="w-3.5 h-3.5 text-[#78350F]" />
                                </button>
                                <button onClick={() => { if(confirm(`Usunąć strefę ${zone.name}?`)) deleteVisualZone(zone.id); }} className="p-1.5 bg-white border border-red-200 rounded-xl hover:bg-red-50">
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between">
                                {zone.viewpointLinks && zone.viewpointLinks.length > 0 ? (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">Walk-In V{zone.walkinVersion} • {zone.viewpointLinks.length} links</span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Brak Walk-In</span>
                                )}
                                {zone.entries.length >= 2 && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await createWalkinGraph(zone.id);
                                        await createAutoHotspots(zone.id);
                                      } catch {}
                                    }}
                                    className="text-[10px] font-bold text-[#2D4F1E] hover:text-[#D97706] underline"
                                  >
                                    {zone.viewpointLinks?.length ? 'Przebuduj' : 'Zbuduj Walk-In'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lista wszystkich stref — Panel Zarządzania (edycja) + Wspólny (podgląd) */}
          <div className="bg-white rounded-[24px] border border-[#78350F]/10 p-4 shadow-xs">
            <h4 className="text-xs font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-[#78350F]" /> Wszystkie strefy ({filteredVisualZones.length})
              <span className="text-[11px] font-normal text-[#78350F]/60">— w Panelu Wspólnym wszyscy widzą podgląd, w Zarządzaniu Kamil dodaje/edytuje</span>
            </h4>
            {filteredVisualZones.length===0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-center text-2xl mx-auto mb-2">🏡</div>
                <div className="text-sm font-bold text-[#2D4F1E]">Brak stref wizualnych</div>
                <div className="text-xs text-[#78350F]/60">Dodaj pierwszą — np. Salon, Kuchnia, Ogród — a potem rób zdjęcia/wideo z telefonu. To jest „przestrzenne pomieszczenie”.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVisualZones.map(z => (
                  <div key={z.id} className="border border-[#78350F]/10 rounded-2xl p-3 flex gap-3 hover:border-[#D97706]/30">
                    <div className="w-16 h-16 rounded-xl bg-[#FDFCF0] overflow-hidden shrink-0 border border-[#78350F]/10">
                      {z.entries[z.entries.length-1]?.mediaUrl ? (
                        <img src={z.entries[z.entries.length-1].thumbnailUrl || z.entries[z.entries.length-1].mediaUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">📷</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{z.name}</div>
                      <div className="text-[11px] text-[#78350F]/60">{z.zoneType} • {z.entries.length} wpisów</div>
                      <button onClick={() => setSelectedVisualZone(z)} className="mt-1 text-[11px] font-bold text-[#2D4F1E] underline">Otwórz →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add zone modal */}
          {isAddingZone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-[#FDFCF0] rounded-[24px] p-5 w-full max-w-md shadow-xl border border-[#78350F]/10">
                <h3 className="text-sm font-bold text-[#2D4F1E] mb-3">Dodaj strefę przestrzenną</h3>
                <label className="block text-xs font-bold mb-1">Nazwa pomieszczenia</label>
                <input value={newZoneName} onChange={e=>setNewZoneName(e.target.value)} placeholder="np. Salon, Kuchnia, Ogród" className="w-full px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs mb-3" />
                <label className="block text-xs font-bold mb-1">Typ</label>
                <select value={newZoneType} onChange={e=>setNewZoneType(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs mb-4">
                  <option value="room">Pomieszczenie</option>
                  <option value="garden">Ogród</option>
                  <option value="utility">Gospodarcze</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={()=>setIsAddingZone(false)} className="flex-1 py-2.5 border border-[#78350F]/15 rounded-xl text-xs font-bold">Anuluj</button>
                  <button onClick={()=>{ if(!newZoneName.trim()) return; addVisualZone({name: newZoneName.trim(), zoneType: newZoneType}); setNewZoneName(''); setIsAddingZone(false); showToast('Dodano strefę', newZoneName, 'success'); }} className="flex-1 py-2.5 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold">Dodaj</button>
                </div>
              </div>
            </div>
          )}

          {selectedVisualZone && (
            <VisualZoneModal zone={visualZones.find(z=>z.id===selectedVisualZone.id) || selectedVisualZone} onClose={()=>setSelectedVisualZone(null)} />
          )}
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #weekly-print, #weekly-print * { visibility: visible; }
          #weekly-print { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          nav, header { display: none !important; }
          @page { margin: 10mm; size: A4 landscape; }
        }
      `}</style>
    </div>
  );
};
