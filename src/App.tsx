import React, { useState, useEffect } from 'react';
import { ChataProvider, useChata } from './context/ChataContext';
import { TaskDefinition } from './types';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { TodayView } from './components/views/TodayView';
import { CalendarView } from './components/views/CalendarView';
import { ShoppingView } from './components/views/ShoppingView';
import { HouseOverviewView } from './components/views/HouseOverviewView';
import { AdminPlanView } from './components/views/AdminPlanView';
import { PinModal } from './components/modals/PinModal';
import { SosModal } from './components/modals/SosModal';
import { AddTaskModal } from './components/modals/AddTaskModal';
import { AiAssistantModal } from './components/modals/AiAssistantModal';
import { NotificationSettingsModal } from './components/modals/NotificationSettingsModal';
import { PwaWidgetModal } from './components/modals/PwaWidgetModal';
import { ScanHandwrittenModal } from './components/modals/ScanHandwrittenModal';
import { HomeScreenWidget } from './components/widgets/HomeScreenWidget';
import { GuestView, GuestTopic } from './components/views/GuestView';
import { ToastContainer } from './components/ToastContainer';
import { getOccurrencesForDate } from './utils/recurrenceEngine';
import { initServiceWorker } from './utils/notificationService';
import { Smartphone, Bell, Sparkles, Maximize2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { tasks, completions, shoppingItems, currentProfile } = useChata();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isWidgetOnlyMode, setIsWidgetOnlyMode] = useState(false);
  const [guestTopic, setGuestTopic] = useState<GuestTopic | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);

  // Initialize service worker and check query params on mount
  useEffect(() => {
    initServiceWorker();

    const params = new URLSearchParams(window.location.search);
    if (params.get('widget') === 'today' || params.get('widget') === '1') {
      setIsWidgetOnlyMode(true);
    }
    const gm = params.get('guest_mode');
    if (gm === 'boiler' || gm === 'garden' || gm === 'general') {
      setGuestTopic(gm);
    }
    if (params.get('action') === 'sos') {
      setIsSosOpen(true);
    }
    if (params.get('tab') && ['today', 'calendar', 'shopping', 'house', 'plan'].includes(params.get('tab')!)) {
      setActiveTab(params.get('tab') as TabType);
    }
  }, []);

  // Today pending count
  const todayOccurrences = getOccurrencesForDate(tasks, completions, new Date());
  const pendingTodayCount = todayOccurrences.filter(o => !o.isCompleted).length;
  const pendingShoppingCount = shoppingItems.filter(s => !s.isBought).length;

  // Guest / technician link — restricted read-only view, no tabs / finances / admin
  if (guestTopic) {
    return <GuestView topic={guestTopic} />;
  }

  // Standalone Mini Widget Mode (ideal for PWA widget popouts, second screens, smart home tablets)
  if (isWidgetOnlyMode) {
    return (
      <div className="min-h-screen bg-[#FDFCF0] text-[#2D4F1E] flex flex-col p-4 sm:p-6 justify-center items-center">
        <div className="w-full max-w-md space-y-3">
          <HomeScreenWidget
            onOpenAddTask={() => setIsAddTaskOpen(true)}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenApp={() => setIsWidgetOnlyMode(false)}
          />

          <div className="flex items-center justify-between px-2 text-xs text-[#78350F]/70">
            <button
              onClick={() => setIsWidgetOnlyMode(false)}
              className="font-bold text-[#2D4F1E] hover:underline flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Otwórz pełny widok Chaty</span>
            </button>
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="hover:text-[#2D4F1E] flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Powiadomienia</span>
            </button>
          </div>
        </div>

        {/* Modals in Widget Mode */}
        {isAddTaskOpen && <AddTaskModal onClose={() => setIsAddTaskOpen(false)} />}
        {isSosOpen && <SosModal onClose={() => setIsSosOpen(false)} />}
        {isNotificationModalOpen && (
          <NotificationSettingsModal onClose={() => setIsNotificationModalOpen(false)} />
        )}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D4F1E] flex flex-col font-sans selection:bg-[#2D4F1E] selection:text-[#FDFCF0]">
      {/* Top Header */}
      <Header
        onOpenAddTask={() => setIsAddTaskOpen(true)}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenWidget={() => setIsWidgetModalOpen(true)}
        onOpenScanHandwritten={() => setIsScanModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-4 sm:pt-6">
        {activeTab === 'today' && (
          <TodayView
            onOpenAddTask={() => setIsAddTaskOpen(true)}
            onOpenSos={() => setIsSosOpen(true)}
            onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            onOpenNotifications={() => setIsNotificationModalOpen(true)}
            onOpenWidget={() => setIsWidgetModalOpen(true)}
            onOpenScanHandwritten={() => setIsScanModalOpen(true)}
            onChangeTab={setActiveTab}
            onSelectDate={(date) => setCalendarSelectedDate(date)}
            onEditTask={(task) => setEditingTask(task)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            onOpenAddTask={() => setIsAddTaskOpen(true)}
            initialDate={calendarSelectedDate}
            onEditTask={(task) => setEditingTask(task)}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingView />
        )}

        {activeTab === 'house' && (
          <HouseOverviewView />
        )}

        {activeTab === 'plan' && (
          <AdminPlanView />
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingCountToday={pendingTodayCount}
        shoppingCount={pendingShoppingCount}
        isAdmin={currentProfile.isAdmin || currentProfile.id === 'kamil'}
      />

      {/* Global Modals */}
      <PinModal />

      {isSosOpen && (
        <SosModal onClose={() => setIsSosOpen(false)} />
      )}

      {(isAddTaskOpen || editingTask) && (
        <AddTaskModal
          taskToEdit={editingTask ?? undefined}
          onClose={() => {
            setIsAddTaskOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {isAiAssistantOpen && (
        <AiAssistantModal onClose={() => setIsAiAssistantOpen(false)} />
      )}

      {isNotificationModalOpen && (
        <NotificationSettingsModal onClose={() => setIsNotificationModalOpen(false)} />
      )}

      {isWidgetModalOpen && (
        <PwaWidgetModal
          onClose={() => setIsWidgetModalOpen(false)}
          onOpenAddTask={() => {
            setIsWidgetModalOpen(false);
            setIsAddTaskOpen(true);
          }}
          onOpenSos={() => {
            setIsWidgetModalOpen(false);
            setIsSosOpen(true);
          }}
        />
      )}

      {isScanModalOpen && (
        <ScanHandwrittenModal onClose={() => setIsScanModalOpen(false)} />
      )}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <ChataProvider>
      <MainApp />
    </ChataProvider>
  );
}

export default App;
