import { getDbState, saveDbState } from '../db';

export async function handleGetState() {
  return await getDbState();
}

export async function handleSyncState(incoming: any) {
  if (incoming) {
    await saveDbState(incoming);
  }
  return { status: 'success', message: 'Zsynchronizowano stan bazy.' };
}
