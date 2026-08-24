import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Profile,
  TaskDefinition,
  TaskCompletion,
  Expense,
  ShoppingItem,
  EquipmentItem,
  WoodInventory,
  RoomSnapshot,
  SosAlert,
  HouseComment,
  NotificationSetting,
  InStoreCartItem,
  VisualZone,
  VisualEntry,
} from '../types';
import {
  INITIAL_PROFILES,
  INITIAL_TASKS,
  INITIAL_EXPENSES,
  INITIAL_SHOPPING_ITEMS,
  INITIAL_WOOD_INVENTORY,
  INITIAL_EQUIPMENT,
  INITIAL_ROOM_SNAPSHOTS,
  INITIAL_SOS_ALERTS,
} from '../constants/initialData';
import { getPeriodKey } from '../utils/recurrenceEngine';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ChataContextType {
  currentProfile: Profile;
  profiles: Profile[];
  selectProfile: (profile: Profile) => void;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
  pendingProfile: Profile | null;
  verifyAndSetProfile: (pin: string) => boolean;
  cancelProfileSwitch: () => void;

  tasks: TaskDefinition[];
  completions: TaskCompletion[];
  expenses: Expense[];
  shoppingItems: ShoppingItem[];
  woodInventory: WoodInventory;
  equipment: EquipmentItem[];
  roomSnapshots: RoomSnapshot[];
  sosAlerts: SosAlert[];
  comments: HouseComment[];
  notifications: Record<string, NotificationSetting>;
  visualZones: VisualZone[];

  // Profile Actions
  updateProfile: (profileId: string, updates: Partial<Profile>) => void;
  assignTask: (taskId: string, profileId: string | null) => void;

  // Chores Actions
  toggleTaskCompletion: (
    taskId: string,
    targetDate: Date,
    proofData?: {
      beforeUrl?: string;
      afterUrl?: string;
      type?: 'photo' | 'video';
      note?: string;
    }
  ) => void;
  addTask: (task: Omit<TaskDefinition, 'id' | 'createdAt' | 'archivedAt'>) => void;
  updateTask: (task: TaskDefinition) => void;
  deleteTask: (taskId: string) => void;

  // Expenses & Shopping Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (expenseId: string) => void;
  addShoppingItem: (name: string, category?: string, estimatedPrice?: number, quantity?: string) => void;
  toggleShoppingItem: (itemId: string) => void;
  deleteShoppingItem: (itemId: string) => void;
  finishShoppingWithCart: (cartItems: InStoreCartItem[], totalAmount: number) => void;

  // House / Garden / Equipment Actions
  updateWoodInventory: (update: Partial<WoodInventory>) => void;
  addEquipment: (item: Omit<EquipmentItem, 'id'>) => void;
  updateEquipment: (item: EquipmentItem) => void;
  deleteEquipment: (id: string) => void;
  addRoomSnapshot: (snapshot: Omit<RoomSnapshot, 'id' | 'capturedAt'>) => void;
  updateRoomSnapshot: (id: string, data: Partial<RoomSnapshot>) => void;
  createSosAlert: (alert: Omit<SosAlert, 'id' | 'createdAt' | 'status'>) => void;
  resolveSosAlert: (alertId: string) => void;
  addComment: (taskId: string | undefined, content: string) => void;
  saveNotificationSettings: (settings: NotificationSetting) => void;

  // Visual Zones Actions
  addVisualZone: (zone: Omit<VisualZone, 'id' | 'entries'>) => void;
  updateVisualZone: (id: string, updates: Partial<VisualZone>) => void;
  deleteVisualZone: (id: string) => void;
  addVisualEntry: (zoneId: string, entry: Omit<VisualEntry, 'id'>) => void;
  deleteVisualEntry: (zoneId: string, entryId: string) => void;

  // Feedback
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const ChataContext = createContext<ChataContextType | null>(null);

const STORAGE_KEY = 'nasza_chata_state_v1';
const PROFILE_STORAGE_KEY = 'nasza_chata_active_profile';

export const ChataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.profiles && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          return parsed.profiles;
        }
      }
    } catch {}
    return INITIAL_PROFILES;
  });

  const [currentProfile, setCurrentProfile] = useState<Profile>(() => {
    try {
      const savedProfileId = localStorage.getItem(PROFILE_STORAGE_KEY);
      const found = INITIAL_PROFILES.find(p => p.id === savedProfileId);
      return found || INITIAL_PROFILES[0];
    } catch {
      return INITIAL_PROFILES[0];
    }
  });

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

  const [tasks, setTasks] = useState<TaskDefinition[]>(INITIAL_TASKS);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(INITIAL_SHOPPING_ITEMS);
  const [woodInventory, setWoodInventory] = useState<WoodInventory>(INITIAL_WOOD_INVENTORY);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [roomSnapshots, setRoomSnapshots] = useState<RoomSnapshot[]>(INITIAL_ROOM_SNAPSHOTS);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>(INITIAL_SOS_ALERTS);
  const [comments, setComments] = useState<HouseComment[]>([]);
  const [notifications, setNotifications] = useState<Record<string, NotificationSetting>>({});
  const [visualZones, setVisualZones] = useState<VisualZone[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load from local storage or server on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.profiles && Array.isArray(parsed.profiles)) setProfiles(parsed.profiles);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.completions) setCompletions(parsed.completions);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.shoppingItems) setShoppingItems(parsed.shoppingItems);
        if (parsed.woodInventory) setWoodInventory(parsed.woodInventory);
        if (parsed.equipment) setEquipment(parsed.equipment);
        if (parsed.roomSnapshots) setRoomSnapshots(parsed.roomSnapshots);
        if (parsed.sosAlerts) setSosAlerts(parsed.sosAlerts);
        if (parsed.comments) setComments(parsed.comments);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.visualZones) setVisualZones(parsed.visualZones);
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    // Try background server sync
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.profiles && Array.isArray(data.profiles) && data.profiles.length > 0) {
            setProfiles(data.profiles);
          }
          if (data.tasks && data.tasks.length > 0) {
            setTasks(data.tasks);
          }
          if (data.completions) setCompletions(data.completions || []);
          if (data.expenses) setExpenses(data.expenses || INITIAL_EXPENSES);
          if (data.shoppingItems) setShoppingItems(data.shoppingItems || INITIAL_SHOPPING_ITEMS);
          if (data.woodInventory) setWoodInventory(data.woodInventory);
          if (data.equipment) setEquipment(data.equipment);
          if (data.roomSnapshots) setRoomSnapshots(data.roomSnapshots);
          if (data.sosAlerts) setSosAlerts(data.sosAlerts);
          if (data.comments) setComments(data.comments);
          if (data.notifications) setNotifications(data.notifications);
          if (data.visualZones) setVisualZones(data.visualZones);
        }
      })
      .catch(() => {
        // Offline or preview fallback
      });
  }, []);

  // One-time migration: RoomSnapshot[] → VisualZone[] (backward compatibility)
  useEffect(() => {
    if (roomSnapshots.length > 0 && visualZones.length === 0) {
      const migrated: VisualZone[] = roomSnapshots.map(snap => ({
        id: 'vzone-' + snap.id,
        name: snap.roomName,
        zoneType: snap.zone === 'garden' ? 'garden' : snap.zone === 'upper' ? 'room' : 'room',
        captureAngles: snap.angleName ? [snap.angleName] : undefined,
        entries: [
          {
            id: 'ventry-' + snap.id,
            capturedAt: snap.capturedAt,
            capturedById: snap.capturedById,
            capturedByName: snap.capturedByName,
            mediaType: 'photo' as const,
            mediaUrl: snap.photoUrl,
            angleLabel: snap.angleName,
            caption: snap.description,
            tags: snap.virtualTags,
          },
        ],
      }));
      setVisualZones(migrated);
    }
  }, [roomSnapshots]);

  // Save to local storage and sync to server
  const persistState = useCallback((stateUpdate: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateUpdate));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateUpdate),
      }).catch(() => {});
    } catch (e) {
      console.warn('Persistence error:', e);
    }
  }, []);

  // Trigger sync whenever core state changes
  useEffect(() => {
    persistState({
      profiles,
      tasks,
      completions,
      expenses,
      shoppingItems,
      woodInventory,
      equipment,
      roomSnapshots,
      sosAlerts,
      comments,
      notifications,
      visualZones,
    });
  }, [profiles, tasks, completions, expenses, shoppingItems, woodInventory, equipment, roomSnapshots, sosAlerts, comments, notifications, visualZones, persistState]);

  // Profile selection
  const selectProfile = (profile: Profile) => {
    if (profile.pin) {
      setPendingProfile(profile);
      setIsPinModalOpen(true);
    } else {
      setCurrentProfile(profile);
      localStorage.setItem(PROFILE_STORAGE_KEY, profile.id);
      showToast('Przełączono profil', `Aktywny profil: ${profile.name}`, 'info');
    }
  };

  const verifyAndSetProfile = (enteredPin: string): boolean => {
    if (pendingProfile && pendingProfile.pin === enteredPin) {
      setCurrentProfile(pendingProfile);
      localStorage.setItem(PROFILE_STORAGE_KEY, pendingProfile.id);
      setIsPinModalOpen(false);
      setPendingProfile(null);
      showToast('Zalogowano', `Profil: ${pendingProfile.name}`, 'success');
      return true;
    }
    return false;
  };

  const cancelProfileSwitch = () => {
    setIsPinModalOpen(false);
    setPendingProfile(null);
  };

  // Update profile details (e.g. photoUrl, avatar, name, role)
  const updateProfile = (profileId: string, updates: Partial<Profile>) => {
    setProfiles(prev =>
      prev.map(p => {
        if (p.id === profileId) {
          const updated = { ...p, ...updates };
          if (currentProfile.id === profileId) {
            setCurrentProfile(updated);
          }
          return updated;
        }
        return p;
      })
    );
    showToast('Zaktualizowano profil', 'Zdjęcie / dane profilu zostały zapisane.', 'success');
  };

  // Admin assigning task to a person
  const assignTask = (taskId: string, profileId: string | null) => {
    const assignedProfile = profileId ? profiles.find(p => p.id === profileId) : null;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            assignedTo: profileId,
            assignedToName: assignedProfile ? assignedProfile.name : null,
          };
        }
        return t;
      })
    );

    if (assignedProfile) {
      showToast('Przypisano zadanie', `Zadanie przydzielono: ${assignedProfile.name}`, 'success');
    } else {
      showToast('Zdjęto przypisanie', 'Zadanie jest ogólne (dla każdego)', 'info');
    }
  };

  // Toggle Task Completion with attribution
  const toggleTaskCompletion = (
    taskId: string,
    targetDate: Date,
    proofData?: {
      beforeUrl?: string;
      afterUrl?: string;
      type?: 'photo' | 'video';
      note?: string;
    }
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const periodKey = getPeriodKey(task, targetDate);
    const existingIndex = completions.findIndex(
      c => c.taskId === taskId && c.periodKey === periodKey
    );

    if (existingIndex >= 0) {
      // Uncheck
      setCompletions(prev => prev.filter((_, idx) => idx !== existingIndex));
      showToast('Cofnięto wykonanie', `Zadanie "${task.name}" odznaczone.`, 'info');
    } else {
      // Complete!
      const newCompletion: TaskCompletion = {
        id: 'comp-' + Date.now().toString(),
        taskId,
        periodKey,
        completedById: currentProfile.id,
        completedByName: currentProfile.name,
        completedAt: new Date().toISOString(),
        proofBeforeUrl: proofData?.beforeUrl,
        proofAfterUrl: proofData?.afterUrl,
        proofType: proofData?.type || 'photo',
        proofNote: proofData?.note,
      };

      setCompletions(prev => [...prev, newCompletion]);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
          colors: [currentProfile.colorHex, '#D4A359', '#10B981'],
        });
      } catch {}

      showToast(
        'Wykonano obowiązek! 👏',
        `${currentProfile.name} odhaczył(a): ${task.name}`,
        'success'
      );
    }
  };

  const addTask = (taskData: Omit<TaskDefinition, 'id' | 'createdAt' | 'archivedAt'>) => {
    const newTask: TaskDefinition = {
      ...taskData,
      id: 'task-custom-' + Date.now().toString(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    setTasks(prev => [...prev, newTask]);
    showToast('Dodano obowiązek', newTask.name, 'success');
  };

  const updateTask = (updated: TaskDefinition) => {
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    showToast('Zaktualizowano obowiązek', updated.name, 'info');
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setCompletions(prev => prev.filter(c => c.taskId !== taskId));
    showToast('Usunięto obowiązek', '', 'info');
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev]);
    showToast('Zapisano wydatek', `${newExpense.amount.toFixed(2)} PLN — ${newExpense.note}`, 'success');
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    showToast('Usunięto wpis wydatku', '', 'info');
  };

  // Shopping List
  const addShoppingItem = (name: string, category = 'Inne', estimatedPrice?: number, quantity?: string) => {
    const newItem: ShoppingItem = {
      id: 'shop-' + Date.now().toString(),
      name,
      category,
      quantity,
      estimatedPrice,
      isBought: false,
      addedById: currentProfile.id,
      addedByName: currentProfile.name,
      createdAt: new Date().toISOString(),
    };
    setShoppingItems(prev => [newItem, ...prev]);
    showToast('Dodano do listy zakupów', name, 'info');
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const nowBought = !item.isBought;
          return {
            ...item,
            isBought: nowBought,
            boughtById: nowBought ? currentProfile.id : undefined,
            boughtByName: nowBought ? currentProfile.name : undefined,
          };
        }
        return item;
      })
    );
  };

  const deleteShoppingItem = (itemId: string) => {
    setShoppingItems(prev => prev.filter(item => item.id !== itemId));
  };

  const finishShoppingWithCart = (cartItems: InStoreCartItem[], totalAmount: number) => {
    if (cartItems.length === 0 && totalAmount <= 0) return;

    const notesSummary = cartItems.map(c => `${c.name} (${c.quantity}x ${c.price.toFixed(2)} zł)`).join(', ');
    const newExpense: Expense = {
      id: 'exp-' + Date.now().toString(),
      amount: totalAmount,
      note: notesSummary ? `Zakupy w sklepie: ${notesSummary}` : 'Zakupy z kalkulatora zakupowego',
      category: 'Spożywcze & Dom',
      date: new Date().toISOString().split('T')[0],
      boughtById: currentProfile.id,
      boughtByName: currentProfile.name,
      createdAt: new Date().toISOString(),
    };

    setExpenses(prev => [newExpense, ...prev]);

    // Also mark matching shopping items as bought
    const cartNames = cartItems.map(c => c.name.toLowerCase());
    setShoppingItems(prev =>
      prev.map(item => {
        if (cartNames.some(cn => item.name.toLowerCase().includes(cn) || cn.includes(item.name.toLowerCase()))) {
          return { ...item, isBought: true, boughtById: currentProfile.id, boughtByName: currentProfile.name };
        }
        return item;
      })
    );

    // Also mark the cyclic task "Zrobić zakupy" as completed for today!
    const shoppingTask = tasks.find(t => t.category === 'shopping' || t.name.toLowerCase().includes('zakupy'));
    if (shoppingTask) {
      toggleTaskCompletion(shoppingTask.id, new Date());
    }

    showToast('Zakończono zakupy! 🛒', `Zapisano wydatek ${totalAmount.toFixed(2)} PLN na konto ${currentProfile.name}.`, 'success');
  };

  // Wood & Equipment
  const updateWoodInventory = (update: Partial<WoodInventory>) => {
    setWoodInventory(prev => ({
      ...prev,
      ...update,
      updatedAt: new Date().toISOString(),
    }));
    showToast('Zaktualizowano stan drewna', `Aktualnie: ${(update.estimatedM3 ?? woodInventory.estimatedM3).toFixed(1)} m³`, 'success');
  };

  const addEquipment = (itemData: Omit<EquipmentItem, 'id'>) => {
    const newItem: EquipmentItem = {
      ...itemData,
      id: 'eq-' + Date.now().toString(),
    };
    setEquipment(prev => [...prev, newItem]);
    showToast('Dodano sprzęt do rejestru', newItem.name, 'success');
  };

  const updateEquipment = (item: EquipmentItem) => {
    setEquipment(prev => prev.map(eq => (eq.id === item.id ? item : eq)));
    showToast('Zaktualizowano dane sprzętu', item.name, 'info');
  };

  const deleteEquipment = (id: string) => {
    setEquipment(prev => prev.filter(eq => eq.id !== id));
    showToast('Usunięto sprzęt z rejestru', '', 'info');
  };

  const addRoomSnapshot = (snapshotData: Omit<RoomSnapshot, 'id' | 'capturedAt'>) => {
    const newSnapshot: RoomSnapshot = {
      ...snapshotData,
      id: 'snap-' + Date.now().toString(),
      capturedAt: new Date().toISOString(),
    };
    setRoomSnapshots(prev => [newSnapshot, ...prev]);
    showToast('Zapisano zdjęcie pomieszczenia', newSnapshot.roomName, 'success');
  };

  const updateRoomSnapshot = (id: string, data: Partial<RoomSnapshot>) => {
    setRoomSnapshots(prev => prev.map(snap => snap.id === id ? { ...snap, ...data } : snap));
  };

  const createSosAlert = (alertData: Omit<SosAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: SosAlert = {
      ...alertData,
      id: 'sos-' + Date.now().toString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setSosAlerts(prev => [newAlert, ...prev]);
    showToast('🚨 Zgłoszono awarię SOS!', `${newAlert.title} (${newAlert.room})`, 'error');
  };

  const resolveSosAlert = (alertId: string) => {
    setSosAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved',
              resolvedById: currentProfile.id,
              resolvedByName: currentProfile.name,
              resolvedAt: new Date().toISOString(),
            }
          : a
      )
    );
    showToast('Rozwiązano zgłoszenie SOS', 'Awaria oznaczona jako naprawiona.', 'success');
  };

  const addComment = (taskId: string | undefined, content: string) => {
    const newComment: HouseComment = {
      id: 'comm-' + Date.now().toString(),
      taskId,
      authorId: currentProfile.id,
      authorName: currentProfile.name,
      content,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, newComment]);
    showToast('Dodano notatkę', content.substring(0, 30) + '...', 'info');
  };

  const saveNotificationSettings = (settings: NotificationSetting) => {
    setNotifications(prev => ({
      ...prev,
      [settings.profileId]: settings,
    }));
    showToast('Zapisano ustawienia powiadomień', '', 'success');
  };

  // Visual Zones
  const addVisualZone = (zoneData: Omit<VisualZone, 'id' | 'entries'>) => {
    const newZone: VisualZone = {
      ...zoneData,
      id: 'vzone-' + Date.now().toString(),
      entries: [],
    };
    setVisualZones(prev => [...prev, newZone]);
    showToast('Dodano strefę wizualną', newZone.name, 'success');
  };

  const updateVisualZone = (id: string, updates: Partial<VisualZone>) => {
    setVisualZones(prev => prev.map(z => (z.id === id ? { ...z, ...updates } : z)));
  };

  const deleteVisualZone = (id: string) => {
    setVisualZones(prev => prev.filter(z => z.id !== id));
    showToast('Usunięto strefę wizualną', '', 'info');
  };

  const addVisualEntry = (zoneId: string, entryData: Omit<VisualEntry, 'id'>) => {
    const newEntry: VisualEntry = {
      ...entryData,
      id: 'ventry-' + Date.now().toString(),
    };
    setVisualZones(prev =>
      prev.map(z =>
        z.id === zoneId ? { ...z, entries: [...z.entries, newEntry] } : z
      )
    );
    showToast('Dodano wpis wizualny', newEntry.angleLabel || 'Zdjęcie', 'success');
  };

  const deleteVisualEntry = (zoneId: string, entryId: string) => {
    setVisualZones(prev =>
      prev.map(z =>
        z.id === zoneId
          ? { ...z, entries: z.entries.filter(e => e.id !== entryId) }
          : z
      )
    );
    showToast('Usunięto wpis wizualny', '', 'info');
  };

  return (
    <ChataContext.Provider
      value={{
        currentProfile,
        profiles,
        selectProfile,
        isPinModalOpen,
        setIsPinModalOpen,
        pendingProfile,
        verifyAndSetProfile,
        cancelProfileSwitch,
        tasks,
        completions,
        expenses,
        shoppingItems,
        woodInventory,
        equipment,
        roomSnapshots,
        sosAlerts,
        comments,
        notifications,
        updateProfile,
        assignTask,
        toggleTaskCompletion,
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        deleteExpense,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        finishShoppingWithCart,
        updateWoodInventory,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        addRoomSnapshot,
        updateRoomSnapshot,
        createSosAlert,
        resolveSosAlert,
        addComment,
        saveNotificationSettings,
        visualZones,
        addVisualZone,
        updateVisualZone,
        deleteVisualZone,
        addVisualEntry,
        deleteVisualEntry,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </ChataContext.Provider>
  );
};

export function useChata() {
  const context = useContext(ChataContext);
  if (!context) {
    throw new Error('useChata must be used within a ChataProvider');
  }
  return context;
}
