# Nasza Chata — Dokumentacja

## Spis treści
1. [Architektura](#architektura)
2. [Profile i dostęp](#profile-i-dostęp)
3. [Zakładki aplikacji](#zakładki-aplikacji)
   - [Dzisiaj (Today)](#1-dzisiaj-today)
   - [Kalendarz](#2-kalendarz)
   - [Zakupy](#3-zakupy)
   - [Dom](#4-dom)
   - [Plan (Admin)](#5-plan-admin)
4. [Funkcje wspólne](#funkcje-wspólne)
5. [Panel Wspólny i Panel Zarządzanie](#panel-wspólny-i-panel-zarządzanie)
6. [Walk-In — wizualizacja przestrzenna](#walk-in--wizualizacja-przestrzenna)
7. [Spiżarnia i limity budżetowe](#spiżarnia-i-limity-budżetowe)
8. [Tryb nieobecność](#tryb-nieobecność)
9. [Historia serwisów sprzętu](#historia-servisów-sprzętu)
10. [Tablica wiadomości](#tablica-wiadomości)
11. [Skaner paragonów i notatek](#skaner-paragonów-i-notatek)
12. [Narzędzia AI](#narzędzia-ai)
13. [Backend API](#backend-api)
14. [Hosting i wdrożenie](#hosting-i-wdrożenie)

---

## Architektura

```
Nasza Chata/
├── src/
│   ├── App.tsx                    # Root component, routing zakładek
│   ├── context/
│   │   └── ChataContext.tsx        # Centralny stan + localStorage + server sync
│   ├── types.ts                    # Wszystkie interfejsy TypeScript
│   ├── constants/
│   │   └── initialData.ts          # Dane początkowe (profil, zadania, wydatki)
│   ├── components/
│   │   ├── views/
│   │   │   ├── TodayView.tsx       # Dashboard główny
│   │   │   ├── CalendarView.tsx     # Kalendarz rodzinny + sync
│   │   │   ├── ShoppingView.tsx     # Lista + Spiżarnia + Limity + Skan kodów
│   │   │   ├── HouseOverviewView.tsx # Dom: 7 pomieszczeń + serwisy
│   │   │   └── AdminPlanView.tsx    # Panel Zarządzanie: przydziały + plan tygodniowy
│   │   ├── modals/
│   │   │   ├── VisualZoneModal.tsx  # Walk-In viewer + Panorama 360° + historia V
│   │   │   ├── ScanHandwrittenModal.tsx # Skaner paragonów/notatek (Gemini AI)
│   │   │   ├── PinModal.tsx          # Weryfikacja PIN profilu
│   │   │   ├── SosModal.tsx          # Alert SOS
│   │   │   ├── AddTaskModal.tsx      # Dodawanie zadań
│   │   │   ├── AiAssistantModal.tsx  # Asystent AI (Gemini)
│   │   │   ├── NotificationSettingsModal.tsx
│   │   │   └── PwaWidgetModal.tsx     # Widżet na ekran główny
│   │   ├── widgets/
│   │   │   └── HomeScreenWidget.tsx  # Kompaktowy widget na drugi ekran/tablet
│   │   ├── Header.tsx               # Nagłówek z profilem i akcjami
│   │   └── BottomNav.tsx             # Nawigacja 5 zakładek
│   └── utils/
│       ├── recurrenceEngine.ts      # Silnik cykliczności zadań
│       ├── imageHash.ts             # pHash + Hamming (CPU, bez GPU)
│       ├── panoramaStitcher.ts       # Sklejanie panoramy (20% overlap, CPU)
│       ├── videoFrameExtractor.ts    # Ekstrakcja klatek (bez GPU)
│       └── notificationService.ts    # Web Push + Service Worker
├── api/
│   ├── state.ts                     # GET/POST całego stanu aplikacji
│   ├── walkin.ts                    # Walk-In: viewpoint graph + auto-hotspots
│   ├── ai/
│   │   └── scan-handwritten.ts      # Gemini AI: OCR paragonów i notatek
│   └── upload.ts                    # Upload zdjęć/wideo do Vercel Blob
├── server/
│   ├── db.ts                        # Vercel KV (Redis) lub in-memory fallback
│   └── pushService.ts                # Web Push (VAPID)
└── vercel.json                      # Routing + cron + Blob mounts
```

**Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Vercel Serverless Functions (Hobby tier, max 12 functions)
- Database: Vercel KV (Redis) z fallback in-memory
- Storage: Vercel Blob (zdjęcia, wideo)
- AI: Google Gemini API (server-side)
- Push: Web Push (VAPID)

---

## Profile i dostęp

### Profile domyślne
| ID | Imię | Rola | PIN | Admin |
|----|------|------|-----|-------|
| `kamil` | Kamil | Administrator | `1234` | Tak |
| `ilonka` | Ilona | — | `5678` | Nie |
| `olivia` | Olivia | — | — | Nie |

- Każdy profil ma własny kolor, awatar, strefę.
- Przełączanie profilu przez kliknięcie awatara w nagłówku.
- Jeśli profil ma PIN — wymagane podanie kodu przed przełączeniem.
- Panel **Zarządzanie** widoczny tylko dla Kamila (admin).

---

## Zakładki aplikacji

### 1. Dzisiaj (Today)

Centralny dashboard — jedno spojrzenie na wszystko na dziś.

**Zawartość:**
- **Pogoda** — aktualna pogoda + prognoza na jutro (WeatherAPI)
- **Kalendarz mini** — siatka miesiąca z postępem czystości per dzień (kropki/kreski)
- **Zadania na dziś** — lista obowiązków z daną częstotliwością, posortowana wg priorytetu:
  - Ikona pogody przy zadaniach wrażliwych na warunki (np. koszenie)
  - Kolor kropki: zielona (wykonane) → pomarańczowa (zbliża się termin) → czerwona (po terminie)
  - Konfetti przy odhaczeniu zadania
- **Skrót do Tablicy** — panel wspólny z wiadomościami
- **Tryb nieobecność** — przybranie самолёта (✈️), checklist przed wyjazdem
- **SOS** — czerwony przycisk awarii
- **AI Asystent** — przycisk z gwiazdką, otwiera czat z Gemini

**Parametry URL:**
- `?tab=today` / `?tab=calendar` / `?tab=shopping` / `?tab=house` / `?tab=plan`
- `?widget=1` — tryb widżet (kompaktowy widget na drugi ekran)
- `?action=sos` — otwiera modal SOS

---

### 2. Kalendarz

**Widok miesięczny:**
- Siatka kalendarza z kolorowymi kropkami per dzień (oznaczają zadania danego dnia)
- Kliknięcie dnia → lista zadań + wydarzeń tego dnia
- Kolor kropki = średni Cleanliness Score (CS) dla danego dnia:
  - Zielona: CS < 30 (wszystko czyste)
  - Pomarańczowa: CS 30–70
  - Czerwona: CS > 70 (zaniedbane)

**Wydarzenia rodzinne:**
- Dodawanie wydarzeń (urodziny, wizyty, inne)
- Kolorowe etykiety per typ
- Synchronizacja z kalendarzem Google (opcjonalnie)

**Silnik cykliczności:**
Obsługuje wszystkie typy częstotliwości:
| Typ | Logika |
|-----|--------|
| `daily` | Każdy dzień |
| `every_other_day` | Co drugi dzień |
| `twice_weekly` | 2x tygodniowo (Pn+Pt lub configurable) |
| `weekly` | Co tydzień (ten sam dzień) |
| `monthly` | Raz w miesiącu (ten sam dzień miesiąca) |

Sezonowość: zadania mogą mieć `seasonStart` i `seasonEnd` (np. koszenie: 4–10).

---

### 3. Zakupy

**Lista zakupów:**
- Dodawanie pozycji (nazwa, kategoria, szacunkowa cena, ilość)
- Oznaczanie jako kupione
- Podsumowanie kosztów w koszyku
- Zakończenie zakupów → zapis wydatku + odhaczenie zadania „Zrobić zakupy"

**Spiżarnia 🥫** (zakładka w widoku Zakupy):
- Lista produktów w spiżarni z kategoriami
- Prognoza: produkt świeży / kończy się / przeterminowany
- Progi niskiego stanu → alert
- Dodawanie pozycji ze zdjęciem lub bez

**Limity budżetowe 💰** (zakładka w widoku Zakupy):
- Ustawianie limitu per kategorię (np. „Spożywcze & Dom": 1500 zł/miesiąc)
- Pasek postępu: wydano vs. limit
- Alert przy przekroczeniu 80%
- Import z paragonów (skaner)

**Skaner kodów kreskowych 📷:**
- Kamera → skanowanie kodu kreskowego produktu
- Automatyczne rozpoznawanie produktu
- Dodanie do listy zakupów lub spiżarni

---

### 4. Dom

 Wizualizacja **7 pomieszczeń** (dół + góra):

**Parter:**
- Ganek
- Kotłownia
- Kuchnia
- Łazienka

**Piętro:**
- Sypialnia
- Pokój Olivii
- Przedpokój + Schody

**Dla każdego pomieszczenia:**
- Mini-galeria zdjęć (VisualZone entries)
- Status czystości
- Ostatnie zadania

**Dodatkowe sekcje:**
- **Drewno opałowe** — stan, zużycie dzienne, prognoza
- **Sprzęt AGD/RTV** — rejestr z gwarancjami i terminami serwisów
- **SOS** — zgłoszenia awarii z powiadomieniem
- **Komenty do domu** — notatki ogólne

---

### 5. Plan (Admin)

Panel zarządzania — tylko dla Kamila.

**Zakładki:**

#### Przydziały
- Lista wszystkich zadań
- Dropdown z członkami rodziny → przypisanie zadania
- Przypisanie = nadpisanie na dany tydzień (w planie tygodniowym)

#### Plan tygodniowy
- Widok tygodnia (Pn–Nd)
- Siatka: osoby × dni → można wstawić zadanie per komórkę
- Automatyczne generowanie na podstawie przydziałów
- Przesuwanie między tygodniami

#### Wizualizacja
- Mini-mapa domu z kolorowymi hotspotami
- Hotspot = pinezka na zdjęciu pomieszczenia
- Kliknięcie → skok do powiązanego zadania

#### Historia wersji
- V1, V2, V3... — każda zmiana układu hotspotów zapisana jako wersja
- Przywracanie poprzednich wersji
- Data, autor, liczba hotspotów per wersja

---

## Funkcje wspólne

### Tablica wiadomości (Panel Wspólny)
- Wspólna tablica ogłoszeń dla całej rodziny
- Dodawanie wiadomości (do 280 znaków)
- Przypinanie ważnych wiadomości (pin)
- Sortowanie: pinned → najnowsze
- Dostęp z **TodayView** i z modalu **VisualZoneModal**

### Powiadomienia Push (Web Push)
- Codzienna summarisches (wieczorna lub poranna)
- Przypomnienia o zadaniach
- Alerty serwisowe (zbliżające się terminy gwarancji)
- Ciche godziny per profil
- Włączanie/wyłączanie w `NotificationSettingsModal`

### PWA — widżet na ekran główny
- `?widget=1` → kompaktowy widok
- Idealny na drugi ekran, tablet, smart home display
- Skróty: +Zadanie, SOS, Otwórz appkę

### Dodawanie zadań (AI assisted)
- Modal `AddTaskModal`
- Wpisz nazwę → asystent AI proponuje:
  - Kategorię
  - Częstotliwość
  - Pomieszczenie
  - Pogodowa wrażliwość
  - Szacowany czas
- Ręczna edycja przed zapisem

### SOS Alert
- Szybkie zgłoszenie awarii
- Kto zgłosił, kiedy, jakie pomieszczenie
- Status: aktywne / rozwiązane
- Powiadomienie Web Push do rodziny

---

## Panel Wspólny i Panel Zarządzanie

### Panel Wspólny
Dostępny z **TodayView** (skrót) i z **VisualZoneModal** (ikona tablicy). Zawiera:
- Tablicę wiadomości (Board)
- Mini-kalendarz
- Ostatnie wydatki
- Pogoda

### Panel Zarządzanie
Dostępny z zakładki **Plan** (tylko Kamil). Zawiera:
- Przydziały zadań
- Plan tygodniowy
- Wizualizację domu z hotspotami
- Historię wersji V1..Vn

---

## Walk-In — wizualizacja przestrzenna

`VisualZoneModal` — interaktywna eksploracja pomieszczeń.

### Funkcje

**Walk-In Phase 1–3 (CPU-only, bez GPU):**
- `Phase 1` — Ekstrakcja klatek z wideo (bez GPU)
- `Phase 2` — Tworzenie grafu viewpointów (pHash + Hamming, 20-point match threshold)
- `Phase 3` — Auto-hotspoty na podstawie zmian między klatkami (Laplacian variance)

**Panorama 360° (CPU):**
- Sklejanie zdjęć w panoramę
- 20% overlap między sąsiednimi klatkami
- Filtry: Brightness, Contrast, Saturation (canvas)
- Eksport jako V2, V3... (wersjonowanie)

**Hotspoty nawigacji:**
- Każdy hotspot może prowadzić do innego viewpointu (`targetEntryId`)
- Strzałki nawigacji: ← → w viewerze
- Kliknięcie pinezki → przeskok do powiązanego zdjęcia
- Kolor pinezki = Cleanliness Score powiązanego zadania

**Historia wersji:**
- V1, V2, V3... — każdy eksport panoramy = nowa wersja
- Snapshot viewpoint links per wersja
- Przywracanie poprzednich wersji

### Kolejka async
- `startWalkinJob(zoneId)` — progres bar: queued → analyzing → extracting → finding-viewpoints → building-graph → creating-hotspots → ready
- Job status widoczny w UI
- Błędy nie fatalne (hotspot failure nie blokuje walk-in)

### Endpointy API
- `POST /api/walkin?action=create-viewpoints` — tworzenie grafu viewpointów
- `POST /api/walkin?action=auto-hotspots` — automatyczne hotspoty

---

## Spiżarnia i limity budżetowe

### Spiżarnia 🥫
- Dodawanie produktów (nazwa, ilość, kategoria, data ważności)
- Kategorie: Nabiał, Mięso, Warzywa, Owoce, Konserwy, Przyprawy, Inne
- Alerty przy niskim stanie (threshold per produkt)
- Status: ✅ świeży / ⚠️ kończy się / ❌ przeterminowany

### Limity 💰
- Ustawianie limitu per kategorię wydatków
- Okres: miesięczny
- Pasek postępu z kolorami (zielony → pomarańczowy → czerwony)
- Przekroczenie 80% → alert

### Skaner kodów kreskowych 📷
- Otwórz kamerę → nakieruj na kod kreskowy
- Rozpoznanie produktu (stub: demo mode bez realnej bazy)
- Dodanie do listy zakupów LUB spiżarni
- Obsługa błędów kamery (fallback na ręczne wprowadzanie)

---

## Tryb nieobecność

Aktywacja z **TodayView** (przycisk ✈️).

**Funkcje:**
- Wybór daty wyjazdu i powrotu
- Automatyczna checklist przed wyjazdem:
  - Sprawdzić okna
  - Zamknąć wodę
  - Wyłączyć światła
  - Podlać kwiaty
  - Wylać wodę z butelek
  - Zamrozić chleb
  - Wyrzucić śmieci
  - Sprawdzić termometr na zewnątrz
- Zaznaczanie pozycji po wykonaniu
- **Pauza zadań** — zadania cykliczne wstrzymane na czas nieobecności
- Powiadomienie przy aktywacji / deaktywacji

---

## Historia serwisów sprzętu

**W `HouseOverviewView`** — sekcja „Serwis".

**Dla każdego sprzętu (AGD/RTV):**
- Data zakupu
- Gwarancja (data końcowa)
- Ostatni serwis
- Następny serwis (np. przegląd kotła)
- Historia serwisów:
  - Data
  - Notatka
  - Koszt
  - Następny termin

**Alerty:**
- Zbliżający się koniec gwarancji (30 dni)
- Zbliżający się serwis (14 dni)

---

## Tablica wiadomości

Zob. **Funkcje wspólne → Tablica wiadomości**.

---

## Skaner paragonów i notatek

**`ScanHandwrittenModal`** — skaner paragonów i notatek odręcznych.

**Flow:**
1. Zrób zdjęcie (aparat lub galeria)
2. Kompresja po stronie klienta
3. Wysyłka do `POST /api/ai/scan-handwritten`
4. Gemini AI odczytuje:
   - Kwota
   - Nota / tytuł
   - Data
   - Kategoria
5. Podgląd wyniku → zapis jako wydatek LUB utworzenie zadań z notatki

**Parametry:**
- `imageBase64`: base64 skompresowanego zdjęcia
- `mode`: `'receipt'` (paragon) lub `'handwritten'` (notatka)

**Obsługa błędów:**
- Brak GEMINI_API_KEY → fallback demo
- Błąd sieci → toast błędu
- Upload progress indicator

---

## Narzędzia AI

### Asystent AI (`AiAssistantModal`)
- Czat z Gemini (model: `gemini-1.5-flash`)
- Kontekst: current profile, today's tasks, recent expenses
- Możliwości:
  - Sugestie zadań
  - Analiza wydatków
  - Odpowiedzi na pytania o dom

### Skaner paragonów
- OCR paragonów (Gemini Vision)
- Ekstrakcja kwoty, daty, kategorii

### AI Task Suggestions
- Przy tworzeniu zadania → propozycje AI:
  - Kategoria
  - Częstotliwość
  - Pomieszczenie
  - Pogodowa wrażliwość
  - Szacowany czas

---

## Backend API

### `GET/POST /api/state`
Pełny stan aplikacji (profiles, tasks, completions, expenses, itd.).
- `GET` — zwraca cały stan (dla hydrate na starcie)
- `POST` — zapisuje stan (sync z localStorage)

### `POST /api/ai/scan-handwritten`
```
Body: { imageBase64: string, mode: 'receipt' | 'handwritten' }
Response: { amount?: number, note?: string, date?: string, category?: string, items?: ScannedTaskProposal[], summary?: string }
```

### `POST /api/walkin`
```
Body: { zoneId: string }
Query: action=create-viewpoints | auto-hotspots
Response: { message: string, viewpoints?: ViewpointLink[], hotspots?: RoomTag[] }
```

### `POST /api/upload`
```
FormData: file (image/video)
Response: { url: string, thumbnailUrl?: string }
```

### `GET /api/backup`
Eksport pełnego stanu jako JSON do pobrania.

### Cron endpoints
- `GET /api/cron/daily-briefing` — codzienne podsumowanie (Web Push)
- `GET /api/cron/wood-supply-check` — alert o stanie drewna

---

## Hosting i wdrożenie

### Vercel Hobby (darmowy)
- **Limit: 12 serverless functions** — aktualnie używane: 11
  1. `api/state.ts`
  2. `api/walkin.ts`
  3. `api/ai/scan-handwritten.ts`
  4. `api/upload.ts`
  5. `api/backup.ts`
  6–11. Crony i helpery

### Zmienne środowiskowe (`.env`)
```env
# AI
GEMINI_API_KEY=...

# Vercel KV (Redis)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=...

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:...

# Weather (opcjonalne)
WEATHER_API_KEY=...

# Google Calendar (opcjonalne)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Budowanie i deploy
```bash
npm install
npm run build    # Vite build → dist/
vercel deploy    # Wdróż na Vercel
```

### Lokalny development
```bash
npm run dev      # Vite dev server na :5173
vercel dev       # Vercel functions lokalnie
```

### Weryfikacja
```bash
tsc --noEmit     # 0 błędów TypeScript
```

---

## Podsumowanie funkcji

| # | Funkcja | Status | Lokalizacja |
|---|---------|--------|-------------|
| 1 | Tablica wiadomości | ✅ | BoardWidget, TodayView |
| 2 | Kalendarz rodzinny + sync | ✅ | CalendarView, recurrenceEngine |
| 3 | Spiżarnia | ✅ | ShoppingView → zakładka Pantry |
| 4 | Limity budżetowe | ✅ | ShoppingView → zakładka Budget |
| 5 | Skan paragonów (Gemini AI) | ✅ | ScanHandwrittenModal, api/ai/scan-handwritten |
| 6 | Skan kodów kreskowych | ✅ | ShoppingView (camera stub) |
| 7 | Historia serwisów sprzętu | ✅ | HouseOverviewView → sekcja Serwis |
| 8 | Tryb nieobecność | ✅ | TodayView → przycisk ✈️ |
| 9 | Walk-In Faza 1–3 (CPU) | ✅ | VisualZoneModal, api/walkin |
| 10 | Panorama 360° (CPU) | ✅ | panoramaStitcher.ts |
| 11 | Wersjonowanie V1..Vn | ✅ | VisualZone.versions[], SpaceVersion |
| 12 | Panel wspólny | ✅ | BoardWidget w TodayView i VisualZoneModal |
| 13 | Panel zarządzanie | ✅ | AdminPlanView (tylko Kamil) |
| 14 | 7 pomieszczeń wizualizacja | ✅ | HouseOverviewView, AdminPlanView |
| 15 | Hotspoty nawigacji | ✅ | RoomTag.targetEntryId |
| 16 | AI Asystent | ✅ | AiAssistantModal |
| 17 | SOS Alert | ✅ | SosModal |
| 18 | PWA widżet | ✅ | PwaWidgetModal, HomeScreenWidget |
| 19 | Web Push powiadomienia | ✅ | notificationService.ts |
| 20 | Sync localStorage ↔ server | ✅ | ChataContext debounce 1.5s |
| 21 | pHash + Hamming (CPU) | ✅ | imageHash.ts |
| 22 | Konfetti przy wykonaniu | ✅ | ChataContext.toggleTaskCompletion |
| 23 | Pogoda (WeatherAPI stub) | ✅ | TodayView weather widget |
| 24 | Wydatki + kategorie | ✅ | Expense[], ShoppingView |
| 25 | Lista zakupów | ✅ | ShoppingView |
| 26 | Drewno opałowe | ✅ | HouseOverviewView |
| 27 | Przydziały zadań | ✅ | AdminPlanView → Przydziały |
| 28 | Plan tygodniowy | ✅ | AdminPlanView → Plan tygodniowy |
| 29 | Cleanliness Score | ✅ | recurrenceEngine.calculateCleanlinessScore |
| 30 | Przypomnienia o gwarancjach | ✅ | HouseOverviewView (alerts) |
