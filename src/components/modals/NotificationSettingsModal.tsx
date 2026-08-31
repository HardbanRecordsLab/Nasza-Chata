import React, { useState, useEffect } from 'react';
import { useChata } from '../../context/ChataContext';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CloudSun,
  Clock,
  Send,
  Smartphone,
  Shield,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendWebNotification,
  registerPushSubscription,
  NotificationPermissionStatus,
} from '../../utils/notificationService';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const { currentProfile, notifications, saveNotificationSettings, showToast, tasks, woodInventory } = useChata();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    getNotificationPermissionStatus()
  );

  const profileSettings = notifications[currentProfile.id] || {
    profileId: currentProfile.id,
    webPushEnabled: permissionStatus === 'granted',
    dailySummaryTime: '08:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    weekendReminder: true,
    weatherAlerts: true,
  };

  const [enabled, setEnabled] = useState<boolean>(profileSettings.webPushEnabled && permissionStatus === 'granted');
  const [dailyTime, setDailyTime] = useState<string>(profileSettings.dailySummaryTime || '08:00');
  const [quietStart, setQuietStart] = useState<string>(profileSettings.quietHoursStart || '22:00');
  const [quietEnd, setQuietEnd] = useState<string>(profileSettings.quietHoursEnd || '07:00');
  const [woodAlerts, setWoodAlerts] = useState<boolean>(profileSettings.woodAlerts ?? true);
  const [sosAlerts, setSosAlerts] = useState<boolean>(profileSettings.sosAlerts ?? true);
  const [weatherAlerts, setWeatherAlerts] = useState<boolean>(profileSettings.weatherAlerts ?? true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(profileSettings.soundEnabled ?? true);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(getNotificationPermissionStatus());
    if (granted) {
      setEnabled(true);
      await registerPushSubscription(currentProfile.id);
      showToast('Włączono powiadomienia!', 'Twoja przeglądarka zezwoliła na powiadomienia z Chaty.', 'success');
      // Dispatch welcome notification
      sendWebNotification({
        title: '🏡 Nasza Chata — Powiadomienia włączone!',
        body: `Witaj ${currentProfile.name}! Będziesz otrzymywać przypomnienia o obowiązkach domowych i stanie drewutni.`,
        tag: 'welcome-notification',
      });
    } else {
      showToast('Brak uprawnień', 'Powiadomienia zostały zablokowane w ustawieniach przeglądarki.', 'warning');
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // 1. Ensure PushManager subscription is registered
      await registerPushSubscription(currentProfile.id);

      // 2. Try local service worker notification
      const sent = await sendWebNotification({
        title: `🔔 Test z Naszej Chaty: ${currentProfile.name}`,
        body: `Wszystko działa! Masz ${tasks.length} zadań w rejestrze i ${woodInventory.estimatedM3} m³ drewna.`,
        tag: 'test-push-' + Date.now(),
        silent: !soundEnabled,
      });

      // 3. Also trigger real server Web Push endpoint
      await fetch('/api/notifications?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🏡 Test powiadomień (${currentProfile.name})`,
          body: `Powiadomienie z serwera Naszej Chaty dotarło pomyślnie!`,
          profileName: currentProfile.name,
          targetProfileId: currentProfile.id,
        }),
      }).catch(() => {});

      if (sent) {
        showToast('Powiadomienie wysłane!', 'Sprawdź pasek powiadomień swojego systemu/telefonu.', 'success');
      } else {
        showToast('Wysłano sygnał testowy', 'Jeśli nie widzisz banera, sprawdź uprawnienia systemowe.', 'info');
      }
    } catch (e) {
      showToast('Błąd testu', 'Nie udało się wysłać powiadomienia.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveNotificationSettings({
      profileId: currentProfile.id,
      webPushEnabled: enabled,
      dailySummaryTime: dailyTime,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      weekendReminder: profileSettings.weekendReminder ?? true,
      weatherAlerts,
      sosAlerts,
      woodAlerts,
      soundEnabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
          title="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-center shadow-sm">
            <BellRing className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-[#2D4F1E]">
              Powiadomienia Push
            </h3>
            <p className="text-xs text-[#78350F]/70">
              Dla profilu: <strong className="text-[#2D4F1E]">{currentProfile.name}</strong> • Harmonogram & Alerty
            </p>
          </div>
        </div>

        {/* Permission Status Box */}
        <div className="bg-white rounded-2xl border border-[#78350F]/15 p-4 mb-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3 h-3 rounded-full ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-500 ring-4 ring-emerald-100'
                    : permissionStatus === 'denied'
                    ? 'bg-red-500 ring-4 ring-red-100'
                    : 'bg-amber-500 ring-4 ring-amber-100'
                }`}
              />
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Status w przeglądarce:{' '}
                  {permissionStatus === 'granted'
                    ? 'Zezwolono (Aktywne)'
                    : permissionStatus === 'denied'
                    ? 'Zablokowane w przeglądarce'
                    : 'Wymaga zgody'}
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  {permissionStatus === 'granted'
                    ? 'Powiadomienia mogą wyświetlać się w tle na telefonie i komputerze.'
                    : 'Kliknij przycisk poniżej, aby aktywować powiadomienia push.'}
                </p>
              </div>
            </div>

            {permissionStatus !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-2 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95 shrink-0"
              >
                Włącz powiadomienia
              </button>
            )}
          </div>
        </div>

        {/* Notification Schedule & Toggles */}
        <div className="space-y-3.5 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#78350F]/80 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#2D4F1E]" />
            Harmonogram powiadomień domowych
          </h4>

          {/* Morning Briefing */}
          <div className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 mt-0.5">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Poranna odprawa domowa
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Podsumowanie zadań i pogody na dany dzień.
                </p>
              </div>
            </div>

            <select
              value={dailyTime}
              onChange={e => setDailyTime(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl text-xs font-bold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
            >
              <option value="07:00">07:00 rano</option>
              <option value="07:30">07:30 rano</option>
              <option value="08:00">08:00 rano</option>
              <option value="08:30">08:30 rano</option>
              <option value="09:00">09:00 rano</option>
            </select>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 shadow-2xs">
            <div className="flex items-start gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 mt-0.5">
                <BellOff className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Ciche godziny
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Powiadomienia wyciszone w tym przedziale czasowym (awarie SOS zawsze przechodzą).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-9">
              <span className="text-[11px] font-semibold text-[#78350F]/80">Od</span>
              <input
                type="time"
                value={quietStart}
                onChange={e => setQuietStart(e.target.value)}
                className="px-2 py-1 bg-[#FDFCF0] border border-[#78350F]/20 rounded-lg text-xs font-bold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />
              <span className="text-[11px] font-semibold text-[#78350F]/80">do</span>
              <input
                type="time"
                value={quietEnd}
                onChange={e => setQuietEnd(e.target.value)}
                className="px-2 py-1 bg-[#FDFCF0] border border-[#78350F]/20 rounded-lg text-xs font-bold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />
            </div>
          </div>

          {/* SOS Emergencies */}
          <label className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-[#FDFCF0]/50 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-red-50 text-red-700 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Pilne awarie (Tryb SOS)
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Natychmiastowe powiadomienie, gdy ktoś zgłosi usterkę w domu.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={sosAlerts}
              onChange={e => setSosAlerts(e.target.checked)}
              className="w-5 h-5 accent-[#2D4F1E] rounded-md cursor-pointer"
            />
          </label>

          {/* Wood & Boiler Alerts */}
          <label className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-[#FDFCF0]/50 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-[#D97706]/15 text-[#D97706] mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Zapas drewna & Kotłownia
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Ostrzeżenie przy &lt; 15 polanach przy piecu lub niskim stanie w drewutni.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={woodAlerts}
              onChange={e => setWoodAlerts(e.target.checked)}
              className="w-5 h-5 accent-[#2D4F1E] rounded-md cursor-pointer"
            />
          </label>

          {/* Weather & Garden Chores */}
          <label className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-[#FDFCF0]/50 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 mt-0.5">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Wskazówki pogodowe do ogrodu
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Sugestie wcześniejszego koszenia lub cięcia drewna przed deszczem.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={weatherAlerts}
              onChange={e => setWeatherAlerts(e.target.checked)}
              className="w-5 h-5 accent-[#2D4F1E] rounded-md cursor-pointer"
            />
          </label>

          {/* Sound toggle */}
          <label className="bg-white rounded-2xl border border-[#78350F]/15 p-3.5 flex items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-[#FDFCF0]/50 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 mt-0.5">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#2D4F1E]">
                  Dźwięk & Wibracje
                </p>
                <p className="text-[11px] text-[#78350F]/70">
                  Odtwarzaj łagodny sygnał przy powiadomieniu.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={e => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 accent-[#2D4F1E] rounded-md cursor-pointer"
            />
          </label>
        </div>

        {/* Test Button & Action Buttons */}
        <div className="bg-[#78350F]/5 rounded-2xl p-4 mb-5 border border-[#78350F]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left w-full sm:w-auto">
            <p className="text-xs font-bold text-[#2D4F1E]">
              Przetestuj działanie powiadomień
            </p>
            <p className="text-[11px] text-[#78350F]/70">
              Wyśle natychmiastowe powiadomienie na to urządzenie.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-amber-50 text-[#78350F] border border-[#78350F]/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{isTesting ? 'Wysyłanie...' : 'Wyślij test'}</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-[#78350F]/20 text-[#78350F] font-semibold text-xs hover:bg-[#78350F]/10 transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            Zapisz ustawienia
          </button>
        </div>
      </div>
    </div>
  );
};
