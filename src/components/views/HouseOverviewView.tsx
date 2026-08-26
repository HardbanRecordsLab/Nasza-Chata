import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { EquipmentItem, RoomSnapshot } from '../../types';
import {
  ChataFlameIcon,
  ChataWoodLogIcon,
  ChataStoveIcon,
  ChataChainsawIcon,
  ChataMowerIcon,
} from '../icons/CustomChataIcons';
import {
  Flame,
  Wrench,
  Camera,
  ShieldCheck,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  Layers,
  PieChart,
  User,
  ExternalLink,
  Sparkles,
  Bell,
  Smartphone,
  Send,
  CloudSun,
  Clock,
  Volume2,
  Home,
  TreePine,
} from 'lucide-react';
import { GuestViewModal } from '../modals/GuestViewModal';
import { VirtualRoomModal } from '../modals/VirtualRoomModal';
import { VisualZoneModal } from '../modals/VisualZoneModal';
import { HomeScreenWidget } from '../widgets/HomeScreenWidget';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendWebNotification,
} from '../../utils/notificationService';

export const HouseOverviewView: React.FC = () => {
  const {
    currentProfile,
    profiles,
    tasks,
    completions,
    expenses,
    woodInventory,
    updateWoodInventory,
    equipment,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    roomSnapshots,
    addRoomSnapshot,
    visualZones,
    addVisualZone,
    showToast,
    notifications,
    saveNotificationSettings,
  } = useChata();

  const [activeSection, setActiveSection] = useState<'wood' | 'equipment' | 'rooms' | 'stats' | 'settings'>('wood');
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  // Equipment add modal state
  const [isAddingEq, setIsAddingEq] = useState(false);
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState('Ogrzewanie & Kotłownia');
  const [eqRoom, setEqRoom] = useState('Kotłownia');
  const [eqLastService, setEqLastService] = useState('');
  const [eqNextService, setEqNextService] = useState('');
  const [eqWarranty, setEqWarranty] = useState('');
  const [eqNotes, setEqNotes] = useState('');

  // Room Snapshot add state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('Salon');
  const [roomPhotoUrl, setRoomPhotoUrl] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [selectedVirtualRoom, setSelectedVirtualRoom] = useState<RoomSnapshot | null>(null);
  const [selectedVisualZone, setSelectedVisualZone] = useState<any | null>(null);
  const [roomFilter, setRoomFilter] = useState<'all' | 'room' | 'garden'>('all');

  // Wood Inventory controls
  const handleLogsChange = (delta: number) => {
    const nextLogs = Math.max(0, woodInventory.logsInBoilerRoom + delta);
    updateWoodInventory({ logsInBoilerRoom: nextLogs });
  };

  const handleM3Change = (delta: number) => {
    const nextM3 = Math.max(0, parseFloat((woodInventory.estimatedM3 + delta).toFixed(1)));
    updateWoodInventory({ estimatedM3: nextM3 });
  };

  // Notification toggles & permission
  const permissionStatus = getNotificationPermissionStatus();
  const currentNotif = notifications[currentProfile.id] || {
    profileId: currentProfile.id,
    webPushEnabled: permissionStatus === 'granted',
    dailySummaryTime: '08:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    weekendReminder: true,
    weatherAlerts: true,
  };

  const handleTogglePush = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        saveNotificationSettings({ ...currentNotif, webPushEnabled: true });
        showToast('Powiadomienia aktywne', 'Zezwolono na powiadomienia na tym urządzeniu.', 'success');
      } else {
        showToast('Brak uprawnień', 'Powiadomienia zostały zablokowane w przeglądarce.', 'warning');
      }
    } else {
      const nextState = !currentNotif.webPushEnabled;
      saveNotificationSettings({ ...currentNotif, webPushEnabled: nextState });
      showToast(
        nextState ? 'Włączono powiadomienia' : 'Wyłączono powiadomienia',
        `Dla profilu ${currentProfile.name}`,
        'info'
      );
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const sent = await sendWebNotification({
        title: `🏡 Nasza Chata: Powiadomienie dla ${currentProfile.name}`,
        body: `Dzisiaj zaplanowano zadania w domu. Stan drewna w kotłowni: ${woodInventory.logsInBoilerRoom} szt.`,
        tag: 'test-house-push',
      });
      if (sent) {
        showToast('Wysłano powiadomienie testowe!', 'Sprawdź pasek powiadomień.', 'success');
      } else {
        showToast('Wysłano sygnał testowy', 'Sprawdź uprawnienia systemowe.', 'info');
      }
    } catch {
      showToast('Błąd testu', 'Nie udało się wysłać powiadomienia.', 'error');
    } finally {
      setIsTestingNotif(false);
    }
  };

  // Add equipment
  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim()) return;

    addEquipment({
      name: eqName.trim(),
      category: eqCategory,
      room: eqRoom,
      lastServiceDate: eqLastService || undefined,
      nextServiceDate: eqNextService || undefined,
      warrantyEndDate: eqWarranty || undefined,
      manualNotes: eqNotes.trim() || undefined,
    });

    setIsAddingEq(false);
    setEqName('');
    setEqNotes('');
    setEqLastService('');
    setEqNextService('');
    setEqWarranty('');
  };

  // Add room snapshot
  const handleRoomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRoomPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRoomSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomPhotoUrl) {
      showToast('Dodaj zdjęcie', 'Wybierz zdjęcie wzorcowego porządku.', 'warning');
      return;
    }

    addRoomSnapshot({
      roomName: roomNameInput,
      photoUrl: roomPhotoUrl,
      description: roomDescription.trim() || 'Wzorcowy porządek w pomieszczeniu',
      capturedById: currentProfile.id,
    });

    setIsAddingRoom(false);
    setRoomPhotoUrl('');
    setRoomDescription('');
  };

  // Stats calculation
  const totalCompletionsCount = completions.length;
  const completionsByProfile = profiles.map(p => {
    const count = completions.filter(c => c.completedById === p.id).length;
    const percent = totalCompletionsCount > 0 ? Math.round((count / totalCompletionsCount) * 100) : 0;
    return { ...p, count, percent };
  });

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByProfile = profiles.map(p => {
    const sum = expenses.filter(e => e.boughtById === p.id).reduce((s, e) => s + e.amount, 0);
    const percent = totalExpenseSum > 0 ? Math.round((sum / totalExpenseSum) * 100) : 0;
    return { ...p, sum, percent };
  });

  const woodCapacityPercent = Math.min(
    100,
    Math.round((woodInventory.estimatedM3 / woodInventory.totalCapacityM3) * 100)
  );

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-white rounded-[32px] p-5 border border-[#78350F]/10 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-[#2D4F1E] flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#D97706]" />
            Nasza Chata — Gospodarstwo & Dom
          </h2>
          <p className="text-xs text-[#78350F]/70 mt-0.5">
            Zapas drewna, kotłownia, przeglądy sprzętu i podsumowanie wkładu domowników.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-[#78350F]/5 p-1 rounded-full flex items-center border border-[#78350F]/10 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'wood', label: '🪵 Drewutnia & Opał' },
            { id: 'equipment', label: '🔧 Sprzęt' },
            { id: 'rooms', label: '📸 Pokoje' },
            { id: 'stats', label: '📊 Wkład & Statystyki' },
            { id: 'settings', label: '🔔 Powiadomienia & Widżet' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as any)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeSection === s.id
                  ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                  : 'text-[#78350F] hover:text-[#2D4F1E]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel Wspólny / Zarządzania — discoverability */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 text-[11px] bg-white border border-[#78350F]/10 rounded-full px-3 py-1.5 shadow-xs">
          <Home className="w-3.5 h-3.5 text-[#2D4F1E]" />
          <span className="font-bold text-[#2D4F1E]">Panel Wspólny</span>
          <span className="text-[#78350F]/60 hidden sm:inline">— pokoje & ogród (wszyscy, podgląd)</span>
        </div>
        {(currentProfile.isAdmin || currentProfile.id === 'kamil') ? (
          <a href="?tab=plan" className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-[#2D4F1E] text-white px-3 py-1.5 rounded-full hover:bg-[#1f3715] transition-colors shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Panel Zarządzania → przydziały & plan tygodniowy
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Zarządzanie — tylko Kamil (admin)
          </span>
        )}
      </div>

      {/* SECTION 1: WOOD INVENTORY & STOVE */}
      {activeSection === 'wood' && (
        <div className="space-y-4">
          {/* Main Drewutnia Visual Card */}
          <div className="bg-[#2D4F1E] text-[#FDFCF0] rounded-[32px] p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                    Stan Drewutni & Kotłowni
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                    {woodInventory.estimatedM3} m³ / {woodInventory.totalCapacityM3} m³
                  </h3>
                  <p className="text-xs text-[#FDFCF0]/80 mt-1">
                    Gatunki: <span className="font-semibold text-amber-200">{woodInventory.woodTypes.join(', ')}</span> • {woodInventory.seasonedStatus}
                  </p>
                </div>

                {/* Quick adjustments */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleM3Change(-0.5)}
                    className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-[#FDFCF0] text-xs font-bold rounded-xl transition-colors"
                  >
                    -0.5 m³
                  </button>
                  <button
                    onClick={() => handleM3Change(+0.5)}
                    className="px-3.5 py-2 bg-[#D97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    +0.5 m³ (Dostawa)
                  </button>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5 mb-6">
                <div className="flex justify-between text-xs text-[#FDFCF0]/90 font-semibold">
                  <span>Wypełnienie drewutni:</span>
                  <span className="font-mono">{woodCapacityPercent}% pojemności</span>
                </div>
                <div className="w-full h-3.5 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${woodCapacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Kotłownia mini counter */}
              <div className="bg-black/20 border border-white/15 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center">
                    <ChataFlameIcon size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Przyniesione do kotłowni (pod ręką)
                    </h4>
                    <span className="text-lg font-bold font-mono text-amber-300">
                      {woodInventory.logsInBoilerRoom} polan
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLogsChange(-1)}
                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold flex items-center justify-center transition-colors"
                    title="Spalono 1 polano"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleLogsChange(+5)}
                    className="px-3.5 py-2 rounded-xl bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                    title="Przyniesiono 5 polan z drewutni"
                  >
                    +5 z drewutni
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tips for Stove & Heating */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#2D4F1E] uppercase tracking-wider flex items-center gap-2">
              <ChataStoveIcon size={18} />
              Wskazówki dla pieca zasypowego i bezpiecznego palenia:
            </h4>
            <ul className="text-xs text-[#78350F]/80 space-y-2 list-disc list-inside">
              <li>Pamiętaj o rozpalaniu od góry (metoda czysta i oszczędzająca do 30% opału).</li>
              <li>Wybieraj popiół regularnie co 2–3 dni, aby ruszt miał swobodny przepływ powietrza.</li>
              <li>Optymalna wilgotność drewna opałowego to poniżej 20% (sezonowane min. 1,5 roku pod zadaszeniem).</li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 2: EQUIPMENT & TECHNICIAN GUEST VIEW */}
      {activeSection === 'equipment' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#2D4F1E]">
                Rejestr sprzętu & Karta serwisowa
              </h3>
              <p className="text-xs text-[#78350F]/70">
                Zarządzaj przeglądami, gwarancjami i danymi technicznymi urządzeń domowych.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGuestModalOpen(true)}
                className="px-3.5 py-2 bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Link dla serwisanta</span>
              </button>

              <button
                onClick={() => setIsAddingEq(true)}
                className="px-3.5 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj sprzęt</span>
              </button>
            </div>
          </div>

          {/* Equipment list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equipment.map(eq => (
              <div
                key={eq.id}
                className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#78350F]/10 border border-[#78350F]/15 flex items-center justify-center text-[#78350F]">
                        {eq.name.toLowerCase().includes('kosiark') ? (
                          <ChataMowerIcon size={22} />
                        ) : eq.name.toLowerCase().includes('pilar') ? (
                          <ChataChainsawIcon size={22} />
                        ) : (
                          <Wrench className="w-5 h-5 text-[#78350F]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D4F1E]">{eq.name}</h4>
                        <span className="text-[11px] text-[#78350F]/70">{eq.room} • {eq.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteEquipment(eq.id)}
                      className="p-1.5 text-[#78350F]/40 hover:text-red-600 rounded-lg transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-[#78350F]/80 bg-[#FDFCF0] p-3 rounded-2xl border border-[#78350F]/10 mb-2">
                    {eq.nextServiceDate && (
                      <p className="flex items-center justify-between">
                        <span>Następny serwis:</span>
                        <strong className="text-[#D97706] font-mono">{eq.nextServiceDate}</strong>
                      </p>
                    )}
                    {eq.warrantyEndDate && (
                      <p className="flex items-center justify-between">
                        <span>Gwarancja do:</span>
                        <strong className="text-[#2D4F1E] font-mono">{eq.warrantyEndDate}</strong>
                      </p>
                    )}
                    {eq.manualNotes && (
                      <p className="text-[11px] text-[#78350F]/60 italic pt-1 border-t border-[#78350F]/10 mt-1">
                        {eq.manualNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Equipment Modal */}
          {isAddingEq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-display font-bold text-[#2D4F1E] mb-3">
                  Dodaj urządzenie do rejestru
                </h3>

                <form onSubmit={handleSaveEquipment} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#78350F] mb-1">Nazwa urządzenia / Model:</label>
                    <input
                      type="text"
                      required
                      value={eqName}
                      onChange={e => setEqName(e.target.value)}
                      placeholder="np. Kosiarka Stiga, Pilarka Stihl..."
                      className="w-full p-2.5 bg-white border border-[#78350F]/15 rounded-xl text-xs font-semibold text-[#2D4F1E]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#78350F] mb-1">Pomieszczenie:</label>
                      <input
                        type="text"
                        value={eqRoom}
                        onChange={e => setEqRoom(e.target.value)}
                        className="w-full p-2 bg-white border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#78350F] mb-1">Kategoria:</label>
                      <input
                        type="text"
                        value={eqCategory}
                        onChange={e => setEqCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#78350F] mb-1">Data przeglądu:</label>
                      <input
                        type="date"
                        value={eqNextService}
                        onChange={e => setEqNextService(e.target.value)}
                        className="w-full p-2 bg-white border border-[#78350F]/15 rounded-xl text-xs font-mono text-[#2D4F1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#78350F] mb-1">Gwarancja do:</label>
                      <input
                        type="date"
                        value={eqWarranty}
                        onChange={e => setEqWarranty(e.target.value)}
                        className="w-full p-2 bg-white border border-[#78350F]/15 rounded-xl text-xs font-mono text-[#2D4F1E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#78350F] mb-1">Notatki techniczne (olej, filtry, świeca):</label>
                    <textarea
                      rows={2}
                      value={eqNotes}
                      onChange={e => setEqNotes(e.target.value)}
                      placeholder="np. Olej 10W30, wymiana świecy co sezon..."
                      className="w-full p-2 bg-white border border-[#78350F]/15 rounded-xl text-xs resize-none text-[#2D4F1E]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingEq(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#78350F]/20 text-[#78350F] text-xs font-semibold"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#2D4F1E] text-[#FDFCF0] text-xs font-bold shadow-md"
                    >
                      Zapisz sprzęt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ROOM SNAPSHOTS + VISUAL ZONES */}
      {activeSection === 'rooms' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#2D4F1E]">
                Dokumentacja wizualna — Pomieszczenia & Ogród
              </h3>
              <p className="text-xs text-[#78350F]/70">
                Zdjęcia i wideo w czasie. Porównuj jak wyglądało dane miejsce miesiąc/rok temu.
              </p>
            </div>

            <button
              onClick={() => setIsAddingRoom(true)}
              className="px-3.5 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Dodaj strefę</span>
            </button>
          </div>

          {/* Room / Garden Filter Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Wszystkie', icon: Layers },
              { id: 'room', label: 'Pomieszczenia', icon: Home },
              { id: 'garden', label: 'Ogród', icon: TreePine },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setRoomFilter(f.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  roomFilter === f.id
                    ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                    : 'bg-white border border-[#78350F]/10 text-[#78350F] hover:border-[#2D4F1E]/30'
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            ))}
          </div>

          {/* Visual Zones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visualZones
              .filter(z => roomFilter === 'all' || z.zoneType === roomFilter)
              .map(zone => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedVisualZone(zone)}
                  className="bg-white rounded-[32px] border border-[#78350F]/10 overflow-hidden shadow-xs group text-left transition-all hover:shadow-md hover:border-[#2D4F1E]/30 focus:outline-none"
                >
                  <div className="relative h-48 w-full bg-[#FDFCF0]">
                    {zone.entries.length > 0 ? (
                      <img
                        src={zone.entries[zone.entries.length - 1].thumbnailUrl || zone.entries[zone.entries.length - 1].mediaUrl}
                        alt={zone.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-10 h-10 text-[#78350F]/20" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-[#2D4F1E]/80 backdrop-blur-xs text-[#FDFCF0] text-xs font-bold px-2.5 py-1 rounded-xl">
                      {zone.name}
                    </div>
                    {zone.entries.length > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {zone.entries.length} wpisów
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                      {zone.zoneType === 'garden' ? '🌿 Ogród' : zone.zoneType === 'utility' ? '🔧 Techniczne' : '🏠 Pokój'}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2D4F1E] group-hover:text-[#D97706] transition-colors">
                        {zone.entries.length > 0
                          ? `${zone.entries.length} wpisów w czasie`
                          : 'Brak wpisów — kliknij aby dodać'}
                      </p>
                      {zone.entries.length > 0 && (
                        <span className="text-[10px] text-[#78350F]/60 font-mono mt-1 block">
                          Ostatni wpis: {new Date(zone.entries[zone.entries.length - 1].capturedAt).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#78350F]/5 flex items-center justify-center text-[#78350F]/40 group-hover:bg-[#2D4F1E]/10 group-hover:text-[#2D4F1E] transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}

            {/* Legacy Room Snapshots */}
            {roomSnapshots
              .filter(snap => {
                if (roomFilter === 'all') return true;
                if (roomFilter === 'garden') return snap.zone === 'garden';
                return snap.zone !== 'garden';
              })
              .map(snap => (
                <button
                  key={snap.id}
                  onClick={() => setSelectedVirtualRoom(snap)}
                  className="bg-white rounded-[32px] border border-[#78350F]/10 overflow-hidden shadow-xs group text-left transition-all hover:shadow-md hover:border-[#2D4F1E]/30 focus:outline-none"
                >
                  <div className="relative h-48 w-full bg-[#FDFCF0]">
                    <img
                      src={snap.photoUrl}
                      alt={snap.roomName}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-[#2D4F1E]/80 backdrop-blur-xs text-[#FDFCF0] text-xs font-bold px-2.5 py-1 rounded-xl">
                      {snap.roomName}
                    </div>
                    {snap.virtualTags && snap.virtualTags.length > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {snap.virtualTags.length} punktów
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2D4F1E] group-hover:text-[#D97706] transition-colors">{snap.description || 'Wirtualny Pokój'}</p>
                      <span className="text-[10px] text-[#78350F]/60 font-mono mt-1 block">
                        Zapisano: {new Date(snap.capturedAt).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#78350F]/5 flex items-center justify-center text-[#78350F]/40 group-hover:bg-[#2D4F1E]/10 group-hover:text-[#2D4F1E] transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {/* Add Room Snapshot Modal */}
          {isAddingRoom && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-md shadow-2xl relative">
                <h3 className="text-lg font-display font-bold text-[#2D4F1E] mb-3">
                  Nowa strefa wizualna
                </h3>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!roomNameInput.trim()) return;
                  addVisualZone({
                    name: roomNameInput.trim(),
                    zoneType: roomNameInput.toLowerCase().includes('ogród') || roomNameInput.toLowerCase().includes('trawnik') || roomNameInput.toLowerCase().includes('grządk') || roomNameInput.toLowerCase().includes('taras') || roomNameInput.toLowerCase().includes('drewutn')
                      ? 'garden'
                      : roomNameInput.toLowerCase().includes('kotłowni') || roomNameInput.toLowerCase().includes('garaż')
                      ? 'utility'
                      : 'room',
                    captureAngles: roomNameInput.toLowerCase().includes('ogród') || roomNameInput.toLowerCase().includes('trawnik')
                      ? ['Z lewej', 'Z prawej', 'Z góry tarasu']
                      : ['Od drzwi', 'Od okna', 'Widok ogólny'],
                  });
                  setIsAddingRoom(false);
                  setRoomNameInput('Salon');
                }} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#78350F] mb-1">Nazwa strefy:</label>
                    <input
                      type="text"
                      required
                      value={roomNameInput}
                      onChange={e => setRoomNameInput(e.target.value)}
                      placeholder="np. Salon, Pokój Olivii, Trawnik, Grządki..."
                      className="w-full p-2.5 bg-white border border-[#78350F]/15 rounded-xl text-xs font-semibold text-[#2D4F1E]"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                    <p className="text-[11px] text-amber-800 font-medium">
                      💡 Po utworzeniu strefy appka poprowadzi Cię przez robienie zdjęć z sugerowanych kątów (np. "Od drzwi", "Od okna"). Możesz pominąć kroki i dodać tylko jedno zdjęcie.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRoom(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#78350F]/20 text-[#78350F] text-xs font-semibold"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#2D4F1E] text-[#FDFCF0] text-xs font-bold shadow-md"
                    >
                      Utwórz strefę
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: STATS, CONTRIBUTION & DATA BACKUP */}
      {activeSection === 'stats' && (
        <div className="space-y-4">
          {/* Chores Breakdown Card */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#2D4F1E] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D4F1E]" />
              Wykonane obowiązki w Chacie (Wkład każdego domownika)
            </h3>

            <div className="space-y-3">
              {completionsByProfile.map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#2D4F1E] flex items-center gap-1.5">
                      <span>{p.avatar}</span>
                      <span>{p.name} ({p.roleTitle})</span>
                    </span>
                    <span className="font-mono text-[#78350F] font-semibold">
                      {p.count} zadań ({p.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#78350F]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.percent}%`, backgroundColor: p.colorHex }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses Breakdown Card */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#2D4F1E] mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#D97706]" />
              Wydatki sfinansowane przez domowników
            </h3>

            <div className="space-y-3">
              {expensesByProfile.map(p => (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#2D4F1E] flex items-center gap-1.5">
                      <span>{p.avatar}</span>
                      <span>{p.name}</span>
                    </span>
                    <span className="font-mono text-[#78350F] font-semibold">
                      {p.sum.toFixed(2)} zł ({p.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#78350F]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.percent}%`, backgroundColor: p.colorHex }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup & Export Bar */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-[#2D4F1E]">
                Kopia zapasowa danych Naszej Chaty
              </h4>
              <p className="text-[11px] text-[#78350F]/70">
                Pobierz pełną bazę w pliku JSON lub przywróć dane.
              </p>
            </div>

            <a
              href="/api/export?action=backup.json"
              download="nasza-chata-backup.json"
              className="px-4 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Pobierz kopię JSON</span>
            </a>
          </div>

          {/* Yearly Chronicle Export */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-[#2D4F1E]">
                Kronika wizualna roku
              </h4>
              <p className="text-[11px] text-[#78350F]/70">
                Podsumowanie „strefa × miesiąc" — najlepsze zdjęcia z każdego miesiąca.
              </p>
            </div>

            <a
              href="/api/export?action=yearly-chronicle&format=html"
              target="_blank"
              className="px-4 py-2 bg-[#D97706] hover:bg-[#b45309] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>Drukuj kronikę roku</span>
            </a>
          </div>
        </div>
      )}

      {/* SECTION 5: NOTIFICATIONS & PWA WIDGET */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          {/* Notification Config Card */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#78350F]/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-center shadow-xs">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D4F1E]">
                    Powiadomienia Push w Przeglądarce
                  </h3>
                  <p className="text-xs text-[#78350F]/70">
                    Otrzymuj przypomnienia o zadaniach, alertach SOS i niskim zapasie drewna.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingNotif}
                  className="px-3.5 py-2 bg-white hover:bg-amber-50 text-[#78350F] border border-[#78350F]/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>{isTestingNotif ? 'Wysyłanie...' : 'Wyślij test'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePush}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    currentNotif.webPushEnabled && permissionStatus === 'granted'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0]'
                  }`}
                >
                  {currentNotif.webPushEnabled && permissionStatus === 'granted'
                    ? 'Powiadomienia Aktywne ✓'
                    : 'Włącz Powiadomienia'}
                </button>
              </div>
            </div>

            {/* Profile Notification Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div className="bg-[#FDFCF0] p-4 rounded-2xl border border-[#78350F]/15">
                <p className="text-xs font-bold text-[#2D4F1E] flex items-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-[#D97706]" />
                  Poranna odprawa o godz. {currentNotif.dailySummaryTime || '08:00'}
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Codzienny przegląd zadań przed rozpoczęciem dnia.
                </p>
              </div>

              <div className="bg-[#FDFCF0] p-4 rounded-2xl border border-[#78350F]/15">
                <p className="text-xs font-bold text-[#2D4F1E] flex items-center gap-1.5 mb-1">
                  <Flame className="w-4 h-4 text-[#D97706]" />
                  Ostrzeżenia o stanie drewutni
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Gdy w kotłowni jest mniej niż 15 polan lub zapas w drewutni &lt; 5 m³.
                </p>
              </div>
            </div>
          </div>

          {/* PWA Home Screen Widget Interactive Showcase */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#78350F]/10">
              <div className="w-12 h-12 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 text-[#D97706] flex items-center justify-center shadow-xs">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D4F1E]">
                  PWA Widżet Ekranu Głównego
                </h3>
                <p className="text-xs text-[#78350F]/70">
                  Podgląd widżetu zadań na dziś. Możesz go przypiąć na telefonie lub komputerze.
                </p>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <HomeScreenWidget />
            </div>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {isGuestModalOpen && (
        <GuestViewModal onClose={() => setIsGuestModalOpen(false)} />
      )}

      {/* Virtual Room Modal (legacy) */}
      {selectedVirtualRoom && (
        <VirtualRoomModal 
          room={selectedVirtualRoom} 
          onClose={() => setSelectedVirtualRoom(null)} 
        />
      )}

      {/* Visual Zone Modal (new) */}
      {selectedVisualZone && (
        <VisualZoneModal
          zone={selectedVisualZone}
          onClose={() => setSelectedVisualZone(null)}
        />
      )}
    </div>
  );
};
