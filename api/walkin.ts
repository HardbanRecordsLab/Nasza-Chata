import type { Request, Response } from 'express';
import { getDbState, saveDbState } from '../server/db';

/**
 * CPU-only Virtual Walk-In — photo-based, no GPU.
 * Actions:
 *  - create-viewpoints: build viewpoint graph (linear + angle-grouped) for a zone
 *  - auto-hotspots: create walk-point hotspots linking viewpoints via CPU matching (hash/angle)
 *  - panorama-attempt: try to stitch if 3+ overlapping angles (stub → graph, not image, to stay CPU light)
 */

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    switch (action) {
      case 'create-viewpoints':
        return await handleCreateViewpoints(body, res);
      case 'auto-hotspots':
        return await handleAutoHotspots(body, res);
      case 'update-space':
        return await handleUpdateSpace(body, res);
      case 'rollback-version':
        return await handleRollbackVersion(body, res);
      case 'panorama-attempt':
        return await handlePanoramaAttempt(body, res);
      default:
        return res.status(400).json({ error: 'Unknown action. Use ?action=create-viewpoints|auto-hotspots|update-space|rollback-version|panorama-attempt' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Walk-in error', details: err.message });
  }
}

async function handleCreateViewpoints(body: any, res: Response) {
  const { zoneId } = body;
  if (!zoneId) return res.status(400).json({ error: 'zoneId required' });

  const db: any = await getDbState();
  const zones: any[] = db.visualZones || [];
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const entries = [...(zone.entries || [])].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  if (entries.length < 2) {
    return res.status(200).json({ message: 'Za mało wpisów do zbudowania grafu (min 2)', links: [], entries: entries.length });
  }

  // Deduplication via simple URL hash (CPU light) — real pHash would need sharp, stubbed for now
  const seen = new Set<string>();
  const deduped = entries.filter(e => {
    const key = (e.mediaUrl || '').slice(-64);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Build viewpoint graph:
  // Strategy: linear chronology + same angleLabel grouping
  // Each entry is a viewpoint. Links: linear chain + angle jumps
  const links: any[] = [];
  const now = new Date().toISOString();

  // Linear chain
  for (let i = 0; i < deduped.length - 1; i++) {
    links.push({
      id: `link-${deduped[i].id}-${deduped[i + 1].id}`,
      sourceEntryId: deduped[i].id,
      targetEntryId: deduped[i + 1].id,
      confidence: 0.9 - i * 0.02,
      auto: true,
      createdAt: now,
    });
  }

  // Angle-grouped shortcuts (e.g. "Od drzwi" → "Od okna")
  const byAngle: Record<string, any[]> = {};
  deduped.forEach(e => {
    const a = e.angleLabel || 'Ogólny';
    if (!byAngle[a]) byAngle[a] = [];
    byAngle[a].push(e);
  });
  Object.values(byAngle).forEach(group => {
    if (group.length < 2) return;
    // link first of angle to first of next angle chronologically
  });

  // Cross-angle links (first of each angle in time order)
  const firstPerAngle = Object.values(byAngle).map(g => g[0]).sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  for (let i = 0; i < firstPerAngle.length - 1; i++) {
    const a = firstPerAngle[i].id;
    const b = firstPerAngle[i + 1].id;
    if (!links.find(l => l.sourceEntryId === a && l.targetEntryId === b)) {
      links.push({ id: `link-angle-${a}-${b}`, sourceEntryId: a, targetEntryId: b, confidence: 0.7, auto: true, createdAt: now });
    }
  }

  // versioning: save previous as snapshot
  if (!zone.versions) zone.versions = [];
  if (zone.viewpointLinks && zone.viewpointLinks.length > 0) {
    const prevHotspots = (zone.entries || []).reduce((s: number, e: any) => s + (e.tags?.filter((t: any) => t.targetEntryId)?.length || 0), 0);
    zone.versions.push({
      version: zone.walkinVersion || 1,
      createdAt: zone.walkinUpdatedAt || now,
      createdById: 'system',
      linksCount: zone.viewpointLinks.length,
      entriesCount: (zone.entries || []).length,
      hotspotsCount: prevHotspots,
      linksSnapshot: [...zone.viewpointLinks],
      note: `V${zone.walkinVersion || 1}: ${zone.viewpointLinks.length} links`,
    });
    if (zone.versions.length > 10) zone.versions = zone.versions.slice(-10);
  }

  zone.viewpointLinks = links;
  zone.walkinVersion = (zone.walkinVersion || 0) + 1;
  zone.walkinUpdatedAt = now;
  zone.versions.push({
    version: zone.walkinVersion,
    createdAt: now,
    createdById: 'system',
    linksCount: links.length,
    entriesCount: deduped.length,
    hotspotsCount: 0,
    linksSnapshot: [...links],
    note: `V${zone.walkinVersion}: utworzono graf`,
  });
  if (zone.versions.length > 10) zone.versions = zone.versions.slice(-10);

  await saveDbState({ visualZones: zones });

  return res.status(200).json({
    message: `Utworzono ${links.length} połączeń dla ${deduped.length} punktów`,
    links,
    viewpoints: deduped.length,
    version: zone.walkinVersion,
    // CPU analysis stub
    analysis: {
      method: 'CPU linear + angle grouping (no GPU)',
      dedupedFrom: entries.length,
      dedupedTo: deduped.length,
      duplicatesRemoved: entries.length - deduped.length,
    },
  });
}

async function handleAutoHotspots(body: any, res: Response) {
  const { zoneId } = body;
  if (!zoneId) return res.status(400).json({ error: 'zoneId required' });

  const db: any = await getDbState();
  const zones: any[] = db.visualZones || [];
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const entries: any[] = [...(zone.entries || [])].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const links: any[] = zone.viewpointLinks || [];

  if (links.length === 0) {
    return res.status(400).json({ error: 'Najpierw zbuduj graf (create-viewpoints)' });
  }

  // For each link, ensure source entry has a hotspot pointing to target
  let created = 0;
  const now = new Date().toISOString();

  // Precompute target positions: spread walk points (avoid overlap)
  const positions = [
    { x: 78, y: 50 }, { x: 22, y: 50 }, { x: 50, y: 22 }, { x: 50, y: 78 },
    { x: 75, y: 30 }, { x: 25, y: 70 }, { x: 70, y: 75 }, { x: 30, y: 25 },
  ];

  for (let idx = 0; idx < links.length; idx++) {
    const link = links[idx];
    const source = entries.find(e => e.id === link.sourceEntryId);
    const target = entries.find(e => e.id === link.targetEntryId);
    if (!source || !target) continue;

    if (!source.tags) source.tags = [];

    const exists = source.tags.find((t: any) => t.targetEntryId === target.id);
    if (exists) continue;

    const pos = positions[idx % positions.length];
    // CPU matching stub: confidence based on time proximity + same angle bonus
    const sameAngle = (source.angleLabel || '') === (target.angleLabel || '');
    const confidence = sameAngle ? 0.85 : 0.65;

    source.tags.push({
      id: `hotspot-auto-${Date.now()}-${idx}`,
      x: pos.x + (Math.random() * 6 - 3),
      y: pos.y + (Math.random() * 6 - 3),
      label: `→ ${target.angleLabel || target.caption || 'Kolejny widok'}`,
      targetEntryId: target.id,
      confidence,
      auto: true,
      createdAt: now,
    });
    created++;
  }

  zone.walkinUpdatedAt = now;
  await saveDbState({ visualZones: zones });

  return res.status(200).json({ message: `Utworzono ${created} hotspotów walk-in`, created, totalTags: entries.reduce((s, e) => s + (e.tags?.length || 0), 0) });
}

async function handleUpdateSpace(body: any, res: Response) {
  const { zoneId, newMedia } = body;
  // Stub for versioned update — compare newMedia hash via CPU, detect changes, bump version
  if (!zoneId) return res.status(400).json({ error: 'zoneId required' });
  const db: any = await getDbState();
  const zone = (db.visualZones || []).find((z: any) => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  // Simple change detection: count new vs old
  const changes = newMedia ? 1 : 0;
  zone.walkinVersion = (zone.walkinVersion || 0) + (changes ? 1 : 0);
  zone.walkinUpdatedAt = new Date().toISOString();
  await saveDbState({ visualZones: db.visualZones });

  return res.status(200).json({
    message: changes ? 'Wykryto zmiany — utworzono nową wersję' : 'Brak zmian',
    version: zone.walkinVersion,
    detected: changes ? ['Nowy widok'] : [],
  });
}

async function handleRollbackVersion(body: any, res: Response) {
  const { zoneId, version } = body;
  if (!zoneId || version === undefined) return res.status(400).json({ error: 'zoneId and version required' });
  const db: any = await getDbState();
  const zones: any[] = db.visualZones || [];
  const zone = zones.find(z => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  const target = (zone.versions || []).find((v: any) => v.version === Number(version));
  if (!target || !target.linksSnapshot) return res.status(404).json({ error: 'Version not found or no snapshot' });

  // save current as new version before rollback
  if (!zone.versions) zone.versions = [];
  zone.versions.push({
    version: (zone.walkinVersion || 0) + 1,
    createdAt: new Date().toISOString(),
    createdById: 'system',
    linksCount: target.linksSnapshot.length,
    entriesCount: target.entriesCount,
    hotspotsCount: target.hotspotsCount,
    linksSnapshot: [...target.linksSnapshot],
    note: `Rollback → V${version}`,
  });
  zone.viewpointLinks = [...target.linksSnapshot];
  zone.walkinVersion = zone.versions[zone.versions.length - 1].version;
  zone.walkinUpdatedAt = new Date().toISOString();
  await saveDbState({ visualZones: zones });
  return res.status(200).json({ message: `Przywrócono V${version}`, version: zone.walkinVersion, links: zone.viewpointLinks });
}

async function handlePanoramaAttempt(body: any, res: Response) {
  const { zoneId } = body;
  if (!zoneId) return res.status(400).json({ error: 'zoneId required' });
  // Panorama stitch is done client-side via canvas (CPU) — server just validates
  // If client sent stitched image, it would be saved via /api/upload, so here we just bump version
  const db: any = await getDbState();
  const zone = (db.visualZones || []).find((z: any) => z.id === zoneId);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  return res.status(200).json({ message: 'Panorama CPU — wykonaj stitch po stronie klienta (canvas) i zapisz jako nowy wpis Panorama 360°', hint: 'Użyj stitchPanorama() z 2-3 zdjęć' });
}
