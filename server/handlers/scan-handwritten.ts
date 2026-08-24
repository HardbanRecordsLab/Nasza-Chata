import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
  }
  return aiClient;
}

export interface ScanHandwrittenRequest {
  imageBase64: string;
  mode?: 'receipt' | 'chores' | 'shopping';
  mimeType?: string;
}

export async function handleScanHandwritten(body: ScanHandwrittenRequest) {
  const { imageBase64, mode, mimeType = 'image/jpeg' } = body;

  if (!imageBase64) {
    throw new Error('Brak zdjęcia do analizy.');
  }

  const ai = getAI();
  if (!ai) {
    return {
      items: [
        { name: 'Oczyszczenie rynien z liści', category: 'garden', frequency: 'monthly', room: 'Ogród / Dach' },
        { name: 'Przetarcie żyrandoli w salonie', category: 'cleaning', frequency: 'monthly', room: 'Salon' },
      ],
      rawText: 'Tryb demonstracyjny bez aktywnego klucza Gemini. Dodano przykładowe zadania z listy.',
      aiPowered: false,
    };
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const promptText = mode === 'receipt'
    ? `Przeanalizuj to zdjęcie paragonu ze sklepu. Wyciągnij łączną kwotę (amount jako liczba), nazwę sklepu lub opis (note), datę jeśli widoczna (YYYY-MM-DD), oraz kategorię. Zwróć wyłącznie poprawny obiekt JSON: {"amount": number, "note": string, "category": string, "date": string}`
    : `Przeanalizuj to zdjęcie odręcznej kartki z listą zadań lub zakupów domowych. Wyodrębnij pozycje. Dla każdej pozycji określ: name (nazwa), category ('cleaning'|'wood'|'stove'|'garden'|'shopping'|'dishes'|'laundry'|'plants'), frequency ('daily'|'twice_weekly'|'weekly'|'monthly'), room (pomieszczenie).
Zwróć wyłącznie poprawny obiekt JSON: {"items": [{"name": string, "category": string, "frequency": string, "room": string}]}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: [
      {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      },
      {
        text: promptText,
      },
    ],
  });

  const rawResponseText = response.text || '{}';
  let parsedData: any = {};
  try {
    const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      parsedData = JSON.parse(rawResponseText);
    }
  } catch {
    parsedData = mode === 'receipt'
      ? { amount: 0, note: 'Nie rozpoznano paragonu', category: 'Spożywcze & Dom', date: new Date().toISOString().split('T')[0] }
      : { items: [{ name: 'Nowe zadanie z kartki', category: 'cleaning', frequency: 'weekly', room: 'Dom' }] };
  }

  return { ...parsedData, rawText: rawResponseText, aiPowered: true };
}

export async function handleScanChoresVision(body: {
  imageBase64: string;
  mimeType?: string;
  familyProfiles?: string[];
  houseContext?: string;
}) {
  const { imageBase64, mimeType = 'image/jpeg', familyProfiles, houseContext } = body;

  if (!imageBase64) {
    throw new Error('Brak zdjęcia do analizy wizyjnej.');
  }

  const ai = getAI();
  if (!ai) {
    return {
      aiPowered: false,
      noteTitle: 'Odręczna lista obowiązków w Chacie (Podgląd)',
      rawTranscription: `1. Uzupełnić drewno w kotłowni ze sztaua / drewutni (Kamil)
2. Wyczyścić ruszt i wybrać popiół z pieca CO
3. Skosić trawnik wokół altanki i tarasu
4. Przetrzeć blaty, płytki i zlew w kuchni (Ilona)
5. Odkurzyć salon i pokój na poddaszu (Olivia)
6. Podlać pomidory i papryki w szklarni`,
      summary: 'Wykryto 6 zadań domowych z podziałem na domowników, strefy i częstotliwości.',
      items: [
        { id: 'prop-1-' + Date.now(), name: 'Uzupełnić drewno w kotłowni z drewutni', category: 'wood', frequency: 'weekly', room: 'Kotłownia', suggestedAssignee: 'Kamil', estimatedMinutes: 20, weatherSensitive: false, confidence: 'high', selected: true },
        { id: 'prop-2-' + Date.now(), name: 'Wyczyścić ruszt i wybrać popiół z pieca CO', category: 'stove', frequency: 'daily', room: 'Kotłownia', suggestedAssignee: 'Kamil', estimatedMinutes: 15, weatherSensitive: false, confidence: 'high', selected: true },
        { id: 'prop-3-' + Date.now(), name: 'Skosić trawnik wokół altanki i tarasu', category: 'garden', frequency: 'weekly', room: 'Ogród', suggestedAssignee: 'Wszyscy', estimatedMinutes: 45, weatherSensitive: true, confidence: 'high', selected: true },
        { id: 'prop-4-' + Date.now(), name: 'Przetrzeć blaty i zlew w kuchni', category: 'cleaning', frequency: 'daily', room: 'Kuchnia', suggestedAssignee: 'Ilona', estimatedMinutes: 15, weatherSensitive: false, confidence: 'high', selected: true },
        { id: 'prop-5-' + Date.now(), name: 'Odkurzyć salon i pokój na poddaszu', category: 'cleaning', frequency: 'weekly', room: 'Salon', suggestedAssignee: 'Olivia', estimatedMinutes: 30, weatherSensitive: false, confidence: 'high', selected: true },
        { id: 'prop-6-' + Date.now(), name: 'Podlać pomidory i papryki w szklarni', category: 'plants', frequency: 'every_other_day', room: 'Ogród', suggestedAssignee: 'Ilona', estimatedMinutes: 15, weatherSensitive: false, confidence: 'high', selected: true },
      ],
    };
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const detectedMime = imageBase64.startsWith('data:image/png')
    ? 'image/png'
    : imageBase64.startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  const profilesList = Array.isArray(familyProfiles) && familyProfiles.length > 0
    ? familyProfiles.join(', ')
    : 'Kamil (mąż/tata: kotłownia, drewno, kosiarka, naprawy), Ilona (żona/mama: kuchnia, łazienka, rośliny, zakupy), Olivia (córka: sprzątanie pokoju, drobne prace domowe)';

  const promptText = `
Jesteś ekspertem widzenia komputerowego i asystentem domowym dla polskiej rodziny w domu jednorodzinnym z ogrodem i piecem na drewno ("Nasza Chata").
Twoim zadaniem jest dokładna analiza załączonego zdjęcia odręcznej kartki, listy zadań, notatki z lodówki, kalendarza lub zeszytu z obowiązkami domowymi.

DOMOWNICY: ${profilesList}
KONTEKST DOMU: Dom jednorodzinny, drewutnia z zapasem drewna, kotłownia z tradycyjnym piecem zasypowym, ogród, szklarnia/taras, salon, kuchnia, łazienka, poddasze.

INSTRUKCJA ANALIZY:
1. Odczytaj pismo odręczne z kartki w całości (nawet jeśli pismo jest niedbałe lub zawiera skróty).
2. Podziel odręczny tekst na pojedyncze konkretne zadania domowe.
3. Dla każdego zadania określ:
   - name: Zwięzła, czytelna nazwa zadania w języku polskim w formie bezokolicznika
   - category: Wybierz dokładnie jedno z: 'cleaning', 'wood', 'stove', 'garden', 'shopping', 'dishes', 'laundry', 'plants', 'maintenance', 'seasonal'
   - frequency: Dopasuj odpowiednią częstotliwość: 'daily', 'every_other_day', 'twice_weekly', 'weekly', 'monthly'
   - room: Przypisz do odpowiedniego pomieszczenia/strefy
   - suggestedAssignee: Imię osoby lub 'Wszyscy'
   - estimatedMinutes: Szacowany czas w minutach
   - weatherSensitive: true/false
   - notes: Dopiski i uwagi
   - confidence: 'high' | 'medium' | 'low'
4. Zwróć pełną transkrypcję (rawTranscription), tytuł (noteTitle) i podsumowanie (summary).
`;

  const { Type } = await import('@google/genai');
  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: [
      {
        inlineData: { mimeType: detectedMime, data: cleanBase64 },
      },
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
  try {
    parsedData = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) parsedData = JSON.parse(match[0]);
  }

  const itemsWithIds = (parsedData.items || []).map((it: any, idx: number) => ({
    id: `prop-${Date.now()}-${idx}`,
    name: it.name || 'Zadanie domowe',
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

  return {
    aiPowered: true,
    noteTitle: parsedData.noteTitle || 'Zeskanowana lista zadań',
    rawTranscription: parsedData.rawTranscription || rawText,
    summary: parsedData.summary || `Rozpoznano ${itemsWithIds.length} zadań z odręcznej kartki.`,
    items: itemsWithIds,
  };
}
