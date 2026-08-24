import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: Request | any, res: Response | any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageBase64, familyProfiles } = body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Brak zdjęcia do analizy wizyjnej.' });
    }

    const ai = getAI();
    if (!ai) {
      // High quality fallback demonstration
      return res.status(200).json({
        aiPowered: false,
        noteTitle: 'Odręczna lista obowiązków w Chacie (Wzorzec)',
        rawTranscription: `1. Uzupełnić drewno w kotłowni ze sztaua / drewutni (Kamil)
2. Wyczyścić ruszt i wybrać popiół z pieca CO
3. Skosić trawnik wokół altanki i tarasu
4. Przetrzeć blaty, płytki i zlew w kuchni (Ilona)
5. Odkurzyć salon i pokój na poddaszu (Olivia)
6. Podlać pomidory i papryki w szklarni`,
        summary: 'Wykryto 6 zadań domowych z podziałem na domowników, strefy i częstotliwości.',
        items: [
          {
            id: 'prop-1-' + Date.now(),
            name: 'Uzupełnić drewno w kotłowni z drewutni',
            category: 'wood',
            frequency: 'weekly',
            room: 'Kotłownia',
            suggestedAssignee: 'Kamil',
            estimatedMinutes: 20,
            weatherSensitive: false,
            notes: 'Przynieść do skrzyni przy piecu ok. 15-20 polan',
            confidence: 'high',
            selected: true,
          },
          {
            id: 'prop-2-' + Date.now(),
            name: 'Wyczyścić ruszt i wybrać popiół z pieca CO',
            category: 'stove',
            frequency: 'daily',
            room: 'Kotłownia',
            suggestedAssignee: 'Kamil',
            estimatedMinutes: 15,
            weatherSensitive: false,
            notes: 'Popiół przesypać do metalowego wiadra',
            confidence: 'high',
            selected: true,
          },
          {
            id: 'prop-3-' + Date.now(),
            name: 'Skosić trawnik wokół altanki i tarasu',
            category: 'garden',
            frequency: 'weekly',
            room: 'Ogród',
            suggestedAssignee: 'Wszyscy',
            estimatedMinutes: 45,
            weatherSensitive: true,
            notes: 'Sprawdzić stan oleju w kosiarce spalinowej',
            confidence: 'high',
            selected: true,
          },
          {
            id: 'prop-4-' + Date.now(),
            name: 'Przetrzeć blaty i zlew w kuchni',
            category: 'cleaning',
            frequency: 'daily',
            room: 'Kuchnia',
            suggestedAssignee: 'Ilona',
            estimatedMinutes: 15,
            weatherSensitive: false,
            notes: 'Użyć płynu do stali nierdzewnej',
            confidence: 'high',
            selected: true,
          },
          {
            id: 'prop-5-' + Date.now(),
            name: 'Odkurzyć salon i pokój na poddaszu',
            category: 'cleaning',
            frequency: 'weekly',
            room: 'Salon',
            suggestedAssignee: 'Olivia',
            estimatedMinutes: 30,
            weatherSensitive: false,
            notes: 'Opróżnić pojemnik odkurzacza po sprzątaniu',
            confidence: 'high',
            selected: true,
          },
          {
            id: 'prop-6-' + Date.now(),
            name: 'Podlać pomidory i papryki w szklarni',
            category: 'plants',
            frequency: 'every_other_day',
            room: 'Ogród',
            suggestedAssignee: 'Ilona',
            estimatedMinutes: 15,
            weatherSensitive: false,
            notes: 'Podlewać wcześnie rano lub wieczorem',
            confidence: 'high',
            selected: true,
          },
        ],
      });
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
1. Odczytaj pismo odręczne z kartki w całości.
2. Podziel odręczny tekst na pojedyncze konkretne zadania domowe.
3. Dla każdego zadania określ:
   - name: Zwięzła nazwa zadania w języku polskim w formie bezokolicznika
   - category: 'cleaning' | 'wood' | 'stove' | 'garden' | 'shopping' | 'dishes' | 'laundry' | 'plants' | 'maintenance' | 'seasonal'
   - frequency: 'daily' | 'every_other_day' | 'twice_weekly' | 'weekly' | 'monthly'
   - room: 'Kotłownia' | 'Drewutnia' | 'Salon' | 'Ogród' | 'Kuchnia' | 'Łazienka' | 'Garaż' | 'Taras' | 'Poddasze' | 'Korytarz' | 'Dom'
   - suggestedAssignee: 'Kamil' | 'Ilona' | 'Olivia' | 'Wszyscy'
   - estimatedMinutes: Liczba minut (np. 15, 30, 45)
   - weatherSensitive: boolean
   - notes: Odręczne dopiski, uwagi
   - confidence: 'high' | 'medium' | 'low'
4. Zwróć obiekt JSON zgodny ze schematem.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          inlineData: {
            mimeType: detectedMime,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            noteTitle: {
              type: Type.STRING,
              description: 'Tytuł notatki',
            },
            rawTranscription: {
              type: Type.STRING,
              description: 'Dokładna transkrypcja tekstu',
            },
            summary: {
              type: Type.STRING,
              description: 'Podsumowanie zadań',
            },
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

    return res.status(200).json({
      aiPowered: true,
      noteTitle: parsedData.noteTitle || 'Zeskanowana lista zadań',
      rawTranscription: parsedData.rawTranscription || rawText,
      summary: parsedData.summary || `Rozpoznano ${itemsWithIds.length} zadań z odręcznej kartki.`,
      items: itemsWithIds,
    });
  } catch (err: any) {
    console.error('Vision OCR error:', err);
    return res.status(500).json({
      error: 'Błąd przetwarzania zdjęcia przez model wizyjny Gemini.',
      details: err.message,
    });
  }
}
