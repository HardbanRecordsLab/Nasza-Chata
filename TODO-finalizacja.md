# TODO — Finalizacja „Nasza Chata"

Lista robocza, zaktualizowana po audycie (sesja z danymi z kodu). Stan odzwierciedla realny kod, nie aspiracje.

---

## 🔴 PRIORYTET 0 — Krytyczne poprawki

### 0.1 Skaner paragonów ✅ ZROBIONE
- [x] W `src/components/modals/ScanReceiptModal.tsx` (`processReceipt()`) i `src/components/views/ShoppingView.tsx:145` (`handleReceiptScan()`) wysyłka jest realizowana przez `fetch('/api/ai?action=scan-receipt', { method: 'POST', body: JSON.stringify({ imageBase64, mode: 'receipt' }) })`. Wcześniej `setTimeout`+`Math.random` zostały usunięte.
- [x] Realny stan `isProcessing` powiązany z cyklem życia fetcha (`api/ai.ts:25`).
- [x] Mapowanie odpowiedzi API na `amount`, `note`, `category`, `date` + ewentualne pozycje do spiżarni (`items[]`).
- [x] Toast błędu przy `!res.ok` (`ScanReceiptModal.tsx:71`).
- [x] Fallback demo: `server/handlers/scan-handwritten.ts:33-41` zwraca `aiPowered: false` gdy brak `GEMINI_API_KEY`. Front ma to obsłużone przez pole `aiPowered` (renderuje odpowiedni komunikat).

### 0.2 Mini-kalendarz na dashboardzie ✅ ZROBIONE
- [x] Komponent inline w `src/components/views/TodayView.tsx` (sekcja przed tablicą wiadomości), siatka miesiąca z kropkami postępu per dzień.
- [x] Wykorzystuje `getOccurrencesForDate` z `src/utils/recurrenceEngine.ts` — logika nie jest duplikowana.
- [x] Klik w dzień → `onSelectDate(date)` → ustawia `calendarSelectedDate` w `App.tsx` → przy następnym wejściu w zakładkę `calendar` ląduje na wybranym dniu.

### 0.3 Automatyczne powiadomienia ✅ ZROBIONE
- [x] Crony w `vercel.json` (daily-briefing 6:00 UTC, wood-supply-check pon 6:00 UTC).
- [x] `api/cron/daily-briefing.ts` i `api/cron/wood-supply-check.ts` istnieją, walidują `Authorization: Bearer ${CRON_SECRET}`.
- [x] `sendWebPushNotification` z `server/pushService.ts` jest wywoływany w obu plikach.
- [x] Strefa czasowa: cron jest w UTC, ale `currentHour` w cronach liczone jest lokalnie (na Vercel = UTC), więc dla `Europe/Warsaw` odprawa o 6:00 UTC = 8:00 czasu polskiego zimą. **Do dopracowania**: przeliczanie na lokalny czas PL z uwzględnieniem zmiany czasu (obecnie logika `inQuietHours` liczona jest w `Date.getHours()` Vercela, nie w timezone użytkownika — to uproszczenie).
- [x] Ciche godziny per profil: `NotificationSetting.quietHoursStart` / `quietHoursEnd` w `src/types.ts:258-259`. UI: `src/components/modals/NotificationSettingsModal.tsx`.

### 0.4 Porządki techniczne ✅ ZROBIONE
- [x] Wspólna logika biznesowa wydzielona do `server/handlers/state.ts`, `server/handlers/notifications.ts`, `server/handlers/scan-handwritten.ts`. Endpointy `api/state.ts`, `api/notifications.ts`, `api/ai.ts` są cienkimi wrapperami.
- [x] Pole `RoomTag.taskId` zostawione w `src/types.ts:151` — wykorzystywane w hotspotach (Pinezka nawiguje do zadania).
- [x] `tsc --noEmit` czyste, `vite build` przechodzi.

---

## 🟡 PRIORYTET 1 — Decyzje produktowe (po audycie)

### 1.1 Dynamiczne strefy (VisualZone) — zostajemy przy pełnej dynamice ✅
**Decyzja podjęta:** Zostajemy przy w pełni dynamicznym modelu. Brak sztywnej listy pomieszczeń w kodzie — `VisualZone` jest tworzony przez użytkownika przez UI (`addVisualZone` w `ChataContext.tsx`). Domyślnie aplikacja startuje z `visualZones: []` (patrz `ChataContext.tsx:206`).
**Uzasadnienie:** Pozwala na różne domy (mieszkanie, domek letniskowy, dom z biurem, itd.) bez modyfikacji kodu. Lista "7 pomieszczeń" z poprzedniej dokumentacji była zmyślona.
**Konsekwencja dla dokumentacji:** brak sekcji "7 pomieszczeń" — opisujemy mechanizm tworzenia stref.

### 1.2 Plan tygodniowy — zostaje model nadpisania per tydzień ✅
**Decyzja podjęta:** Realny `AdminPlanView` (`src/components/views/AdminPlanView.tsx`) nadpisuje przypisanie `taskId → profileId` dla konkretnego tygodnia (`WeeklyPlan.assignments: Record<string, string | null>`). Siatka "osoby × dni" **nie istnieje** w kodzie i **nie jest planowana** — nie ma takiej decyzji produktowej.
**Uzasadnienie:** Obecny model wystarcza, by przydzielić zadanie komuś w danym tygodniu. Siatka osoby × dni wymagałaby dodatkowej struktury danych (które dni tygodnia, nie tylko który tydzień) — nie ma na to popytu z życia.

### 1.3 Historia wersji Walk-In — zostaje w modalu ✅
**Decyzja podjęta:** `SpaceVersion[]` jest dostępne per strefa w `AdminPlanView` (sekcja "Historia wersji", `AdminPlanView.tsx:714-730`) **i** w `VisualZoneModal.tsx:994-1010`. Oba widoki obsługują przywracanie starszej wersji (akcja `rollback-version` w `api/walkin.ts`).
**Uzasadnienie:** Dwa widoki (panel admina + modal strefy) to naturalne miejsca. Osobna zakładka nie wnosi wartości, a zaciemnia nawigację.

### 1.4 Realna pogoda — zostaje demo ✅ (propozycja do wdrożenia)
**Stan obecny:** `api/weather.ts` zwraca **zawsze hardcoded symulowaną odpowiedź** (temp 21°C, condition partly_cloudy, 80% rainTomorrow, recommendation tekst, dwa `recommendedShifts`). Nie łączy się z żadnym zewnętrznym API.
**Propozycja do wdrożenia:** Open-Meteo (darmowe, bez klucza API) — wystarczy `fetch('https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&daily=...')`. Wymaga: współrzędne geograficzne domu (jednorazowa konfiguracja w `NotificationSettingsModal` albo nowy modal "Lokalizacja domu") + nowa zmienna środowiskowa (nie potrzebna dla Open-Meteo, bo darmowe bez klucza).
**Na teraz:** dokumentacja jasno mówi, że to demo.

### 1.5 Google Calendar — zostaje eksport/import .ics ✅
**Stan obecny:** Jedyna integracja z kalendarzem zewnętrznym to:
- **Eksport** zadań cyklicznych do `.ics` (`/api/export?action=calendar.ics`, patrz `api/export.ts:10-49`) — wklejenie URL do Google Calendar jako "kalendarz z URL" daje subskrypcję.
- **Import** jednorazowy: wklejenie treści `.ics` do ręcznego dodania wydarzenia w UI.
**Brak:** OAuth, dwukierunkowa synchronizacja, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` nie istnieją w `.env.example`.
**Decyzja podjęta:** Mechanizm .ics wystarcza dla bieżących potrzeb rodziny. OAuth nie jest planowany.

---

## ⚪ Zaległe, niesklasyfikowane (rozstrzygnięte)

- [x] **Nazwa aplikacji**: „Nasza Chata" — robocza nazwa, ale stosowana konsekwentnie w całym kodzie, dokumentach i nagłówku. Zmiana nazwy odrzucona (koszt refaktora nieuzasadniony).
- [x] **Hosting bazy**: PostgreSQL/Neon przez `pg` (`server/db.ts:67-83`). Zmienna `DATABASE_URL` (lub `POSTGRES_URL` / `POSTGRES_PRISMA_URL`) w `.env.example:13`. **Fallback do pamięci procesu** jeśli `DATABASE_URL` nie jest ustawione (`api/health.ts:11`: `database: hasPg ? 'postgresql/neon' : 'local-storage/memory'`).
- [x] **Limity Vercel Blob dla wideo**: Vercel Blob ma darmowy tier ~500 MB / mies. dla małych projektów. Wideo szybko to zjada. Wdrożenie wideo dla `VisualEntry.mediaType === 'video'` jest zaimplementowane w UI (`VisualZoneModal`), ale w praktyce dla tej apki rekomendacja: nagrywać krótkie klipy 10–20s. Realne wideo jeszcze nie jest testowane w produkcji — nie ma ograniczenia po stronie serwera.
- [x] **Prawdziwe zmienne środowiskowe w Vercel**: konfiguracja po stronie Vercel Dashboard — `.env.example` zawiera wszystkie wymagane (GEMINI_API_KEY, DATABASE_URL, VAPID_*, CRON_SECRET, BLOB_READ_WRITE_TOKEN, APP_URL). Reszta należy do deploya.
