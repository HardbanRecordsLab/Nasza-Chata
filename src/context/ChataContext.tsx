import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  WeeklyPlan,
  ProcessingJob,
  JobStatus,
  BoardMessage,
  PantryItem,
  BudgetLimit,
  AbsenceMode,
  FamilyEvent,
  EquipmentServiceEntry,
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
  saveTaskProof: (
    taskId: string,
    targetDate: Date,
    proofData: {
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

  // Walk-In (CPU)
  createWalkinGraph: (zoneId: string) => Promise<any>;
  createAutoHotspots: (zoneId: string) => Promise<any>;
  walkinJobs: Record<string, ProcessingJob>;
  startWalkinJob: (zoneId: string) => Promise<void>;

  // Weekly Plans (admin tool)
  weeklyPlans: WeeklyPlan[];
  getWeeklyPlan: (weekStart: string) => WeeklyPlan | undefined;
  saveWeeklyPlan: (plan: WeeklyPlan) => void;
  setWeeklyAssignment: (weekStart: string, taskId: string, profileId: string | null) => void;
  deleteWeeklyPlan: (weekStart: string) => void;

  // Board — Tablica wiadomości (wspólna)
  boardMessages: BoardMessage[];
  addBoardMessage: (content: string) => void;
  deleteBoardMessage: (id: string) => void;
  togglePinBoardMessage: (id: string) => void;

  // Pantry — Spiżarnia
  pantryItems: PantryItem[];
  addPantryItem: (item: Omit<PantryItem, 'id' | 'addedAt' | 'addedById'>) => void;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => void;
  deletePantryItem: (id: string) => void;

  // Budget — Limity
  budgetLimits: Record<string, BudgetLimit>;
  setBudgetLimit: (category: string, limit: number) => void;

  // Absence — Tryb nieobecność
  absenceMode: AbsenceMode | null;
  setAbsenceMode: (mode: AbsenceMode | null) => void;
  toggleAbsenceChecklist: (id: string) => void;

  // Family Calendar
  familyEvents: FamilyEvent[];
  addFamilyEvent: (event: Omit<FamilyEvent, 'id'>) => void;
  deleteFamilyEvent: (id: string) => void;

  // Equipment history
  equipmentHistory: EquipmentServiceEntry[];
  addEquipmentService: (entry: Omit<EquipmentServiceEntry, 'id' | 'createdById'>) => void;

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
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [walkinJobs, setWalkinJobs] = useState<Record<string, ProcessingJob>>({});
  const [boardMessages, setBoardMessages] = useState<BoardMessage[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [budgetLimits, setBudgetLimitsState] = useState<Record<string, BudgetLimit>>({});
  const [absenceMode, setAbsenceModeState] = useState<AbsenceMode | null>(null);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [equipmentHistory, setEquipmentHistory] = useState<EquipmentServiceEntry[]>([]);

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
        if (parsed.weeklyPlans) setWeeklyPlans(parsed.weeklyPlans);
        if (parsed.boardMessages) setBoardMessages(parsed.boardMessages);
        if (parsed.pantryItems) setPantryItems(parsed.pantryItems);
        if (parsed.budgetLimits) setBudgetLimitsState(parsed.budgetLimits);
        if (parsed.absenceMode) setAbsenceModeState(parsed.absenceMode);
        if (parsed.familyEvents) setFamilyEvents(parsed.familyEvents);
        if (parsed.equipmentHistory) setEquipmentHistory(parsed.equipmentHistory);
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    // Try background server sync.
    // Guard: only let the server overwrite a field when it actually carries data.
    // This stops an empty server response (e.g. in-memory mode after a cold start,
    // or an offline preview) from wiping localStorage-restored data or the seed set.
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        if (!data || typeof data !== 'object') return;

        const applyArray = <T,>(val: unknown, setter: (v: T[]) => void) => {
          if (Array.isArray(val) && val.length > 0) setter(val as T[]);
        };
        const applyRecord = (val: unknown, setter: (v: any) => void) => {
          if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
            setter(val);
          }
        };

        applyArray(data.profiles, setProfiles);
        applyArray(data.tasks, setTasks);
        applyArray(data.completions, setCompletions);
        applyArray(data.expenses, setExpenses);
        applyArray(data.shoppingItems, setShoppingItems);
        if (data.woodInventory && typeof data.woodInventory === 'object') setWoodInventory(data.woodInventory);
        applyArray(data.equipment, setEquipment);
        applyArray(data.roomSnapshots, setRoomSnapshots);
        applyArray(data.sosAlerts, setSosAlerts);
        applyArray(data.comments, setComments);
        applyRecord(data.notifications, setNotifications);
        applyArray(data.visualZones, setVisualZones);
        applyArray((data as any).weeklyPlans, setWeeklyPlans);
        applyArray((data as any).boardMessages, setBoardMessages);
        applyArray((data as any).pantryItems, setPantryItems);
        applyRecord((data as any).budgetLimits, setBudgetLimitsState);
        if ((data as any).absenceMode && typeof (data as any).absenceMode === 'object') {
          setAbsenceModeState((data as any).absenceMode);
        }
        applyArray((data as any).familyEvents, setFamilyEvents);
        applyArray((data as any).equipmentHistory, setEquipmentHistory);
      })
      .catch(() => {
        // Offline or preview fallback
      });
  }, []);

  // One-time migration: RoomSnapshot[] → VisualZone[] (backward compatibility)
  const didMigrateSnapshotsRef = useRef(false);
  useEffect(() => {
    if (didMigrateSnapshotsRef.current) return;
    if (roomSnapshots.length > 0 && visualZones.length === 0) {
      didMigrateSnapshotsRef.current = true;
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

  // Save to local storage immediately, sync to server with debounce (avoids MBs of base64 on every click)
  const persistState = useCallback((stateUpdate: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateUpdate));
    } catch (e) {
      console.warn('LocalStorage persistence error:', e);
    }
    // fire-and-forget server sync (debounced by caller)
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateUpdate),
    }).catch(() => {});
  }, []);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstPersistRef = useRef(true);

  // Trigger sync whenever core state changes — debounced 1.5s, skip initial mount
  useEffect(() => {
    if (isFirstPersistRef.current) {
      isFirstPersistRef.current = false;
      return;
    }
    // Immediate localStorage write for offline safety
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
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
          weeklyPlans,
          boardMessages,
          pantryItems,
          budgetLimits,
          absenceMode,
          familyEvents,
          equipmentHistory,
        })
      );
    } catch {}

    // Debounced server sync
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
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
        weeklyPlans,
        boardMessages,
        pantryItems,
        budgetLimits,
        absenceMode,
        familyEvents,
        equipmentHistory,
      } as any);
    }, 1500);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [profiles, tasks, completions, expenses, shoppingItems, woodInventory, equipment, roomSnapshots, sosAlerts, comments, notifications, visualZones, weeklyPlans, boardMessages, pantryItems, budgetLimits, absenceMode, familyEvents, equipmentHistory, persistState]);

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

  // Attach / update a photo-video proof WITHOUT toggling completion off.
  // If the task is not yet done for this period it gets completed (with proof);
  // if it is already done, only the proof fields on the existing entry change.
  const saveTaskProof = (
    taskId: string,
    targetDate: Date,
    proofData: { beforeUrl?: string; afterUrl?: string; type?: 'photo' | 'video'; note?: string }
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const periodKey = getPeriodKey(task, targetDate);

    setCompletions(prev => {
      const idx = prev.findIndex(c => c.taskId === taskId && c.periodKey === periodKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          proofBeforeUrl: proofData.beforeUrl ?? copy[idx].proofBeforeUrl,
          proofAfterUrl: proofData.afterUrl ?? copy[idx].proofAfterUrl,
          proofType: proofData.type || copy[idx].proofType || 'photo',
          proofNote: proofData.note ?? copy[idx].proofNote,
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: 'comp-' + Date.now().toString(),
          taskId,
          periodKey,
          completedById: currentProfile.id,
          completedByName: currentProfile.name,
          completedAt: new Date().toISOString(),
          proofBeforeUrl: proofData.beforeUrl,
          proofAfterUrl: proofData.afterUrl,
          proofType: proofData.type || 'photo',
          proofNote: proofData.note,
        },
      ];
    });

    const wasDone = completions.some(c => c.taskId === taskId && c.periodKey === periodKey);
    if (!wasDone) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 }, colors: [currentProfile.colorHex, '#D4A359', '#10B981'] });
      } catch {}
      showToast('Wykonano obowiązek! 👏', `${currentProfile.name} odhaczył(a): ${task.name}`, 'success');
    } else {
      showToast('Zapisano dowód', task.name, 'success');
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

    // Fire a real Web Push to every subscribed device — family emergency
    fetch('/api/notifications?action=send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `🚨 SOS: ${newAlert.title}`,
        body: `${newAlert.room} — zgłosił(a) ${newAlert.reportedByName}. Wymagana reakcja domowników.`,
        url: '/?action=sos',
        tag: 'chata-sos',
        type: 'warning',
        targetProfileId: 'all',
        respectPref: 'sosAlerts',
      }),
    }).catch(() => {});
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

    // Auto-create monthly cyclic task for photo updates
    const updateTask: TaskDefinition = {
      id: 'task-visual-update-' + Date.now().toString(),
      name: `Zaktualizuj zdjęcia: ${newZone.name}`,
      category: 'maintenance',
      frequency: 'monthly',
      seasonStart: null,
      seasonEnd: null,
      isCustom: false,
      room: newZone.name,
      defaultOrder: 50,
      description: `Cykliczna aktualizacja dokumentacji fotograficznej strefy „${newZone.name}".`,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    setTasks(prev => [...prev, updateTask]);
    showToast('Dodano strefę wizualną', `${newZone.name} + zadanie przypominające (miesięcznie)`, 'success');
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

  // Walk-In (CPU, bez GPU) — Viewpoint Graph + auto-hotspots
  const createWalkinGraph = useCallback(async (zoneId: string) => {
    try {
      const res = await fetch('/api/walkin?action=create-viewpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd walk-in');
      // refresh from server
      try {
        const sRes = await fetch('/api/state');
        const s = await sRes.json();
        if (s.visualZones) setVisualZones(s.visualZones);
      } catch {}
      showToast('Walk-In gotowy', data.message, 'success');
      return data;
    } catch (e: any) {
      showToast('Błąd Walk-In', e.message, 'error');
      throw e;
    }
  }, [showToast]);

  const createAutoHotspots = useCallback(async (zoneId: string) => {
    try {
      const res = await fetch('/api/walkin?action=auto-hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd hotspotów');
      try {
        const sRes = await fetch('/api/state');
        const s = await sRes.json();
        if (s.visualZones) setVisualZones(s.visualZones);
      } catch {}
      showToast('Hotspoty gotowe', data.message, 'success');
      return data;
    } catch (e: any) {
      showToast('Błąd hotspotów', e.message, 'error');
      throw e;
    }
  }, [showToast]);

  const startWalkinJob = useCallback(async (zoneId: string) => {
    const jobId = `job-${zoneId}-${Date.now()}`;
    const now = new Date().toISOString();
    const setStatus = (status: JobStatus, progress: number, result?: any) => {
      setWalkinJobs(prev => ({
        ...prev,
        [zoneId]: {
          id: jobId,
          zoneId,
          type: 'walkin',
          status,
          progress,
          createdAt: prev[zoneId]?.createdAt || now,
          updatedAt: new Date().toISOString(),
          result,
        },
      }));
    };

    setStatus('queued', 5);
    await new Promise(r => setTimeout(r, 300));
    setStatus('analyzing', 20);
    await new Promise(r => setTimeout(r, 400));
    setStatus('extracting', 35);
    await new Promise(r => setTimeout(r, 300));
    setStatus('finding-viewpoints', 55);
    await new Promise(r => setTimeout(r, 300));

    setStatus('building-graph', 75);
    try {
      await createWalkinGraph(zoneId);
    } catch (e: any) {
      setStatus('failed', 75, { error: e.message });
      throw e;
    }

    setStatus('creating-hotspots', 90);
    try {
      await createAutoHotspots(zoneId);
    } catch (e: any) {
      // hotspot failure not fatal — still ready
      console.warn('Hotspot auto failed', e);
    }

    setStatus('ready', 100, { message: 'Walk-In gotowy (CPU, bez GPU)' });
    setTimeout(() => {
      setWalkinJobs(prev => {
        const copy = { ...prev };
        delete copy[zoneId];
        return copy;
      });
    }, 3000);
  }, [createWalkinGraph, createAutoHotspots]);

  // Weekly Plans (admin tool)
  const getWeeklyPlan = useCallback((weekStart: string) => weeklyPlans.find(p => p.weekStart === weekStart), [weeklyPlans]);

  const saveWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    setWeeklyPlans(prev => {
      const idx = prev.findIndex(p => p.weekStart === plan.weekStart);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...plan, updatedAt: new Date().toISOString() };
        return copy;
      }
      return [...prev, plan];
    });
    showToast('Zapisano plan tygodniowy', `Tydzień od ${plan.weekStart}`, 'success');
  }, [showToast]);

  const setWeeklyAssignment = useCallback((weekStart: string, taskId: string, profileId: string | null) => {
    setWeeklyPlans(prev => {
      const existing = prev.find(p => p.weekStart === weekStart);
      const now = new Date().toISOString();
      if (existing) {
        const updated: WeeklyPlan = {
          ...existing,
          assignments: { ...existing.assignments, [taskId]: profileId },
          updatedAt: now,
        };
        return prev.map(p => p.weekStart === weekStart ? updated : p);
      }
      // create new plan for this week
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const newPlan: WeeklyPlan = {
        id: weekStart,
        weekStart,
        weekEnd: weekEndDate.toISOString().split('T')[0],
        assignments: { [taskId]: profileId },
        createdAt: now,
        updatedAt: now,
        createdById: currentProfile.id,
      };
      return [...prev, newPlan];
    });
  }, [currentProfile.id]);

  const deleteWeeklyPlan = useCallback((weekStart: string) => {
    setWeeklyPlans(prev => prev.filter(p => p.weekStart !== weekStart));
    showToast('Usunięto plan tygodniowy', weekStart, 'info');
  }, [showToast]);

  // Board — Tablica wiadomości
  const addBoardMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    const msg: BoardMessage = {
      id: 'board-' + Date.now().toString(),
      authorId: currentProfile.id,
      authorName: currentProfile.name,
      authorAvatar: currentProfile.avatar,
      content: content.trim().slice(0, 280),
      createdAt: new Date().toISOString(),
      pinned: false,
    };
    setBoardMessages(prev => [msg, ...prev].slice(0, 50));
    showToast('Dodano wiadomość', content.slice(0, 30), 'success');
  }, [currentProfile, showToast]);

  const deleteBoardMessage = useCallback((id: string) => {
    setBoardMessages(prev => prev.filter(m => m.id !== id));
    showToast('Usunięto wiadomość', '', 'info');
  }, [showToast]);

  const togglePinBoardMessage = useCallback((id: string) => {
    setBoardMessages(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m).sort((a,b) => (Number(b.pinned) - Number(a.pinned)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  // Pantry — Spiżarnia
  const addPantryItem = useCallback((item: Omit<PantryItem, 'id' | 'addedAt' | 'addedById'>) => {
    const newItem: PantryItem = { ...item, id: 'pantry-' + Date.now().toString(), addedAt: new Date().toISOString(), addedById: currentProfile.id };
    setPantryItems(prev => [newItem, ...prev]);
    showToast('Dodano do spiżarni', item.name, 'success');
  }, [currentProfile.id, showToast]);
  const updatePantryItem = useCallback((id: string, updates: Partial<PantryItem>) => {
    setPantryItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);
  const deletePantryItem = useCallback((id: string) => {
    setPantryItems(prev => prev.filter(p => p.id !== id));
    showToast('Usunięto z spiżarni', '', 'info');
  }, [showToast]);

  // Budget — Limity
  const setBudgetLimit = useCallback((category: string, limit: number) => {
    setBudgetLimitsState(prev => ({ ...prev, [category]: { category, limit, period: 'monthly' } }));
    showToast('Ustawiono limit', `${category}: ${limit} zł`, 'success');
  }, [showToast]);

  // Absence — Tryb nieobecność
  const setAbsenceMode = useCallback((mode: AbsenceMode | null) => {
    setAbsenceModeState(mode);
    if (mode?.active) showToast('Tryb nieobecność aktywny', `${mode.startDate} → ${mode.endDate}`, 'warning');
    else showToast('Tryb nieobecność wyłączony', '', 'info');
  }, [showToast]);
  const toggleAbsenceChecklist = useCallback((id: string) => {
    setAbsenceModeState(prev => prev ? { ...prev, checklist: prev.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) } : prev);
  }, []);

  // Family Events
  const addFamilyEvent = useCallback((event: Omit<FamilyEvent, 'id'>) => {
    const newEvent: FamilyEvent = { ...event, id: 'fevent-' + Date.now().toString() };
    setFamilyEvents(prev => [...prev, newEvent].sort((a,b) => a.date.localeCompare(b.date)));
    showToast('Dodano wydarzenie', event.title, 'success');
  }, [showToast]);
  const deleteFamilyEvent = useCallback((id: string) => {
    setFamilyEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Equipment history
  const addEquipmentService = useCallback((entry: Omit<EquipmentServiceEntry, 'id' | 'createdById'>) => {
    const newEntry: EquipmentServiceEntry = { ...entry, id: 'esvc-' + Date.now().toString(), createdById: currentProfile.id };
    setEquipmentHistory(prev => [newEntry, ...prev]);
    showToast('Dodano serwis', entry.note.slice(0, 30), 'success');
  }, [currentProfile.id, showToast]);

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
        saveTaskProof,
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
        createWalkinGraph,
        createAutoHotspots,
        walkinJobs,
        startWalkinJob,
        weeklyPlans,
        getWeeklyPlan,
        saveWeeklyPlan,
        setWeeklyAssignment,
        deleteWeeklyPlan,
        boardMessages,
        addBoardMessage,
        deleteBoardMessage,
        togglePinBoardMessage,
        pantryItems,
        addPantryItem,
        updatePantryItem,
        deletePantryItem,
        budgetLimits,
        setBudgetLimit,
        absenceMode,
        setAbsenceMode,
        toggleAbsenceChecklist,
        familyEvents,
        addFamilyEvent,
        deleteFamilyEvent,
        equipmentHistory,
        addEquipmentService,
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
