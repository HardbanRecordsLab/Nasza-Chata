import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { getDbState } from '../server/db';
import { handleScanHandwritten } from '../server/handlers/scan-handwritten';

const GEMINI_MODEL = 'gemini-2.0-flash';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiClient;
}

export default async function handler(req: Request | any, res: Response | any) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.headers['x-action'];

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    switch (action) {
      case 'chat':
        return await handleChat(body, res);
      case 'scan-handwritten':
      case 'scan-receipt':
        return res.status(200).json(await handleScanHandwritten({ ...body, mode: 'receipt' }));
      case 'scan-chores-vision':
        return await handleScanChoresVision(body, res);
      default:
        return res.status(400).json({ error: 'Unknown action. Use ?action=chat|scan-receipt|scan-chores-vision' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'AI error', details: err.message });
  }
}

async function handleChat(body: any, res: Response) {
  const { message } = body;
  if (!message) return res.status(400).json({ error: 'Brak wiadomości' });

  const db = await getDbState();
  const ai = getAI();

  if (!ai) {
    return res.status(200).json({
      reply: `Cześć! Jestem asystentem „Naszej Chaty". (Aby włączyć pełne odpowiedzi AI, skonfiguruj GEMINI_API_KEY). Aktualnie: ${db.tasks?.length ?? 0} zadań, ${db.woodInventory?.estimatedM3 ?? 0} m³ drewna.`,
    });
  }

  const contextPrompt = `
Jesteś przyjaznym asystentem domowym dla rodziny (Kamil, Ilona, Olivia).
Dom jednorodzinny z ogrodem i piecem na drewno.
Odpowiadaj ciepło, konkretnie, po polsku.

STAN DOMU:
- Drewno: ${db.woodInventory?.estimatedM3 ?? 0} m³ / ${db.woodInventory?.totalCapacityM3 ?? 15} m³
- Polana w kotłowni: ${db.woodInventory?.logsInBoilerRoom ?? 0} szt.
- Zadania: ${db.tasks?.length ?? 0}
- Wydatki: ${db.expenses?.length ?? 0}
- Zakupy do zrobienia: ${(db.shoppingItems || []).filter((s: any) => !s.isBought).map((s: any) => s.name).join(', ') || 'brak'}

Wiadomość: ${message}`;

  const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: contextPrompt });
  return res.status(200).json({ reply: response.text || 'Wszystko w porządku!' });
}

async function handleScanChoresVision(body: any, res: Response) {
  const { imageBase64, familyProfiles } = body;
  if (!imageBase64) return res.status(400).json({ error: 'Brak zdjęcia.' });

  const ai = getAI();
  if (!ai) {
    return res.status(200).json({
      aiPowered: false,
      noteTitle: 'Lista obowiązków (Podgląd)',
      rawTranscription: '1. Uzupełnić drewno\n2. Wyczyścić ruszt\n3. Skosić trawnik',
      summary: 'Demo — skonfiguruj GEMINI_API_KEY.',
      items: [],
    });
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const detectedMime = imageBase64.startsWith('data:image/png') ? 'image/png'
    : imageBase64.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';

  const profilesList = Array.isArray(familyProfiles) && familyProfiles.length > 0
    ? familyProfiles.join(', ')
    : 'Kamil (drewno, naprawy), Ilona (kuchnia, rośliny), Olivia (sprzątanie)';

  const promptText = `
Analizujesz zdjęcie odręcznej listy obowiązków domowych.
DOMOWNICY: ${profilesList}
Dla każdego zadania: name, category, frequency, room, suggestedAssignee, estimatedMinutes, weatherSensitive, notes, confidence.
Zwróć JSON zgodny ze schematem.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType: detectedMime, data: cleanBase64 } },
      { text: promptText },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          noteTitle: { type: Type.STRING },
          rawTranscription: { type: Type.STRING },
          summary: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                frequency: { type: Type.STRING },
                room: { type: Type.STRING },
                suggestedAssignee: { type: Type.STRING },
                estimatedMinutes: { type: Type.INTEGER },
                weatherSensitive: { type: Type.BOOLEAN },
                notes: { type: Type.STRING },
                confidence: { type: Type.STRING },
              },
              required: ['name', 'category', 'frequency', 'room'],
            },
          },
        },
        required: ['items'],
      },
    },
  });

  const rawText = response.text || '{}';
  let parsedData: any = {};
  try { parsedData = JSON.parse(rawText); } catch { const m = rawText.match(/\{[\s\S]*\}/); if (m) parsedData = JSON.parse(m[0]); }

  const items = (parsedData.items || []).map((it: any, idx: number) => ({
    id: `prop-${Date.now()}-${idx}`,
    name: it.name || 'Zadanie',
    category: it.category || 'cleaning',
    frequency: it.frequency || 'weekly',
    room: it.room || 'Dom',
    suggestedAssignee: it.suggestedAssignee || 'Wszyscy',
    estimatedMinutes: it.estimatedMinutes || 30,
    weatherSensitive: !!it.weatherSensitive,
    notes: it.notes || '',
    confidence: it.confidence || 'high',
    selected: true,
  }));

  return res.status(200).json({
    aiPowered: true,
    noteTitle: parsedData.noteTitle || 'Zeskanowana lista',
    rawTranscription: parsedData.rawTranscription || rawText,
    summary: parsedData.summary || `Rozpoznano ${items.length} zadań.`,
    items,
  });
}
