# Nasza Chata — Dokumentacja aplikacji i poradnik użytkownika

Aplikacja webowa (PWA) do zarządzania obowiązkami, wydatkami, zakupami, zapasem drewna i stanem domu jednorodzinnego przez rodzinę. Działa w przeglądarce, na telefonie da się „zainstalować" jak natywną apkę.

**Wersja dokumentu:** sierpień 2026 — na podstawie bezpośredniego odczytu kodu źródłowego (`src/`, `api/`, `server/`, `.env.example`). Wszystkie PIN-y, nazwy endpointów, model AI i zmienne środowiskowe pochodzą z plików źródłowych, nie z ogólnej wiedzy.

---

## Spis treści

1. [O aplikacji](#1-o-aplikacji)
2. [Architektura techniczna](#2-architektura-techniczna)
3. [Profile domowników i logowanie](#3-profile-domowników-i-logowanie)
4. [Nawigacja główna](#4-nawigacja-główna)
5. [Widok „Wspólny" (Dzisiaj)](#5-widok-wspólny-dzisiaj)
6. [Widok „Kalendarz"](#6-widok-kalendarz)
7. [Widok „Zakupy"](#7-widok-zakupy)
8. [Widok „Dom"](#8-widok-dom)
9. [Widok „Zarządzanie" (panel admina)](#9-widok-zarządzanie-panel-admina)
10. [Funkcje AI (Gemini)](#10-funkcje-ai-gemini)
11. [Powiadomienia push](#11-powiadomienia-push)
12. [Tryb PWA / widżet pulpitu](#12-tryb-pwa--widżet-pulpitu)
13. [Tryb gościa](#13-tryb-gościa)
14. [Tryb nieobecności](#14-tryb-nieobecności)
15. [Automatyzacje w tle (crony)](#15-automatyzacje-w-tle-crony)
16. [Backend — API reference](#16-backend--api-reference)
17. [Poradnik użytkownika krok po kroku](#17-poradnik-użytkownika-krok-po-kroku)
18. [FAQ i rozwiązywanie problemów](#18-faq-i-rozwiązywanie-problemów)
19. [Znane ograniczenia](#19-znane-ograniczenia)
20. [Decyzje produktowe (po audycie kodu)](#20-decyzje-produktowe-po-audycie-kodu)
21. [Wdrożenie i konfiguracja](#21-wdrożenie-i-konfiguracja)

---

## 1. O aplikacji

„Nasza Chata" to rodzinny planer obowiązków domowych, ogrodu, pieca i wydatków, stworzony z myślą o domu jednorodzinnym z ogrodem i piecem na drewno. Aplikacja obsługuje trzy domyślne profile domowników (Kamil, Ilona, Olivia), każdy z osobnym PIN-em i poziomem uprawnień.

Główne obszary funkcjonalne:

- **Zadania domowe** — cykliczne obowiązki (codzienne, co drugi dzień, dwa razy w tygodniu, tygodniowe, miesięczne, sezonowe) z automatycznym wskaźnikiem pilności. Startowo zdefiniowanych jest **96 zadań** w **13 kategoriach** (`src/constants/initialData.ts`).
- **Zakupy i budżet** — lista zakupów, kalkulator „w trakcie zakupów", wydatki, spiżarnia, limity budżetowe.
- **Dom i ogród** — zapas drewna, sprzęt domowy z historią serwisową, wizualna dokumentacja pomieszczeń/ogrodu (zdjęcia i wideo).
- **Komunikacja rodzinna** — tablica wiadomości, komentarze pod zadaniami, alerty SOS przy awariach.
- **Asystent AI** — czat oraz skanowanie odręcznych karteczek i paragonów (Google Gemini).
- **Panel administratora** — przypisywanie zadań, planowanie tygodniowe, zarządzanie wizualizacją domu.
- **Powiadomienia push** — przypomnienia, alerty pogodowe, automatyczne podsumowania dnia i alerty o niskim zapasie drewna.

---

## 2. Architektura techniczna

| Warstwa | Technologia | Plik źródłowy |
|---|---|---|
| Frontend | React 19 + TypeScript 5.8, Vite 6.2, Tailwind CSS 4.1 | `src/App.tsx`, `package.json` |
| UI | lucide-react, canvas-confetti, date-fns, recharts, motion | `package.json` |
| Backend | Funkcje serverless (Vercel Functions, styl Express) w `/api` | `api/*.ts`, `vercel.json` |
| Baza danych | PostgreSQL (`pg` / Neon) — z automatycznym fallbackiem do pamięci procesu, gdy brak `DATABASE_URL` | `server/db.ts` |
| Przechowywanie plików | Vercel Blob (`@vercel/blob`) — z fallbackiem „zwróć dataURL" w trybie deweloperskim | `api/upload.ts` |
| AI | Google Gemini (`@google/genai`, model `gemini-2.0-flash`) | `api/ai.ts`, `server/handlers/scan-handwritten.ts` |
| Powiadomienia | Web Push (`web-push`), klucze VAPID | `server/pushService.ts` |
| Hosting docelowy | Vercel (cron joby, funkcje, hosting statyczny) | `vercel.json` |

Frontend synchronizuje stan z backendem przez pojedynczy endpoint `/api/state` (GET pobiera cały stan „bazy", POST go nadpisuje). Dodatkowo aplikacja zawsze trzyma kopię stanu w `localStorage` przeglądarki (debounce 1.5 s w `ChataContext.tsx`) — dzięki temu **działa offline i na starcie ładuje się natychmiast**, a synchronizacja z serwerem odbywa się w tle.

Aplikacja jest progresywną aplikacją webową (PWA) — ma `manifest.json` i `service worker` (`public/sw.js`), dzięki czemu można ją „zainstalować" na ekranie głównym telefonu.

### Ograniczenie Vercel Hobby
Darmowy tier Vercel pozwala na maks. **12 serverless functions**. Aktualnie używane są **11** (limit bezpieczny):
`api/health.ts`, `api/state.ts`, `api/ai.ts`, `api/export.ts`, `api/notifications.ts`, `api/walkin.ts`, `api/weather.ts`, `api/upload.ts`, `api/widget/today.ts`, `api/cron/daily-briefing.ts`, `api/cron/wood-supply-check.ts`.

### Struktura plików
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

### Baza danych
- **Główna:** PostgreSQL przez `pg.Pool` (`server/db.ts`).
- **Parametr połączenia:** `DATABASE_URL` lub `POSTGRES_URL` lub `POSTGRES_PRISMA_URL`.
- **Tabela:** `chata_store` (klucz `main_state`, kolumna `data JSONB`) + `chata_push_subscriptions`.
- **Fallback (brak `DATABASE_URL`):** stan w pamięci procesu (każdy cold start = pusty stan, chyba że `localStorage` na kliencie ma dane). `api/health.ts` zwraca wtedy `database: 'local-storage/memory'`.
- **Lokalny fallback:** `data/chata_db.json` (tylko dev, read-only w serverless).

### Zmienne środowiskowe (konfiguracja)
| Zmienna | Do czego służy | Co się dzieje bez niej |
|---|---|---|
| `GEMINI_API_KEY` | Klucz do Google Gemini | Asystent AI i skanery działają w **trybie demo** (sztywne przykładowe odpowiedzi) |
| `DATABASE_URL` | Połączenie z bazą Postgres/Neon | Stan trzymany tylko w pamięci procesu (znika przy restarcie serwera) |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob | Zdjęcia/wideo nie są trwale zapisywane — wracają jako surowy dataURL |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Klucze do powiadomień Web Push | Powiadomienia push są wyłączone |
| `CRON_SECRET` | Sekret zabezpieczający zadania cron | Zadania automatyczne (briefing, alert o drewnie) zwracają błąd 401 |
| `APP_URL` | URL apki (OAuth, linki) | Opcjonalna |

---

## 3. Profile domowników i logowanie

Domyślnie skonfigurowane są trzy profile (źródło: `src/constants/initialData.ts`):

| Profil | ID | Rola | PIN | Uprawnienia |
|---|---|---|---|---|
| **Kamil** | `kamil` | Gospodarz (Admin) | `1482` | Pełny dostęp, w tym panel „Zarządzanie" |
| **Ilona** | `ilona` | Żona / Organizatorka | `2591` | Standardowy dostęp |
| **Olivia** | `olivia` | Córka / Pomocniczka | `3670` | Standardowy dostęp |

Przełączanie profilu odbywa się z górnego nagłówka (awatar + strzałka). Każdy profil jest zabezpieczony **4-cyfrowym PIN-em** — po wybraniu profilu pojawia się klawiatura numeryczna do wpisania kodu. Błędny PIN pokazuje komunikat o błędzie i nie przełącza profilu.

Zdjęcie profilowe każdego domownika można zmienić przez modal edycji zdjęcia (aparat lub upload pliku, ze wstępną kompresją obrazu).

---

## 4. Nawigacja główna

Dolny pasek nawigacji (widoczny na każdym ekranie) ma 5 zakładek (definicja w `src/components/BottomNav.tsx`):

| Ikona | Zakładka | Opis |
|---|---|---|
| 🗂️ | **Wspólny** | Główny pulpit dnia — lista zadań na dziś, pogoda, skróty |
| 📅 | **Kalendarz** | Widok miesięczny zadań i wydarzeń rodzinnych |
| 🛍️ | **Zakupy** | Lista zakupów, wydatki, spiżarnia, budżet |
| 🏠 | **Dom** | Drewno, sprzęt, wizualizacja pomieszczeń, statystyki |
| 📋 | **Zarządzanie** | Panel administratora (widoczny, ale zablokowany 🔒 dla osób bez uprawnień admina) |

Zakładki „Wspólny" i „Zakupy" pokazują liczbowe znaczniki (badge) z liczbą zaległych zadań/pozycji zakupowych.

Górny nagłówek zawiera dodatkowo: przycisk **+ Dodaj zadanie**, przycisk **SOS** (czerwony alarm), dzwonek **powiadomień**, ikonę **widżetu pulpitu**, oraz skaner **odręcznej kartki (AI)**.

---

## 5. Widok „Wspólny" (Dzisiaj)

To ekran startowy aplikacji (`src/components/views/TodayView.tsx`). Zawiera:

- **Baner alarmu SOS** — pojawia się na górze, jeśli jest aktywne zgłoszenie awarii.
- **Pasek pogody** — pobierany z `/api/weather`; pokazuje temperaturę, warunki oraz rekomendacje typu „jutro deszcz — skoś trawnik dziś". **Uwaga: obecnie pogoda jest zawsze symulowana (hardcoded) — patrz Znane ograniczenia.**
- **Mini-kalendarz** — siatka miesiąca z kropkami postępu per dzień; klik w dzień przenosi do widoku Kalendarza na ten dzień.
- **Pasek postępu dnia** — % wykonanych zadań na dziś spośród wszystkich zaplanowanych.
- **Filtr kategorii** — Wszystkie / 🔥 Kotłownia i Drewno / 🧹 Sprzątanie / 🌿 Ogród.
- **Lista zadań na dziś** — każde zadanie ma kolorowy wskaźnik pilności (im dłużej niewykonane względem swojej częstotliwości, tym „gorętszy" kolor), przypisaną osobę i możliwość odhaczenia bezpośrednio z listy lub otwarcia szczegółów.
- **Kafelek „Portfel & Zakupy"** — skrót do wydatków miesięcznych i listy zakupów.
- **Kafelek „Kalendarz & Planer"** — skrót do widoku kalendarza.
- **Tablica wiadomości** — krótkie wiadomości/notatki rodzinne widoczne na dole widoku, z możliwością przypięcia ważnej wiadomości.
- **Tryb nieobecności** — przełącznik uruchamiający checklistę wyjazdową (patrz sekcja 14).

Kliknięcie w zadanie otwiera **szczegóły zadania** (`TaskDetailModal`): historię wykonań, komentarze, możliwość dodania „dowodu wykonania" (zdjęcie przed/po) oraz edycję/usunięcie zadania.

---

## 6. Widok „Kalendarz"

- Siatka miesięczna z nawigacją między miesiącami.
- Każdy dzień pokazuje skrót zaplanowanych zadań oraz wydarzenia rodzinne (urodziny, wizyty, inne — kolorowane wg typu).
- **Dodawanie wydarzeń rodzinnych** — formularz z tytułem, datą i typem wydarzenia.
- **Eksport do kalendarza** — przycisk generujący plik `.ics` (`/api/export?action=calendar.ics`), który można dodać w Google Calendar/Apple Calendar jako „Kalendarz z adresu URL".
- **Import ICS** — pole do wklejenia treści pliku `.ics` z zewnętrznego kalendarza, które tworzy odpowiadające wydarzenia rodzinne w aplikacji.
- Kliknięcie w dzień pokazuje zadania zaplanowane na ten dzień i pozwala je odhaczyć.

---

## 7. Widok „Zakupy"

Pięć wewnętrznych zakładek (`src/components/views/ShoppingView.tsx`):

1. **Lista** — bieżąca lista zakupów (nazwa, kategoria, ilość, szacowana cena). Pozycje można odhaczać jako kupione i usuwać. Dostępny jest **skaner kodów kreskowych** (`BarcodeScannerModal.tsx`, przez kamerę lub ręczne wpisanie kodu) do szybkiego dodawania produktów.
2. **Kalkulator** — tryb „jestem w sklepie": dodajesz produkty do wirtualnego koszyka z ceną i ilością, aplikacja sumuje na bieżąco łączną kwotę. Po zakończeniu zakupów koszyk zamienia się w zapis wydatku i ewentualnie uzupełnia spiżarnię.
3. **Wydatki** — historia wydatków z kategorią, kwotą, datą i osobą kupującą; można dodać ręcznie lub **zeskanować paragon przez AI** (patrz sekcja 10) — kwota, sklep, data i pozycje są rozpoznawane automatycznie ze zdjęcia.
4. **Spiżarnia** — lista produktów w zapasie z ilością, jednostką, progiem „mało" i datą ważności.
5. **Budżet** — limity miesięczne per kategoria wydatków, z wizualnym paskiem wykorzystania budżetu.

---

## 8. Widok „Dom"

Pięć sekcji wewnętrznych (`src/components/views/HouseOverviewView.tsx`):

1. **Drewno** — aktualny zapas drewna w m³ (na tle całkowitej pojemności drewutni), liczba polan w kotłowni, gatunki drewna, status sezonowania, data ostatniego rąbania. Można ręcznie skorygować stan. *Uwaga techniczna: `woodTypes` może być `undefined` — kod używa fallbacku `(woodTypes ?? []).join(', ')` (poprawione w audycie).*
2. **Sprzęt** — rejestr urządzeń domowych (piec, kosiarka, itd.) z datą zakupu, gwarancją, ostatnim i następnym serwisem, numerem modelu i notatkami. Historia serwisowa (`EquipmentServiceEntry[]`) jest zapisywana osobno dla każdego urządzenia.
3. **Pomieszczenia** (wizualizacja) — cyfrowa dokumentacja domu i ogrodu zdjęciami/wideo:
   - Tworzenie **stref wizualnych** (`VisualZone`) — pokój / ogród / pomieszczenie gospodarcze. Strefy są **w pełni dynamiczne** (tworzone przez użytkownika), brak sztywnej listy pomieszczeń w kodzie.
   - Dodawanie **wpisów** (`VisualEntry`, zdjęcie lub krótkie wideo) do danej strefy, z etykietą kąta ujęcia i podpisem.
   - **Pineski/tagi** (`RoomTag`) na zdjęciu, w tym nawigacyjne (`targetEntryId` → przeskok do innego ujęcia).
   - Funkcja **„wirtualnego spaceru" (Walk-In)** — CPU-owe (bez GPU) łączenie zdjęć w graf punktów widokowych:
     - `hashImageData` / `hammingDistance` — pHash + Hamming (deduplikacja zdjęć, `src/utils/imageHash.ts`).
     - `laplacianVariance` — ocena ostrości klatki.
     - `extractKeyFrames` — klatki kluczowe z wideo (canvas, bez GPU).
     - `stitchPanorama` — sklejanie 2–5 zdjęć z 20% overlap (canvas, `src/utils/panoramaStitcher.ts`).
   - Próba **zszywania panoramy 360°** z kilku nachodzących na siebie ujęć (po stronie klienta).
   - Filtrowanie stref: wszystkie / pokoje / ogród.
   - **Wersjonowanie** — `zone.walkinVersion` (V1, V2...) + `zone.versions[]` (snapshot linków), przywracanie starszej wersji (`rollback-version`).
4. **Statystyki** — podsumowania (np. rozkład zadań, wydatków) w danym okresie.
5. **Ustawienia** — konfiguracja związana z widokiem domu.

Dostępny jest też **tryb gościa** — generowanie linku, który pokazuje zaproszonej osobie (np. sąsiadowi pilnującemu domu) wybrane informacje bez pełnego dostępu do aplikacji (patrz sekcja 13).

---

## 9. Widok „Zarządzanie" (panel admina)

Dostępny tylko dla profilu z uprawnieniami administratora (domyślnie: Kamil). Osoby bez uprawnień widzą tę zakładkę zablokowaną (🔒) i komunikat o braku dostępu z podaniem aktualnego zalogowanego profilu (`AdminPlanView.tsx`).

Trzy wewnętrzne zakładki:

1. **Przypisywanie zadań** — lista wszystkich zadań z filtrem po kategorii i wyszukiwarką, z możliwością przypisania każdego zadania do konkretnego domownika lub pozostawienia „do wzięcia przez kogokolwiek". Dostępna jest funkcja **losowego przydziału** (tasowanie) oraz **czyszczenia przypisań**.
2. **Plan tygodniowy** — nawigacja tydzień po tygodniu (wstecz/naprzód), z możliwością nadpisania przypisania konkretnego zadania tylko na dany tydzień (`WeeklyPlan.assignments: Record<taskId, profileId | null>`, bez zmiany przypisania stałego), zapisania notatki do tygodnia i wydruku planu. *Uwaga: nie ma widoku siatki „osoby × dni" — model to nadpisanie per zadanie na dany tydzień.*
3. **Wizualizacja** — ten sam mechanizm co w zakładce „Dom → Pomieszczenia", ale z poziomu panelu administracyjnego (zarządzanie strefami wizualnymi z filtrem pokój/ogród). Zawiera też sekcję **Historia wersji** (`SpaceVersion[]`), gdzie można przywrócić wcześniejszą wersję linków/hotspotów.

---

## 10. Funkcje AI (Gemini)

Aplikacja integruje się z Google Gemini (model `gemini-2.0-flash` przez `@google/genai`) w trzech miejscach. Każdy endpoint sprawdza `process.env.GEMINI_API_KEY` — bez klucza przechodzi w czytelny tryb demo (`aiPowered: false`).

### 10.1 Asystent czatu
Modal czatu dostępny z górnego nagłówka (`/api/ai?action=chat`). Zna bieżący stan domu (liczbę zadań, poziom drewna, wydatki, listę brakujących zakupów) i odpowiada po polsku, w ciepłym, domowym tonie.

### 10.2 Skanowanie odręcznej kartki z obowiązkami
Funkcja „Skanuj odręczną kartkę" (ikona aparatu w nagłówku) → `/api/ai?action=scan-chores-vision`. Pozwala zrobić zdjęcie lub wgrać zdjęcie odręcznej listy obowiązków (np. z lodówki). AI:
- odczytuje pismo odręczne,
- rozpoznaje poszczególne zadania,
- przypisuje kategorię, częstotliwość, pomieszczenie i sugerowaną osobę do wykonania,
- pokazuje surową transkrypcję i podsumowanie,
- pozwala **zaznaczyć, które propozycje faktycznie dodać** jako nowe zadania (nic nie jest dodawane automatycznie bez zatwierdzenia).

### 10.3 Skanowanie paragonu
W zakładce „Zakupy → Wydatki" (`ScanReceiptModal.tsx`) lub przez przycisk w liście zakupów → `/api/ai?action=scan-receipt`. AI rozpoznaje kwotę, sklep, datę, kategorię wydatku oraz listę pozycji, które można od razu dodać do spiżarni. *Uwaga: akcja to `scan-receipt`, nie `scan-handwritten` (starsza nazwa została ujednolicona w audycie).*

### Tryb bez klucza API
Jeśli `GEMINI_API_KEY` nie jest ustawiony na serwerze, wszystkie trzy funkcje **nie zwracają błędu**, tylko przechodzą w czytelny tryb demonstracyjny z przykładowymi danymi i informacją, że pełne AI wymaga skonfigurowania klucza. Dzięki temu aplikacja jest w pełni testowalna bez płatnego API.

---

## 11. Powiadomienia push

Konfiguracja w modalu „Powiadomienia" (dzwonek w nagłówku):

- Włączanie/wyłączanie powiadomień web push dla danego profilu.
- Ustawienie godziny **codziennego podsumowania** (domyślnie wieczorem).
- **Ciche godziny** (np. 22:00–7:00), w których powiadomienia nie są wysyłane.
- Przypomnienie weekendowe.
- Alerty pogodowe (np. „jutro deszcz").
- Przycisk **testowego powiadomienia**, aby sprawdzić, czy działa na danym urządzeniu.

Wymaga zgody przeglądarki na powiadomienia oraz skonfigurowanych kluczy VAPID po stronie serwera. Bez kluczy VAPID funkcja subskrypcji cicho się nie powiedzie (bez błędu widocznego dla użytkownika), a przycisk testowy poinformuje, że urządzenie nie jest zasubskrybowane.

---

## 12. Tryb PWA / widżet pulpitu

- Aplikację można **zainstalować** na telefonie/komputerze jak natywną (ikona, pełny ekran, działanie offline dzięki service workerowi).
- Modal „Widżet pulpitu" tłumaczy krok po kroku, jak dodać skrót/widżet do ekranu głównego (Android/iOS/desktop).
- Dostępny jest **tryb samego widżetu** (`?widget=today` w adresie URL) — uproszczony, jednoekranowy widok z liczbą dzisiejszych zadań i szybkimi przyciskami (dodaj zadanie, SOS), myślany pod widżety systemowe lub dodatkowe ekrany (np. tablet w kuchni). Dane dla widżetu serwuje `/api/widget/today`.

---

## 13. Tryb gościa

Modal „Widok gościa" (`GuestViewModal.tsx`) generuje unikalny link, który można wysłać osobie z zewnątrz (np. sąsiadowi, opiekunowi zwierząt) pod nieobecność domowników. Gość widzi wybrany zestaw informacji praktycznych — w zależności od wybranego tematu:

- **Piec/kotłownia** — jak obsłużyć piec, ile drewna dorzucić.
- **Ogród** — co podlać, skosić, itd.
- **Ogólne** — podstawowe informacje o domu i najbliższym sprzęcie.

Link można skopiować do schowka jednym kliknięciem.

---

## 14. Tryb nieobecności

Uruchamiany z widoku „Wspólny" (`AbsenceMode` w `ChataContext.tsx`). Po aktywacji:
- Ustawia zakres dat wyjazdu (domyślnie 7 dni od dziś).
- Pokazuje **checklistę przed wyjazdem** (domyślnie: zakręcić wodę, wynieść śmieci, wygasić piec, zamknąć okna) — każdy punkt można odhaczyć.
- Pozwala **zapauzować wybrane zadania cykliczne** na czas nieobecności, żeby nie generowały zaległości podczas gdy nikogo nie ma w domu.

---

## 15. Automatyzacje w tle (crony)

Dwa zaplanowane zadania serwerowe (uruchamiane przez Vercel Cron, niezależnie od tego, czy ktoś ma otwartą aplikację — konfiguracja w `vercel.json`):

| Zadanie | Harmonogram | Co robi |
|---|---|---|
| **Codzienny briefing** (`daily-briefing`) | 6:00 UTC, codziennie | Wysyła push z podsumowaniem: liczba zaległych zadań na dziś, stan drewna, aktywne alerty SOS |
| **Sprawdzenie zapasu drewna** (`wood-supply-check`) | 6:00 UTC, w poniedziałki | Sprawdza, czy w kotłowni jest mniej niż 15 polan lub zapas drewutni spadł poniżej 5 m³ — jeśli tak, wysyła ostrzegawczy push |

Oba zadania są zabezpieczone nagłówkiem autoryzacyjnym (`CRON_SECRET`) — bez poprawnego sekretu zwracają błąd 401 i nie da się ich wywołać z zewnątrz.

*Uwaga (do poprawy): `currentHour` w cronach liczony jest z `Date.getHours()` Vercela (UTC), nie z `Europe/Warsaw`. Dla polskiego użytkownika ciche godziny mogą być przesunięte o 1–2 h zimą/latem.*

---

## 16. Backend — API reference

Wszystkie endpointy znajdują się pod `/api/...`. Akcja wybierana jest parametrem `?action=`.

| Endpoint | Metoda | Akcje | Opis |
|---|---|---|---|
| `/api/health` | GET | — | Status serwera, czy AI/baza są skonfigurowane (`{ status, time, aiReady, database }`) |
| `/api/state` | GET / POST | `sync` (POST) | Pobranie / zapisanie całego stanu aplikacji. POST jest defensywny (`Array.isArray` per pole) i zawsze zwraca 200 (nie 500) |
| `/api/ai` | POST | `chat`, `scan-receipt`, `scan-chores-vision` | Czat AI i skanowanie obrazów przez Gemini. Model: `gemini-2.0-flash` |
| `/api/notifications` | GET / POST | `vapid-public-key`, `subscribe`, `send-push`, `test` | Obsługa subskrypcji i wysyłki Web Push |
| `/api/upload` | POST | — | Upload zdjęć/wideo do Vercel Blob (z fallbackiem dataURL, gdy brak `BLOB_READ_WRITE_TOKEN`) |
| `/api/weather` | GET | — | **Zawsze zwraca hardcoded symulację** (temp 21°C, 80% deszczu jutro, rekomendacja) — brak integracji z zewn. API |
| `/api/walkin` | POST | `create-viewpoints`, `auto-hotspots`, `update-space`, `rollback-version`, `panorama-attempt` | Logika „wirtualnego spaceru" po domu (graf zdjęć, CPU) |
| `/api/export` | GET | `calendar.ics`, `backup.json`, `yearly-chronicle` | Eksport kalendarza, pełnej kopii zapasowej stanu i rocznej kroniki |
| `/api/widget/today` | GET | — | Dane dla widżetu pulpitu |
| `/api/cron/daily-briefing` | GET | — | Zadanie cron: codzienne podsumowanie (chronione `CRON_SECRET`) |
| `/api/cron/wood-supply-check` | GET | — | Zadanie cron: alert o zapasie drewna (chronione `CRON_SECRET`) |

---

## 17. Poradnik użytkownika krok po kroku

### 17.1 Pierwsze uruchomienie
1. Otwórz aplikację w przeglądarce (na telefonie najlepiej od razu dodaj ją do ekranu głównego — patrz sekcja 12).
2. Wybierz swój profil (Kamil / Ilona / Olivia) i wpisz swój 4-cyfrowy PIN (odpowiednio: `1482` / `2591` / `3670`).
3. Zostaniesz przeniesiony do widoku „Wspólny" z listą dzisiejszych zadań.

### 17.2 Odhaczanie zadania
1. W widoku „Wspólny" lub „Kalendarz" znajdź zadanie.
2. Kliknij okrągły znacznik przy zadaniu, żeby odhaczyć je od razu, **albo** kliknij nazwę zadania, żeby otworzyć szczegóły i dodać zdjęcie „przed/po" jako dowód wykonania oraz notatkę.

### 17.3 Dodanie nowego zadania
1. Kliknij **„+ Dodaj zadanie"** w górnym nagłówku.
2. Wypełnij nazwę, kategorię, częstotliwość, pomieszczenie i (opcjonalnie) osobę przypisaną.
3. Zapisz — zadanie od razu pojawi się na liście zgodnie ze swoim harmonogramem.

### 17.4 Zgłoszenie awarii (SOS)
1. Kliknij czerwony przycisk **SOS** w nagłówku.
2. Wybierz poziom pilności (krytyczny / wysoki / średni), pomieszczenie, opisz problem, opcjonalnie dodaj zdjęcie.
3. Zgłoszenie pojawi się jako czerwony baner u góry widoku „Wspólny" dla wszystkich domowników, dopóki ktoś go nie oznaczy jako rozwiązane.

### 17.5 Skanowanie odręcznej listy obowiązków
1. Kliknij ikonę aparatu przy nagłówku (**„Skanuj odręczną kartkę"**).
2. Zrób zdjęcie kartki lub wgraj istniejące zdjęcie.
3. Poczekaj na analizę AI — zobaczysz listę rozpoznanych zadań.
4. Odznacz te, których nie chcesz dodawać, i zatwierdź resztę — trafią do Twojej listy zadań.

### 17.6 Skanowanie paragonu
1. Wejdź w **Zakupy → Wydatki**.
2. Uruchom skaner paragonu, zrób zdjęcie.
3. Sprawdź rozpoznaną kwotę, sklep i pozycje — zatwierdź, żeby zapisać jako wydatek (i opcjonalnie dodać produkty do spiżarni).

### 17.7 Zakupy „na żywo" w sklepie
1. Wejdź w **Zakupy → Kalkulator**.
2. Dodawaj produkty z ceną i ilością w miarę wkładania ich do koszyka — suma liczy się na bieżąco.
3. Po wyjściu z kasy zatwierdź koszyk — zamieni się w zapis wydatku.

### 17.8 Dodanie zdjęcia pomieszczenia/ogrodu
1. Wejdź w **Dom → Pomieszczenia**.
2. Wybierz istniejącą strefę lub utwórz nową (pokój / ogród / pomieszczenie gospodarcze).
3. Dodaj wpis: zdjęcie lub krótkie wideo, opisz kąt ujęcia i dodaj podpis.
4. Z czasem, gdy zbierzesz kilka ujęć tej samej strefy, możesz uruchomić **automatyczne łączenie punktów widokowych** (Walk-In), żeby przeglądać dom jak w wirtualnym spacerze.

### 17.9 Ustawienie planu tygodniowego (admin)
1. Wejdź w **Zarządzanie → Plan tygodniowy** (wymaga uprawnień admina).
2. Nawiguj do właściwego tygodnia strzałkami.
3. Zmień przypisanie wybranych zadań tylko na ten tydzień, dodaj notatkę, zapisz.

### 17.10 Wygenerowanie linku dla gościa
1. Wejdź w **Dom** i otwórz „Widok gościa".
2. Wybierz temat (piec / ogród / ogólne).
3. Skopiuj wygenerowany link i wyślij go osobie, która ma zająć się domem pod Twoją nieobecność.

### 17.11 Eksport kalendarza do Google/Apple Calendar
1. Wejdź w **Kalendarz**.
2. Kliknij przycisk eksportu — otworzy się/pobierze plik `.ics`.
3. W Google Calendar dodaj go jako „Kalendarz z adresu URL" (lub zaimportuj plik bezpośrednio), żeby zadania domowe pojawiały się w Twoim głównym kalendarzu.

---

## 18. FAQ i rozwiązywanie problemów

**Nie działa asystent AI / skanowanie zwraca przykładowe dane zamiast prawdziwej analizy.**
Serwer nie ma skonfigurowanego klucza `GEMINI_API_KEY` — aplikacja celowo przechodzi wtedy w czytelny tryb demo zamiast się wywalać. Trzeba dodać klucz w zmiennych środowiskowych wdrożenia.

**Nie dostaję powiadomień push.**
Sprawdź trzy rzeczy: (1) czy przeglądarka ma zgodę na powiadomienia dla tej strony, (2) czy w ustawieniach powiadomień w aplikacji przełącznik jest włączony, (3) czy serwer ma skonfigurowane klucze VAPID — bez nich subskrypcja nie ma prawa zadziałać.

**Zdjęcia/wideo znikają po odświeżeniu strony.**
Bez skonfigurowanego `BLOB_READ_WRITE_TOKEN` pliki nie są trwale zapisywane na serwerze — działa to tylko jako podgląd w bieżącej sesji przeglądarki.

**Stan aplikacji „resetuje się" po jakimś czasie / na innym urządzeniu brakuje danych.**
Bez skonfigurowanego `DATABASE_URL` stan trzymany jest tylko w pamięci procesu serwera (znika przy jego restarcie) oraz lokalnie w przeglądarce. Do pełnej, trwałej synchronizacji między urządzeniami potrzebna jest podłączona baza Postgres/Neon.

**Nie widzę zakładki „Zarządzanie".**
Zakładka jest widoczna dla wszystkich, ale zablokowana (🔒) — dostęp mają tylko profile z uprawnieniami administratora (domyślnie: Kamil, PIN `1482`).

**Zapomniałem PIN-u.**
PIN-y domyślnych profili są ustawione na stałe w konfiguracji startowej aplikacji (`src/constants/initialData.ts`): Kamil `1482`, Ilona `2591`, Olivia `3670`. Aby je zmienić, trzeba edytować dane profilu w kodzie lub przez stan w bazie.

**Dolne zakładki nie przełączają widoku / biały ekran.**
Najczęściej przyczyną jest stary Service Worker w pamięci podręcznej przeglądarki. Otwórz F12 → Application → Service Workers → **Unregister**, a następnie zrób hard reload (Ctrl+Shift+R). Wdrożenia invalidują cache przez wersjonowany `CACHE_NAME` w `public/sw.js`.

---

## 19. Znane ograniczenia

- **Pogoda to demo** — `/api/weather` zawsze zwraca hardcoded odpowiedź (brak integracji z zewn. API). Propozycja: Open-Meteo (darmowe, bez klucza).
- **Crony używają UTC** zamiast `Europe/Warsaw` — ciche godziny mogą być przesunięte o 1–2 h.
- **Vercel Blob i wideo** — darmowy tier (~500 MB/mies.) szybko się zapełnia; nagrywaj krótkie klipy (10–20 s).
- **Brak `BLOB_READ_WRITE_TOKEN`** → zdjęcia wracają jako `dataUrl` (niepersystentne między reloadami).
- Aplikacja jest w całości po polsku i zaprojektowana pod jedno konkretne gospodarstwo domowe (nazwy profili, kategorie zadań) — dostosowanie do innej rodziny wymaga edycji danych startowych w kodzie (`src/constants/initialData.ts`).
- Część funkcji z sekcji „Pomieszczenia" (rozbudowana oś czasu porównawcza, roczna kronika w PDF, timelapse) jest na etapie fundamentu technicznego i może się jeszcze rozwijać.

---

## 20. Decyzje produktowe (po audycie kodu)

Zapisane w `TODO-finalizacja.md` po audycie rzeczywistego kodu:

1. **Strefy wizualne — dynamiczne.** Brak sztywnej listy 7 pomieszczeń w kodzie. Użytkownik tworzy strefy (`VisualZone`) sam przez UI (`addVisualZone`). Aplikacja startuje z `visualZones: []`.
2. **Plan tygodniowy — nadpisanie per tydzień.** Realny `AdminPlanView` nadpisuje przypisanie `taskId → profileId` dla konkretnego tygodnia (`WeeklyPlan.assignments`). Siatka „osoby × dni" nie istnieje w kodzie i nie jest planowana.
3. **Historia wersji Walk-In — w modalu + panelu admina.** `SpaceVersion[]` dostępne per strefa w `AdminPlanView` (sekcja „Historia wersji") i w `VisualZoneModal`. Oba widoki obsługują przywracanie starszej wersji (`rollback-version`).
4. **Pogoda — demo (hardcoded).** Propozycja do wdrożenia: Open-Meteo (darmowe, bez klucza API) — wymaga współrzędnych geograficznych domu.
5. **Google Calendar — tylko .ics.** Jedyna integracja to eksport/`import .ics` (`/api/export?action=calendar.ics`). Brak OAuth, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` nie istnieją w `.env.example`.

---

## 21. Wdrożenie i konfiguracja

### Vercel Hobby
- 11/12 serverless functions używane (patrz sekcja 2).
- `vercel.json`: framework `vite`, build `vite build`, output `dist/`, crony (sekcja 15).

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
- `tsc --noEmit` → 0 błędów.
- `vite build` → build OK (2537 modułów).
- `api/health` → `{ status: 'ok', aiReady: bool, database: 'postgresql/neon' | 'local-storage/memory' }`.
