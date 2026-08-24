import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getDbState } from '../../server/db';

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
    const { message } = body;
    if (!message) {
      return res.status(400).json({ error: 'Brak wiadomości' });
    }

    const db = await getDbState();
    const ai = getAI();

    if (!ai) {
      return res.status(200).json({
        reply: `Cześć! Jestem asystentem „Naszej Chaty”. (Aby włączyć pełne odpowiedzi AI, skonfiguruj klucz GEMINI_API_KEY). Aktualnie w domu: mamy ${db.tasks.length} zadań w rejestrze, a w drewutni szacunkowo ${db.woodInventory?.estimatedM3 || 8.5} m³ drewna.`,
      });
    }

    const contextPrompt = `
Jesteś przyjaznym, zaradnym asystentem domowym dla rodziny (Kamil - mąż, Ilona - żona, Olivia - córka).
Mieszkają w domu jednorodzinnym z ogrodem i piecem zasypowym na drewno.
Twoim celem jest pomagać im w organizacji domu, pielęgnacji ogrodu, paleniu w piecu, zakupach i podpowiadać w sprawach domowych obowiązków.
Odpowiadaj ciepło, konkretnie, po polsku, w zwięzłej i pomocnej formie.

STAN DOMU W TEJ CHWILI:
- Zapas drewna w drewutni: ${db.woodInventory?.estimatedM3 || 8.5} m³ (pojemność: ${db.woodInventory?.totalCapacityM3 || 14} m³), polana w kotłowni: ${db.woodInventory?.logsInBoilerRoom || 18} szt.
- Liczba zdefiniowanych zadań: ${db.tasks.length}
- Liczba odnotowanych wydatków: ${db.expenses.length}
- Ostatnie zakupy: ${db.expenses.slice(0, 3).map((e: any) => `${e.date}: ${e.note} (${e.amount} PLN przez ${e.boughtByName})`).join('; ')}
- Lista do kupienia: ${db.shoppingItems.filter((s: any) => !s.isBought).map((s: any) => s.name).join(', ') || 'Pusta'}
- Sprzęt domowy: ${db.equipment.map((eq: any) => `${eq.name} (następny serwis: ${eq.nextServiceDate})`).join('; ')}

Wiadomość od użytkownika: ${message}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: contextPrompt,
    });

    return res.status(200).json({ reply: response.text || 'Wszystko w porządku w Naszej Chacie!' });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return res.status(500).json({
      error: 'Błąd generowania odpowiedzi AI.',
      details: err.message,
      reply: 'Przepraszam, wystąpił chwilowy problem z połączeniem asystenta domowego.',
    });
  }
}
