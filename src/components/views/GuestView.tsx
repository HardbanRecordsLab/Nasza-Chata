import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { getOccurrencesForDate } from '../../utils/recurrenceEngine';
import { SosModal } from '../modals/SosModal';
import { ToastContainer } from '../ToastContainer';
import {
  Flame,
  TreePine,
  Home,
  Wrench,
  AlertTriangle,
  Phone,
  ShieldCheck,
  Droplets,
  Info,
} from 'lucide-react';

export type GuestTopic = 'boiler' | 'garden' | 'general';

interface GuestViewProps {
  topic: GuestTopic;
}

const TOPIC_META: Record<GuestTopic, { label: string; icon: React.ComponentType<any> }> = {
  boiler: { label: 'Piec i kotłownia', icon: Flame },
  garden: { label: 'Ogród i sprzęt', icon: TreePine },
  general: { label: 'Przegląd ogólny', icon: Home },
};

/**
 * Read-only view served on a shared "guest link" (?guest_mode=boiler|garden|general).
 * Shows only practical, non-sensitive info: equipment cards, wood level, today's
 * relevant chores. Never finances, budgets, family notes or the admin panel.
 */
export const GuestView: React.FC<GuestViewProps> = ({ topic }) => {
  const { equipment, woodInventory, tasks, completions, sosAlerts, profiles } = useChata();
  const [isSosOpen, setIsSosOpen] = useState(false);

  const meta = TOPIC_META[topic] || TOPIC_META.general;
  const TopicIcon = meta.icon;

  const activeSos = sosAlerts.filter(a => a.status === 'active');
  const today = new Date();
  const todayOccurrences = getOccurrencesForDate(tasks, completions, today);

  const boilerEq = equipment.filter(
    e =>
      e.room?.toLowerCase().includes('kotłow') ||
      e.category?.toLowerCase().includes('ogrzewan') ||
      e.name?.toLowerCase().includes('piec') ||
      e.name?.toLowerCase().includes('kocioł')
  );
  const gardenEq = equipment.filter(
    e =>
      e.room?.toLowerCase().includes('ogród') ||
      e.room?.toLowerCase().includes('drewutn') ||
      e.category?.toLowerCase().includes('ogród') ||
      e.name?.toLowerCase().includes('kosiar') ||
      e.name?.toLowerCase().includes('pilar') ||
      e.name?.toLowerCase().includes('podkasz')
  );

  const gardenTasks = todayOccurrences.filter(
    o => ['garden', 'plants'].includes(o.task.category) && !o.isCompleted
  );

  const burnRate = woodInventory.dailyBurnRateWinterM3 || 0.1;
  const daysOfWood = burnRate > 0 ? Math.round(woodInventory.estimatedM3 / burnRate) : null;

  const contacts = profiles.filter(p => p.id === 'kamil' || p.id === 'ilona').map(p => p.name);

  const EquipmentCard: React.FC<{ eq: typeof equipment[number] }> = ({ eq }) => (
    <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#78350F]/8 flex items-center justify-center text-[#78350F] shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[#2D4F1E]">{eq.name}</h4>
          <p className="text-[11px] text-[#78350F]/70">
            {eq.room}
            {eq.modelNumber ? ` • model ${eq.modelNumber}` : ''}
          </p>
          <div className="mt-2 space-y-1 text-[11px] text-[#78350F]/80">
            {eq.nextServiceDate && (
              <div className="flex justify-between gap-3">
                <span>Następny przegląd</span>
                <strong className="font-mono text-[#D97706]">{eq.nextServiceDate}</strong>
              </div>
            )}
            {eq.warrantyEndDate && (
              <div className="flex justify-between gap-3">
                <span>Gwarancja do</span>
                <strong className="font-mono">{eq.warrantyEndDate}</strong>
              </div>
            )}
          </div>
          {eq.manualNotes && (
            <p className="mt-2 text-[11px] text-[#78350F]/70 italic bg-[#FDFCF0] border border-[#78350F]/10 rounded-lg p-2">
              {eq.manualNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D4F1E] font-sans">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-28">
        {/* Header */}
        <div className="bg-[#2D4F1E] text-[#FDFCF0] rounded-[28px] p-5 shadow-md">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Widok gościa
          </div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <TopicIcon className="w-5 h-5 text-amber-300" />
            Nasza Chata — {meta.label}
          </h1>
          <p className="text-xs text-[#FDFCF0]/75 mt-1">
            Praktyczne informacje przygotowane przez domowników. Bez dostępu do finansów i spraw rodzinnych.
          </p>
        </div>

        {/* Active SOS */}
        {activeSos.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Zgłoszona usterka w domu
            </div>
            {activeSos.map(a => (
              <div key={a.id} className="mt-1.5 text-xs text-red-700">
                <strong>{a.title}</strong> — {a.room}
                {a.description ? ` • ${a.description}` : ''}
              </div>
            ))}
          </div>
        )}

        {/* BOILER */}
        {topic === 'boiler' && (
          <>
            <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-[#D97706]" /> Stan drewna
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#FDFCF0] rounded-xl p-2 border border-[#78350F]/10">
                  <div className="text-lg font-bold font-mono text-[#D97706]">{woodInventory.estimatedM3}</div>
                  <div className="text-[10px] text-[#78350F]/60">m³ w drewutni</div>
                </div>
                <div className="bg-[#FDFCF0] rounded-xl p-2 border border-[#78350F]/10">
                  <div className="text-lg font-bold font-mono text-[#2D4F1E]">{woodInventory.logsInBoilerRoom}</div>
                  <div className="text-[10px] text-[#78350F]/60">polan przy piecu</div>
                </div>
                <div className="bg-[#FDFCF0] rounded-xl p-2 border border-[#78350F]/10">
                  <div className="text-lg font-bold font-mono text-[#2D4F1E]">{daysOfWood ?? '—'}</div>
                  <div className="text-[10px] text-[#78350F]/60">dni zapasu (zima)</div>
                </div>
              </div>
              {woodInventory.woodTypes && woodInventory.woodTypes.length > 0 && (
                <p className="text-[11px] text-[#78350F]/70 mt-2">
                  Gatunki: {woodInventory.woodTypes.join(', ')}
                  {woodInventory.seasonedStatus ? ` • ${woodInventory.seasonedStatus}` : ''}
                </p>
              )}
            </div>

            {boilerEq.length > 0 && (
              <div className="space-y-2">
                {boilerEq.map(eq => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-[#D97706]" /> Jak obsłużyć piec
              </h3>
              <ul className="text-xs text-[#78350F]/80 space-y-1.5 list-disc list-inside">
                <li>Rozpalaj metodą „od góry” — podpałka i drobne drewno na wierzchu.</li>
                <li>Dokładaj 3–5 polan, gdy poprzednia porcja się rozżarzy (bez płomienia).</li>
                <li>Nie zasypuj całego paleniska naraz — grozi zadymieniem i smołowaniem.</li>
                <li>Popiół wybieraj co 2–3 dni, gdy piec jest wystudzony.</li>
              </ul>
            </div>
          </>
        )}

        {/* GARDEN */}
        {topic === 'garden' && (
          <>
            {gardenTasks.length > 0 ? (
              <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
                <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-[#2D4F1E]" /> Co dziś w ogrodzie
                </h3>
                <ul className="space-y-1.5">
                  {gardenTasks.map(o => (
                    <li key={o.task.id} className="text-xs text-[#2D4F1E] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
                      <span className="font-semibold">{o.task.name}</span>
                      <span className="text-[#78350F]/60">• {o.task.room}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 text-xs text-[#78350F]/70 shadow-xs">
                Na dziś nie zaplanowano prac w ogrodzie.
              </div>
            )}

            {gardenEq.length > 0 ? (
              <div className="space-y-2">
                {gardenEq.map(eq => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 text-xs text-[#78350F]/70 shadow-xs">
                Brak sprzętu ogrodowego w rejestrze domu.
              </div>
            )}
          </>
        )}

        {/* GENERAL */}
        {topic === 'general' && (
          <>
            <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-[#2D4F1E]" /> Kontakt
              </h3>
              <p className="text-xs text-[#78350F]/80">
                W razie pytań lub problemów skontaktuj się z domownikami:{' '}
                <strong className="text-[#2D4F1E]">{contacts.join(' / ') || 'Kamil / Ilona'}</strong>.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#78350F]/12 p-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-[#D97706]" /> Piec i drewno
              </h3>
              <p className="text-xs text-[#78350F]/80">
                Drewutnia: <strong>{woodInventory.estimatedM3} m³</strong> • przy piecu:{' '}
                <strong>{woodInventory.logsInBoilerRoom} polan</strong>
                {daysOfWood != null ? ` • zapas na ~${daysOfWood} dni` : ''}.
              </p>
            </div>

            {equipment.length > 0 && (
              <div className="space-y-2">
                {equipment.slice(0, 4).map(eq => (
                  <EquipmentCard key={eq.id} eq={eq} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Report a problem */}
        <button
          onClick={() => setIsSosOpen(true)}
          className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          Zgłoś usterkę domownikom
        </button>

        <p className="text-center text-[10px] text-[#78350F]/50 pt-2">
          Nasza Chata • widok gościa — dane tylko do odczytu
        </p>
      </div>

      {isSosOpen && <SosModal onClose={() => setIsSosOpen(false)} reporterName="Gość" />}
      <ToastContainer />
    </div>
  );
};
