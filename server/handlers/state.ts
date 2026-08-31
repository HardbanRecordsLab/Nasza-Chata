import { getDbState, saveDbState, getStateVersion } from '../db';

export async function handleGetState() {
  const state = await getDbState();
  return { ...state, _v: getStateVersion() };
}

export async function handleSyncState(incoming: any) {
  if (incoming) {
    const baseVersion = typeof incoming._baseV === 'number' ? incoming._baseV : undefined;
    const { _baseV, _v, ...payload } = incoming;
    await saveDbState(payload, baseVersion);
  }
  return { status: 'success', message: 'Zsynchronizowano stan bazy.', _v: getStateVersion() };
}
