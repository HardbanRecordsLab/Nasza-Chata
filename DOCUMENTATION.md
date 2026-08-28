# Nasza Chata — Dokumentacja techniczna

> Dokumentacja wygenerowana na podstawie bezpośredniego odczytu kodu źródłowego w tym repozytorium. Wszystkie PIN-y, nazwy endpointów, modele AI i zmienne środowiskowe pochodzą z plików źródłowych (`src/constants/initialData.ts`, `api/*.ts`, `.env.example`), nie z ogólnej wiedzy.

---

## Spis treści
1. [Stack technologiczny](#stack-technologiczny)
2. [Profile i PIN-y](#profile-i-piny)
3. [Architektura plików](#architektura-plików)
4. [Baza danych](#baza-danych)
5. [Backend API (11 endpointów)](#backend-api)
6. [Zakładki główne](#zakładki-główne)
7. [Funkcje AI](#funkcje-ai)
8. [Walk-In i panorama (CPU)](#walk-in-i-panorama)
9. [Powiadomienia i crony](#powiadomienia-i-crony)
10. [Decyzje produktowe (audyt)](#decyzje-produktowe)
11. [Wdrożenie](#wdrożenie)

---

## Stack technologiczny

| Warstwa | Technologia | Plik |
|---------|-----------|------|
| Frontend | React 19 + TypeScript 5.8 | `src/App.tsx`, `package.json` |
| Build | Vite 6.2 (build), `tsc` (lint) | `package.json:8`, `vite.config.ts` |
| UI | Tailwind CSS 4.1 + lucide-react | `package.json` |
| Backend | Vercel Serverless Functions (Node, Express-like) | `api/*.ts`, `vercel.json` |
| Baza | PostgreSQL (`pg`) / Neon, fallback pamięć procesu | `server/db.ts` |
| Storage | Vercel Blob (`@vercel/blob`) | `api/upload.ts` |
| AI | Google Gemini (`@google/genai`), model `gemini-2.0-flash` | `api/ai.ts:6`, `server/handlers/scan-handwritten.ts:3` |
| Push | Web Push (`web-push`), VAPID | `server/pushService.ts` |
| Service Worker | PWA + Web Push client | `public/sw.js` |

**Ograniczenie Vercel Hobby:** max 12 serverless functions. Aktualnie używane: **11** (`api/health.ts`, `api/state.ts`, `api/ai.ts`, `api/export.ts`, `api/notifications.ts`, `api/walkin.ts`, `api/weather.ts`, `api/upload.ts`, `api/widget/today.ts`, `api/cron/daily-briefing.ts`, `api/cron/wood-supply-check.ts`).

---

## Profile i PIN-y

Źródło: `src/constants/initialData.ts:3-37`

| ID | Imię | Rola | PIN | Admin |
|----|------|------|-----|-------|
| `kamil` | Kamil | Gospodarz (Admin) | `1482` | Tak |
| `ilona` | Ilona | Żona / Organizatorka | `2591` | Nie |
| `olivia` | Olivia | Córka / Pomocniczka | `3670` | Nie |

- Przełączanie profilu przez awatar w nagłówku (`Header.tsx`) → `PinModal.tsx` weryfikuje PIN.
- Panel **Plan** (Admin) widoczny tylko dla `currentProfile.isAdmin || currentProfile.id === 'kamil'` (`App.tsx:148`).
- `INITIAL_PROFILES` jest używane jako fallback, gdy `localStorage` nie ma zapisanych profili (`ChataContext.tsx:170-181`).

---

## Architektura plików

```
src/
  App.tsx                      # Root: 5 zakładek + globalne modale
  context/ChataContext.tsx     # Centralny stan (useState), persist localStorage (debounce 1.5s), sync /api/state
  types.ts                     # Wszystkie interfejsy
  constants/initialData.ts     # 96 zadań, 3 profile, 0 wydatków, puste listy początkowe
  utils/
    recurrenceEngine.ts        # getOccurrencesForDate, calculateCleanlinessScore
    imageHash.ts               # pHash + Hamming + Laplacian (CPU, bez GPU)
    panoramaStitcher.ts        # stitchPanorama (canvas, 20% overlap)
    videoFrameExtractor.ts     # extractKeyFrames (canvas, bez GPU)
    notificationService.ts     # Web Push (VAPID) client, initServiceWorker
  components/
    views/                     # TodayView, CalendarView, ShoppingView, HouseOverviewView, AdminPlanView
    modals/                    # 15 modalów (Pin, Sos, AddTask, AiAssistant, Scan*, VisualZone, itd.)
    Header.tsx, BottomNav.tsx, ToastContainer.tsx

api/
  health.ts, state.ts, ai.ts, export.ts, notifications.ts, walkin.ts, weather.ts, upload.ts
  widget/today.ts              # Endpoint dla widżetu PWA
  cron/daily-briefing.ts       # Cron 6:00 UTC
  cron/wood-supply-check.ts    # Cron pon 6:00 UTC

server/
  db.ts                        # PostgreSQL pool + in-memory fallback
  handlers/
    state.ts                   # handleGetState / handleSyncState
    notifications.ts           # handleGetVapidKey, handleSubscribe, handleSendPush, handleTestPush
    scan-handwritten.ts        # handleScanHandwritten (receipt), handleScanChoresVision (chores)
  pushService.ts               # Web Push send
```

---

## Baza danych

Źródło: `server/db.ts`

- **Główna:** PostgreSQL przez `pg.Pool` (`server/db.ts:67`).
- **Parametr połączenia:** `DATABASE_URL` lub `POSTGRES_URL` lub `POSTGRES_PRISMA_URL` (`server/db.ts:63-65`).
- **Tabela:** `chata_store` (klucz `main_state`, kolumna `data JSONB`) + `chata_push_subscriptions` (`server/db.ts:89-103`).
- **Fallback (brak `DATABASE_URL`):** stan w pamięci procesu (każdy cold start = pusty stan, chyba że `localStorage` na kliencie ma dane). `api/health.ts:11` zwraca `database: 'local-storage/memory'` w tym przypadku.
- **Lokalny fallback:** `data/chata_db.json` (tylko dev, read-only w serverless).

**Ważne:** Stan aplikacji jest zawsze synchronizowany z `localStorage` (debounce 1.5s w `ChataContext.tsx:375-397`) — więc nawet bez bazy danych aplikacja działa na telefonie po pierwszym załadowaniu.

---

## Backend API

### GET/POST `/api/state`
- `GET` → `handleGetState()` → zwraca cały `DatabaseSchema` (lub `{}` przy błędzie).
- `POST` → `handleSyncState(body)` → zapisuje stan. Defensywnie: każde pole to `Array.isArray() ? incoming : memoryState` (`server/db.ts:168-188`).
- Plik: `api/state.ts` + `server/handlers/state.ts`.

### POST `/api/ai?action=...`
- `chat` → asystent Gemini (fallback demo bez klucza).
- `scan-receipt` → OCR paragonu (`handleScanHandwritten` z `mode: 'receipt'`). Zwraca `{ amount, note, category, date, items[] }`.
- `scan-chores-vision` → OCR odręcznej listy zadań (`handleScanChoresVision`). Zwraca `{ items: ScannedTaskProposal[], summary, rawTranscription }`.
- Plik: `api/ai.ts`, `server/handlers/scan-handwritten.ts`.
- **Model:** `gemini-2.0-flash` (`api/ai.ts:6`).

### GET `/api/export?action=...`
- `calendar.ics` → eksport zadań do iCal (`api/export.ts:24-49`).
- `backup.json` → pełny backup stanu jako JSON do pobrania (`api/export.ts:51-56`).
- `yearly-chronicle` → kronika strefa × miesiąc (JSON lub HTML, `api/export.ts:58-84`).

### GET/POST `/api/notifications?action=...`
- `vapid-public-key` → klucz publiczny VAPID.
- `subscribe` (POST) → zapis subskrypcji push.
- `send-push` (POST) → wyślij push.
- `test` (POST) → test push.
- Plik: `api/notifications.ts` + `server/handlers/notifications.ts`.

### POST `/api/walkin?action=...`
- `create-viewpoints` → buduje graf viewpointów (liniowy + grupowanie kątów) (`api/walkin.ts:39-149`).
- `auto-hotspots` → hotspoty nawigacyjne (`api/walkin.ts:151-210`).
- `update-space` → nowa wersja po zmianie (`api/walkin.ts:212-231`).
- `rollback-version` → przywracanie Vn (`api/walkin.ts:233-260`).
- `panorama-attempt` → informacja, że stitch po stronie klienta (`api/walkin.ts:262-271`).

### GET `/api/weather`
- **Zawsze zwraca hardcoded symulację** (temp 21, 80% deszczu jutro, recommendation) (`api/weather.ts:4-17`). Brak integracji z zewnętrznym API.

### POST `/api/upload`
- `file` (base64) → zapis do Vercel Blob pod `folder/filename`. Fallback: zwraca `dataUrl` jako-is gdy brak `BLOB_READ_WRITE_TOKEN` (`api/upload.ts:27-30`).

### GET `/api/widget/today`
- JSON ze statusem dnia dla widżetu PWA (`api/widget/today.ts`).

### GET `/api/health`
- `{ status, time, aiReady, database }` (`api/health.ts`).

### Crony (GET, wymagają `Authorization: Bearer ${CRON_SECRET}`)
- `/api/cron/daily-briefing` → push z podsumowaniem dnia (6:00 UTC).
- `/api/cron/wood-supply-check` → alert o niskim drewnie (pon 6:00 UTC).

---

## Zakładki główne

### 1. Dzisiaj (`TodayView`)
- Pogoda (symulowana, `api/weather.ts`).
- Mini-kalendarz (siatka miesiąca, kropki = postęp czystości dnia, `TodayView.tsx` + `recurrenceEngine.ts`).
- Zadania na dziś (sortowane wg `suggestedPriority` z `calculateCleanlinessScore`).
- Skrót do Tablicy (BoardWidget), Tryb nieobecność (✈️), AI Asystent.

### 2. Kalendarz (`CalendarView`)
- Miesiąc z kropkami postępu.
- Klik dzień → lista zadań + wydarzeń (`getOccurrencesForDate`).
- Wydarzenia rodzinne (urodziny, wizyty) — `FamilyEvent[]` w `types.ts:350`.

### 3. Zakupy (`ShoppingView`)
- Lista zakupów + koszyk + finishShoppingWithCart → wydatek.
- **Spiżarnia** (`PantryItem[]`) — zakładka w widoku.
- **Limity budżetowe** (`BudgetLimit`) — zakładka w widoku.
- **Skaner kodów** (`BarcodeScannerModal.tsx`) — nakieruj kamerę na kod kreskowy.
- **Skan paragonu** (`ScanReceiptModal.tsx`) → `/api/ai?action=scan-receipt`.

### 4. Dom (`HouseOverviewView`)
- Dynamiczne strefy wizualne (`VisualZone[]`) — tworzone przez użytkownika, brak sztywnej listy.
- Stan drewutni (WoodInventory) — `woodInventory.woodTypes` z fallbackiem `[]` (`HouseOverviewView.tsx:301`).
- Rejestr sprzętu (EquipmentItem) + historia serwisów (`EquipmentServiceEntry[]`).
- SOS alerty.

### 5. Plan (Admin, `AdminPlanView`)
- **Przydziały** — taskId → profileId (nadpisanie).
- **Plan tygodniowy** — `WeeklyPlan.assignments` per tydzień (nie siatka osoby × dni).
- **Wizualizacja** — mini-mapa z hotspotami.
- **Historia wersji** — `SpaceVersion[]`, przywracanie Vn (`AdminPlanView.tsx:714-730`).

---

## Funkcje AI

### Asystent (`AiAssistantModal.tsx` → `/api/ai?action=chat`)
- Kontekst: liczba zadań, drewno, zakupy.
- Bez `GEMINI_API_KEY`: odpowiedź demo (`api/ai.ts:50-54`).

### Skaner paragonów (`ScanReceiptModal.tsx` → `/api/ai?action=scan-receipt`)
- Zdjęcie → base64 → `handleScanHandwritten(imageBase64, mode: 'receipt')`.
- Zwraca `amount`, `note`, `category`, `date`, `items[]` — `items` trafiają do spiżarni.
- Bez klucza: demo z 2 przykładowymi pozycjami (`scan-handwritten.ts:33-41`).

### Skaner odręcznej listy (`ScanHandwrittenModal.tsx`, `AddTaskModal.tsx` → `/api/ai?action=scan-chores-vision`)
- Zdjęcie lodówki/kartki → `handleScanChoresVision(imageBase64, familyProfiles)`.
- Zwraca `items: ScannedTaskProposal[]` — propozycje zadań do dodania.

### Tryb demo
Każdy endpoint AI sprawdza `process.env.GEMINI_API_KEY`. Gdy brak → `aiPowered: false` i przykładowe dane. Front to obsługuje (wyświetla "Tryb demo" zamiast rzeczywistego OCR).

---

## Walk-In i panorama

Źródło: `api/walkin.ts`, `src/utils/panoramaStitcher.ts`, `src/utils/imageHash.ts`, `src/utils/videoFrameExtractor.ts`

**CPU-only (brak GPU):**
- `hashImageData` / `hammingDistance` — pHash + Hamming (dedup zdjęć, `imageHash.ts`).
- `laplacianVariance` — ostrość klatki.
- `extractKeyFrames` — klatki kluczowe z wideo (canvas, `videoFrameExtractor.ts`).
- `stitchPanorama` — sklejanie 2-5 zdjęć z 20% overlap (canvas, `panoramaStitcher.ts:6-30`).

**Przepływ:**
1. Użytkownik dodaje wpisy do strefy (`VisualEntry[]`).
2. `POST /api/walkin?action=create-viewpoints` → graf `ViewpointLink[]` (liniowy + kąty).
3. `POST /api/walkin?action=auto-hotspots` → pinezki nawigacyjne (`RoomTag.targetEntryId`).
4. Wersjonowanie: `zone.walkinVersion` (V1, V2...) + `zone.versions[]` (snapshot linków).
5. Przywracanie: `POST /api/walkin?action=rollback-version`.

**Panorama 360°:** po stronie klienta (`stitchPanorama`), upload przez `/api/upload`, zapis jako `VisualEntry.mediaType: 'photo'` z `angleLabel: 'Panorama 360°'`.

---

## Powiadomienia i crony

- **Web Push:** `server/pushService.ts` (VAPID), `notificationService.ts` (client).
- **Crony:** `vercel.json` (daily-briefing 6:00 UTC, wood-supply-check pon 6:00 UTC).
- **Bezpieczeństwo:** crony wymagają `Authorization: Bearer ${CRON_SECRET}` (`api/cron/*.ts:8`). Brak → 401.
- **Ciche godziny:** per profil (`NotificationSetting.quietHoursStart/End`, `types.ts:258-259`), sprawdzane w cronach (`daily-briefing.ts:54-60`).
- **Uwaga (do poprawy):** `currentHour` w cronach liczony jest z `Date.getHours()` Vercela (UTC), nie z `Europe/Warsaw`. Dla polskiego użytkownika ciche godziny mogą być przesunięte o 1-2h zimą/latem.

---

## Decyzje produktowe

Zapisane w `TODO-finalizacja.md` po audycie:

1. **Strefy wizualne — dynamiczne** (brak sztywnej listy 7 pomieszczeń). Użytkownik tworzy strefy sam.
2. **Plan tygodniowy — nadpisanie per tydzień** (brak siatki osoby × dni).
3. **Historia wersji Walk-In — w modalu + panelu admina** (brak osobnej zakładki).
4. **Pogoda — demo (hardcoded)**. Propozycja: Open-Meteo (darmowe, bez klucza) do wdrożenia.
5. **Google Calendar — tylko .ics** (eksport + import jednorazowy). Brak OAuth.

---

## Wdrożenie

### Vercel Hobby
- 11/12 serverless functions używane.
- `vercel.json`: framework `vite`, build `vite build`, output `dist/`, crony.

### Zmienne środowiskowe (`.env.example`)
| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `GEMINI_API_KEY` | Dla AI | Model `gemini-2.0-flash` |
| `DATABASE_URL` | Dla bazy | PostgreSQL/Neon connection string |
| `VAPID_PUBLIC_KEY` | Dla push | Wygeneruj: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Dla push | — |
| `VAPID_SUBJECT` | Dla push | `mailto:...` |
| `CRON_SECRET` | Dla cronów | Losowy string, header `Authorization: Bearer` |
| `BLOB_READ_WRITE_TOKEN` | Dla zdjęć | Vercel Blob store token |
| `APP_URL` | Opcjonalna | URL apki (OAuth, linki) |

### Lokalny dev
```bash
npm install
npm run dev    # vercel dev (functions lokalnie)
npm run build  # vite build
npm run lint   # tsc --noEmit (0 błędów)
```

### Weryfikacja
- `tsc --noEmit` → 0 błędów ✅
- `vite build` → 2537 modułów, build OK ✅
- `api/health` → `{ status: 'ok', aiReady: bool, database: 'postgresql/neon' | 'local-storage/memory' }`

---

## Znane ograniczenia
- Pogoda to demo (hardcoded).
- Crony używają UTC zamiast Europe/Warsaw (ciche godziny mogą być przesunięte).
- Vercel Blob: wideo szybko zużywa darmowy tier (~500 MB/mies.) — nagrywać krótkie klipy.
- `BLOB_READ_WRITE_TOKEN` brak → zdjęcia wracają jako `dataUrl` (niepersystentne między reloadami).
