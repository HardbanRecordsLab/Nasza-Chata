import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export interface DatabaseSchema {
  tasks: any[];
  completions: any[];
  expenses: any[];
  shoppingItems: any[];
  equipment: any[];
  woodInventory: any;
  roomSnapshots: any[];
  visualZones: any[];
  sosAlerts: any[];
  comments: any[];
  notifications: any;
  profiles?: any[];
  weeklyPlans?: any[];
  walkinJobs?: any;
  boardMessages?: any[];
  pantryItems?: any[];
  budgetLimits?: any;
  absenceMode?: any;
  familyEvents?: any[];
  equipmentHistory?: any[];
}

export interface PushSubscriptionRecord {
  id: string;
  profileId: string;
  subscription: any;
  createdAt: string;
}

// In-Memory fallback store
let memoryState: DatabaseSchema = {
  tasks: [],
  completions: [],
  expenses: [],
  shoppingItems: [],
  equipment: [],
  woodInventory: null,
  roomSnapshots: [],
  visualZones: [],
  sosAlerts: [],
  comments: [],
  notifications: {},
  weeklyPlans: [],
  boardMessages: [],
  pantryItems: [],
  budgetLimits: {},
  absenceMode: null,
  familyEvents: [],
  equipmentHistory: [],
};

let memoryPushSubscriptions: PushSubscriptionRecord[] = [];

// Monotonic version of the stored state — bumped on every save. Used for
// optimistic-concurrency merge so two devices syncing within the debounce
// window don't clobber each other's additions.
let stateVersion = Date.now();

// Collections that are mostly appended to (rarely edited in place). On a
// concurrent-write conflict these are UNION-merged by id so nobody's new
// entry is lost. Everything else is last-write-wins (needed for deletes/edits).
const APPEND_HEAVY: (keyof DatabaseSchema)[] = [
  'completions',
  'expenses',
  'comments',
  'sosAlerts',
  'boardMessages',
  'familyEvents',
  'equipmentHistory',
];

function mergeById(existing: any[], incoming: any[]): any[] {
  const byId = new Map<string, any>();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (item && item.id != null) byId.set(String(item.id), item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (item && item.id != null) byId.set(String(item.id), item); // incoming wins on id clash
  }
  return [...byId.values()];
}

export function getStateVersion(): number {
  return stateVersion;
}

// Postgres Pool Setup
let pgPool: Pool | null = null;
let isPgInitialized = false;

function getPgConnectionUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
}

export function getPgPool(): Pool | null {
  const connectionString = getPgConnectionUrl();
  if (!connectionString) {
    return null;
  }

  if (!pgPool) {
    pgPool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pgPool;
}

async function initPostgresTables(pool: Pool): Promise<void> {
  if (isPgInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chata_store (
        key VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chata_push_subscriptions (
        id VARCHAR(128) PRIMARY KEY,
        profile_id VARCHAR(64),
        endpoint TEXT UNIQUE NOT NULL,
        subscription JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    isPgInitialized = true;
    console.log('[DB] PostgreSQL / Neon tables verified successfully.');
  } catch (err) {
    console.warn('[DB] Could not initialize PostgreSQL tables, continuing with fallback:', err);
  }
}

// Local filesystem fallback
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chata_db.json');

function readLocalJson(): DatabaseSchema | null {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[DB] Local JSON read warning:', e);
  }
  return null;
}

function writeLocalJson(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Ignored in read-only serverless lambdas
  }
}

// Load initial file data into memory if available
const localSaved = readLocalJson();
if (localSaved) {
  memoryState = { ...memoryState, ...localSaved };
}

/**
 * Get the full state of the app
 */
export async function getDbState(): Promise<DatabaseSchema> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPostgresTables(pool);
      const res = await pool.query(
        `SELECT data, (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS v FROM chata_store WHERE key = $1`,
        ['main_state']
      );
      if (res.rows.length > 0 && res.rows[0].data) {
        memoryState = res.rows[0].data;
        const v = Number(res.rows[0].v);
        if (Number.isFinite(v) && v > 0) stateVersion = v;
        return memoryState;
      }
    } catch (err) {
      console.warn('[DB] PostgreSQL read error, using memory fallback:', err);
    }
  }
  return memoryState;
}

/**
 * Save full state of the app.
 * @param baseVersion the stateVersion the client last saw; if the stored state
 *   moved on since then, append-heavy collections are union-merged instead of replaced.
 */
export async function saveDbState(
  incoming: Partial<DatabaseSchema>,
  baseVersion?: number
): Promise<DatabaseSchema> {
  if (!incoming || typeof incoming !== 'object') {
    return memoryState;
  }

  // Refresh version + memoryState from the store so a concurrent write is visible
  await getDbState();

  const stale = typeof baseVersion === 'number' && baseVersion > 0 && baseVersion < stateVersion;
  const src: Partial<DatabaseSchema> = { ...incoming };
  if (stale) {
    for (const key of APPEND_HEAVY) {
      if (Array.isArray((incoming as any)[key])) {
        (src as any)[key] = mergeById((memoryState as any)[key] || [], (incoming as any)[key]);
      }
    }
  }

  incoming = src;
  memoryState = {
    tasks: Array.isArray(incoming.tasks) ? incoming.tasks : memoryState.tasks,
    completions: Array.isArray(incoming.completions) ? incoming.completions : memoryState.completions,
    expenses: Array.isArray(incoming.expenses) ? incoming.expenses : memoryState.expenses,
    shoppingItems: Array.isArray(incoming.shoppingItems) ? incoming.shoppingItems : memoryState.shoppingItems,
    equipment: Array.isArray(incoming.equipment) ? incoming.equipment : memoryState.equipment,
    woodInventory: incoming.woodInventory ?? memoryState.woodInventory,
    roomSnapshots: Array.isArray(incoming.roomSnapshots) ? incoming.roomSnapshots : memoryState.roomSnapshots,
    visualZones: Array.isArray(incoming.visualZones) ? incoming.visualZones : memoryState.visualZones,
    sosAlerts: Array.isArray(incoming.sosAlerts) ? incoming.sosAlerts : memoryState.sosAlerts,
    comments: Array.isArray(incoming.comments) ? incoming.comments : memoryState.comments,
    notifications: incoming.notifications ?? memoryState.notifications,
    profiles: Array.isArray(incoming.profiles) ? incoming.profiles : memoryState.profiles,
    weeklyPlans: Array.isArray((incoming as any).weeklyPlans) ? (incoming as any).weeklyPlans : (memoryState as any).weeklyPlans ?? [],
    boardMessages: Array.isArray((incoming as any).boardMessages) ? (incoming as any).boardMessages : (memoryState as any).boardMessages ?? [],
    pantryItems: Array.isArray((incoming as any).pantryItems) ? (incoming as any).pantryItems : (memoryState as any).pantryItems ?? [],
    budgetLimits: (incoming as any).budgetLimits ?? (memoryState as any).budgetLimits ?? {},
    absenceMode: (incoming as any).absenceMode ?? (memoryState as any).absenceMode ?? null,
    familyEvents: Array.isArray((incoming as any).familyEvents) ? (incoming as any).familyEvents : (memoryState as any).familyEvents ?? [],
    equipmentHistory: Array.isArray((incoming as any).equipmentHistory) ? (incoming as any).equipmentHistory : (memoryState as any).equipmentHistory ?? [],
  };

  stateVersion = Date.now();
  writeLocalJson(memoryState);

  const pool = getPgPool();
  if (pool) {
    try {
      await initPostgresTables(pool);
      const res = await pool.query(
        `INSERT INTO chata_store (key, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()
         RETURNING (EXTRACT(EPOCH FROM updated_at) * 1000)::bigint AS v`,
        ['main_state', JSON.stringify(memoryState)]
      );
      const v = Number(res.rows?.[0]?.v);
      if (Number.isFinite(v) && v > 0) stateVersion = v;
    } catch (err) {
      console.warn('[DB] PostgreSQL write error:', err);
    }
  }

  return memoryState;
}

/**
 * Push Subscriptions CRUD
 */
export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPostgresTables(pool);
      const res = await pool.query('SELECT id, profile_id as "profileId", subscription, created_at as "createdAt" FROM chata_push_subscriptions');
      return res.rows;
    } catch (err) {
      console.warn('[DB] PostgreSQL push subscriptions read error:', err);
    }
  }
  return memoryPushSubscriptions;
}

export async function savePushSubscription(profileId: string, subscription: any): Promise<void> {
  const endpoint = subscription.endpoint;
  const id = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const record: PushSubscriptionRecord = {
    id,
    profileId: profileId || 'all',
    subscription,
    createdAt: new Date().toISOString(),
  };

  // Memory update
  memoryPushSubscriptions = memoryPushSubscriptions.filter(s => s.subscription?.endpoint !== endpoint);
  memoryPushSubscriptions.push(record);

  const pool = getPgPool();
  if (pool) {
    try {
      await initPostgresTables(pool);
      await pool.query(
        `INSERT INTO chata_push_subscriptions (id, profile_id, endpoint, subscription, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (endpoint) DO UPDATE
         SET profile_id = EXCLUDED.profile_id, subscription = EXCLUDED.subscription, created_at = NOW()`,
        [id, profileId || 'all', endpoint, JSON.stringify(subscription)]
      );
    } catch (err) {
      console.warn('[DB] PostgreSQL push subscription write error:', err);
    }
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  memoryPushSubscriptions = memoryPushSubscriptions.filter(s => s.subscription?.endpoint !== endpoint);
  const pool = getPgPool();
  if (pool) {
    try {
      await initPostgresTables(pool);
      await pool.query('DELETE FROM chata_push_subscriptions WHERE endpoint = $1', [endpoint]);
    } catch (err) {
      console.warn('[DB] PostgreSQL push subscription remove error:', err);
    }
  }
}
