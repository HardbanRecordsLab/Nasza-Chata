# TODO — Finalizacja „Nasza Chata"

Lista robocza do odhaczania, 1:1 z `prompt-finalizacja-i-wizualizacja.md`, ale
rozbita na mniejsze, konkretne kroki z odniesieniem do plików. Kolejność =
kolejność wykonania. Pozycje oznaczone **[BLOKUJE]** wstrzymują sensowność
kolejnych — nie przeskakuj ich.

---

## 🔴 PRIORYTET 0 — Krytyczne poprawki

### 0.1 Skaner paragonów
- [ ] Otworzyć `src/components/modals/ScanReceiptModal.tsx`, zlokalizować `processReceipt()`
- [ ] Usunąć blok `setTimeout` + `Math.random()`
- [ ] Podpiąć `fetch('/api/ai/scan-handwritten', { method: 'POST', body: JSON.stringify({ imageBase64: dataUrl, mode: 'receipt' }) })`
- [ ] Dodać realny stan `isProcessing` powiązany z odpowiedzią fetch (nie sztywny `2500ms`)
- [ ] Zmapować odpowiedź API (`amount`, `note`, `date`, `category`) na istniejący `scanResult`
- [ ] Obsłużyć błąd sieci/AI (toast błędu zamiast cichego zawieszenia)
- [ ] Test manualny: zrobić zdjęcie prawdziwego paragonu, sprawdzić czy kwota się zgadza
- [ ] Test: brak `GEMINI_API_KEY` → sprawdzić czy fallback demo z backendu nie wygląda jak błąd

### 0.2 Kalendarz na dashboardzie **[BLOKUJE nic, ale zrób przed 0.4]**
- [ ] Zdecydować: mini-kalendarz jako osobny komponent (`MiniCalendarWidget.tsx`) czy inline w `TodayView.tsx`
- [ ] Zaimportować `getOccurrencesForDate` i `calculateCleanlinessScore` z `recurrenceEngine.ts` (nie duplikować logiki)
- [ ] Zbudować siatkę miesiąca z paskiem/kropką postępu per dzień
- [ ] Osadzić komponent w `TodayView.tsx` pod istniejącymi sekcjami (nie zamiast nich)
- [ ] Podłączyć klik w dzień → modal dnia LUB przejście do zakładki `calendar` z ustawioną datą (wybrać jedno)
- [ ] Sprawdzić, czy istniejący „Calendar Summary Widget" (kafelek-skrót) nadal ma sens obok pełnego mini-kalendarza — jeśli dubluje, usunąć kafelek
- [ ] Zostawić pełną zakładkę „Kalendarz" w `BottomNav` bez zmian funkcjonalnych
- [ ] Test na wąskim ekranie (mobile) — siatka miesiąca nie może się rozjeżdżać

### 0.3 Automatyczne powiadomienia
- [ ] Dodać `crons` do `vercel.json`
- [ ] Utworzyć `api/cron/daily-briefing.ts`
- [ ] Utworzyć `api/cron/wood-supply-check.ts`
- [ ] Zaimportować i wywołać `sendWebPushNotification` z `server/pushService.ts` w obu plikach
- [ ] Uwzględnić strefę czasową `Europe/Warsaw` (przeliczenie na UTC w `schedule`, pamiętać o zmianie czasu)
- [ ] Sprawdzić/dodać ustawienie „ciche godziny" per profil w `NotificationSettingsModal.tsx` (jeśli nie istnieje — dodać prosty toggle + zapis w profilu)
- [ ] Zabezpieczyć endpointy crona przed wywołaniem z zewnątrz (Vercel Cron header/secret, nie zostawiać otwartego publicznego URL bez żadnej weryfikacji)
- [ ] Test: `vercel dev` + ręczne wywołanie endpointu crona, sprawdzić czy push faktycznie dochodzi na telefon

### 0.4 Porządki techniczne
- [ ] Zmapować, które endpointy w `server.ts` i `api/*.ts` się dublują
- [ ] Wydzielić wspólną logikę biznesową (np. do `server/handlers/*.ts`) i importować z obu miejsc
- [ ] Zdecydować los pola `RoomTag.taskId`: usunąć (jeśli nie robimy 1.5) albo zostawić do podłączenia w Priorytecie 1
- [ ] Sprawdzić `tsc --noEmit` (`npm run lint`) — zero błędów typów po zmianach 0.1–0.3

---

## 🟡 PRIORYTET 1 — Wizualizacja pomieszczeń i ogrodu

### 1.1 Model danych **[BLOKUJE całą resztę Priorytetu 1]**
- [ ] Dodać typy `VisualZone` i `VisualEntry` do `src/types.ts`
- [ ] Zdecydować nazewnictwo pola w `DatabaseSchema` (`server/db.ts`) — np. `visualZones`
- [ ] Zaktualizować `DatabaseSchema` interface w `server/db.ts`
- [ ] Zaktualizować `saveDbState()` / `getDbState()` o nowe pole (wzorem istniejących pól typu `roomSnapshots`)
- [ ] Napisać funkcję migracji: istniejące `RoomSnapshot[]` → `VisualZone[]` z jednym `VisualEntry` w środku
- [ ] Uruchomić migrację jednorazowo na realnych danych rodziny (nie zgubić zdjęć, które już wgrali)
- [ ] Dodać metody w `ChataContext.tsx`: `addVisualEntry`, `deleteVisualEntry`, `updateVisualZone` (wzorem istniejących `addRoomSnapshot`/`updateRoomSnapshot`)
- [ ] Test: odświeżenie appki po migracji nie gubi żadnego wcześniej dodanego zdjęcia pokoju

### 1.2 Prowadzone zdjęcia (capture flow)
- [ ] Dodać pole `captureAngles` do formularza tworzenia/edycji strefy
- [ ] Zaproponować domyślne kąty wg `zoneType` (pokój vs ogród) przy tworzeniu nowej strefy
- [ ] Zbudować krokowy UI: „Zrób zdjęcie: [kąt] (n/total)" z przyciskiem aparatu
- [ ] Podgląd miniatury po każdym zdjęciu + przycisk „Powtórz ujęcie"
- [ ] Przycisk „Pomiń pozostałe kąty / dodaj tylko to jedno zdjęcie"
- [ ] Zapis wszystkich zdjęć z sesji jako osobne `VisualEntry` z tym samym `capturedAt` i różnymi `angleLabel`
- [ ] Test na telefonie: cały flow od „+ Dodaj wpis" do zapisu, 3 kąty pod rząd

### 1.3 Wideo
- [ ] Dodać przełącznik trybu Zdjęcie/Wideo w modalu dodawania wpisu
- [ ] Zaimplementować nagrywanie przez `MediaRecorder` (`getUserMedia` już używane gdzie indziej w appce — wzorować się na istniejącym kodzie kamery)
- [ ] Licznik czasu na ekranie + twardy limit 20–30s + auto-stop
- [ ] Fallback `<input type="file" accept="video/*" capture="environment">` dla urządzeń bez `MediaRecorder`
- [ ] Generowanie miniaturki z klatki wideo przez `<canvas>` po nagraniu
- [ ] Kompresja/limit rozdzielczości przed uploadem
- [ ] Upload do Vercel Blob pod prefiksem `visual-zones/{zoneId}/...` (sprawdzić istniejący endpoint `/api/upload`, czy obsłuży pliki wideo, czy trzeba rozszerzyć)
- [ ] Odtwarzanie wideo w galerii (natywny `<video controls>`, poster = `thumbnailUrl`)
- [ ] Test: nagranie 30s wideo na wolnym Wi-Fi w domu — sprawdzić realny czas uploadu

### 1.4 Oś czasu i porównanie
- [ ] Rozbudować `VirtualRoomModal.tsx` (lub nowy komponent) o poziomą listę miniatur `entries` z datami
- [ ] Kliknięcie dwóch wpisów → widok porównania side-by-side
- [ ] (Opcjonalnie, nie MVP) slider „przeciągnij, by porównać" dla dwóch zdjęć tego samego `angleLabel`
- [ ] Domyślne porównanie przy wejściu w strefę: najnowszy vs. sprzed ~30 dni (jeśli istnieje)
- [ ] Filtr osi czasu po `angleLabel`
- [ ] Obsłużyć przypadek: strefa ma tylko 1 wpis (brak czego porównywać) — czytelny stan pusty, nie błąd

### 1.5 Hotspoty ↔ zadania
- [ ] Dodać selector zadania przy tworzeniu pinezki (opcjonalny)
- [ ] Zapisać wybrane `taskId` w `RoomTag`
- [ ] Dynamiczne kolorowanie pinezki na podstawie `calculateCleanlinessScore()` dla powiązanego zadania
- [ ] Kliknięcie pinezki z `taskId` → mini-podgląd statusu (ostatnie wykonanie, kto) + link do zadania
- [ ] Test: zmiana statusu zadania (odhaczenie) odświeża kolor pinezki bez przeładowania strony

### 1.6 Ogród jako osobna sekcja
- [ ] Dodać filtr/zakładki „Pomieszczenia" / „Ogród" w `HouseOverviewView.tsx` (sekcja `rooms`)
- [ ] Rozszerzyć domyślne strefy ogrodowe: trawnik, grządki/szklarnia, drewutnia, taras
- [ ] W sekcji ogrodowej domyślnie otwierać widok osi czasu zamiast pojedynczego zdjęcia
- [ ] Powiązać strefy ogrodowe z istniejącymi zadaniami sezonowymi (koszenie, przygotowanie ogródka) — spójność z 1.5

### 1.7 Roczna kronika
- [ ] Zaprojektować widok „strefa × miesiąc" (siatka/kalendarz roku) w zakładce Podsumowanie
- [ ] Logika wyboru „wpisu miesiąca" — automatyczna (najbliższy środka miesiąca) + możliwość ręcznego oznaczenia ulubionego
- [ ] Endpoint `/api/export/yearly-chronicle` (wzorem `backup.json.ts`)
- [ ] Eksport do PDF/obrazka do pobrania
- [ ] (Rozszerzenie, jeśli starczy czasu) generowanie prostego timelapse z sekwencji zdjęć przez `canvas` + `MediaRecorder`

### 1.8 Przypomnienie o aktualizacji
- [ ] Dodać opcjonalne zadanie cykliczne „Zaktualizuj zdjęcia: [strefa]" (`monthly`) przy tworzeniu strefy
- [ ] Wykorzystać istniejący silnik cykliczności — bez nowego mechanizmu przypomnień

---

## ⚪ Zaległe, niesklasyfikowane (z wcześniejszych rozmów, nie zapomnieć)

- [ ] **Nazwa aplikacji** — wciąż robocza „Nasza Chata" w całym kodzie/dokumentach. Jeśli ma się zmienić, zrobić to PRZED Priorytetem 1 (żeby nie podmieniać nazw w nowo dopisanym kodzie drugi raz)
- [ ] Zdecydować ostatecznie hosting bazy (Neon już działa w kodzie — potwierdzić, że to jest wersja, którą wdrażacie, a nie równoległy wątek z Firebase z wcześniejszego audytu AI Studio)
- [ ] Sprawdzić limity darmowego tieru Vercel Blob Storage pod kątem wideo (pliki wideo są znacznie cięższe niż zdjęcia — to może wymagać płatnego planu szybciej niż reszta appki)
- [ ] Ustawić prawdziwe zmienne środowiskowe w Vercel (`DATABASE_URL`, `GEMINI_API_KEY`, `VAPID_*`) — sprawdzić czy to już zrobione, czy nadal czeka

---

## Legenda priorytetów przy pracy

1. 🔴 Priorytet 0 w całości — to krótkie, izolowane poprawki
2. 🟡 1.1 (model danych) — twardy fundament, nic dalej nie ruszać bez tego
3. 🟡 1.2 → 1.3 → 1.4 — rdzeń nowej funkcji, w tej kolejności
4. 🟡 1.5 → 1.6 — integracja z resztą appki
5. 🟡 1.7 → 1.8 — miłe dodatki, zostawić na koniec
6. ⚪ Zaległe — rozwiać przed startem, nie w trakcie
