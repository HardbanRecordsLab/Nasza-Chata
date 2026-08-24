# Prompt dla AI Buildera: „Nasza Chata” — kalendarzowy planer domowych obowiązków

Skopiuj poniższy tekst (od `## KONTEKST` do końca) i wklej w całości do narzędzia typu
Bolt.new, v0.dev, Lovable, Cursor lub Claude Code jako pojedyncze zadanie startowe.
Dokument jest napisany tak, aby AI builder mógł od razu zaplanować architekturę
i zacząć generować kod bez dodatkowych pytań — ale jeśli będzie miał wątpliwości
co do drobnych decyzji projektowych, ma sam wybrać rozsądną opcję i kontynuować.

---

## KONTEKST

Zbuduj od zera profesjonalną aplikację webową (Next.js, App Router, TypeScript)
o nazwie **„Nasza Chata”** — kalendarzowy planer obowiązków domowych i wydatków
dla trzyosobowej rodziny mieszkającej w domu z ogrodem i piecem na drewno:
**Kamil** (mąż), **Ilona** (żona), **Olivia** (córka). Aplikacja ma wyglądać
i działać jak prawdziwy, dopracowany produkt (nie prototyp), gotowy do
codziennego użytku na telefonach całej rodziny, wdrożony na **Vercel**.

Filozofia domu: **brak sztywnego przypisania „to zadanie jest czyjeś"**.
Wszystkie obowiązki są wspólne — każdy może je wykonać i odhaczyć. Aplikacja
ma jedynie **zapisywać, kto faktycznie wykonał** dane zadanie (atrybucja przy
odhaczeniu), a nie narzucać z góry właściciela zadania. Wyjątkiem są zakupy,
gdzie zapisujemy, kto realnie kupował — to fakt, nie reguła.

---

## STACK TECHNOLOGICZNY (wymagany)

- **Next.js 14+ (App Router)** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** jako baza komponentów (przyciski, dialogi, selecty, toasty)
- **Baza danych**: Postgres (Vercel Postgres lub Neon) + **Prisma ORM**
- **Autoryzacja lekka**: brak pełnego logowania z hasłem — wybór profilu
  (Kamil / Ilona / Olivia) + opcjonalny 4-cyfrowy PIN per profil, zapisany
  w sesji (cookie). To ma być rodzinna appka, nie system korporacyjny.
- **date-fns** (+ `date-fns-tz`) do obsługi dat, tygodni ISO, miesięcy
- **PWA**: `next-pwa` lub ręczny `manifest.json` + service worker, żeby appkę
  dało się „zainstalować" na telefonie z ekranu głównego
- **Web Push** (`web-push` + Notification API) do prawdziwych powiadomień
  push na telefon — nie tylko powiadomień w przeglądarce przy otwartej karcie
- **Framer Motion** (lub czyste CSS) do subtelnych animacji ikon i przejść
- **Vercel Blob Storage** (lub kompatybilny S3) do przechowywania zdjęć/wideo
  „przed/po" dodawanych z aparatu telefonu
- Repozytorium gotowe do **jednokrokowego deployu na Vercel** (patrz sekcja
  „Deployment" na końcu)

---

## GŁÓWNA FUNKCJA: WIDOK KALENDARZA

To jest rdzeń aplikacji — **planer w formie kalendarza**, nie tylko lista zadań.

1. **Widok miesięczny (domyślny)** — klasyczna siatka kalendarza (pon–niedz),
   na każdym dniu miniaturowe ikonki zaplanowanych na ten dzień obowiązków
   (max 3–4 widoczne + licznik „+N więcej"), kropka/pasek koloru pokazujący
   stopień ukończenia dnia (np. czerwony = nic nie zrobione, bursztynowy =
   częściowo, zielony = wszystko zrobione).
2. **Widok tygodniowy** — 7 kolumn, każda z pełną listą zadań danego dnia,
   wygodny do przewijania na telefonie (swipe między tygodniami).
3. **Widok dnia** — pełna lista zadań na wybrany dzień z możliwością odhaczenia.
4. Kliknięcie w dowolny dzień w widoku miesięcznym przenosi do widoku dnia.
5. Nawigacja: strzałki „poprzedni / następny" + przycisk „Dziś" + swipe gestures
   na mobile.
6. Wydarzenia w kalendarzu są **generowane automatycznie** z reguł
   cykliczności zadań (patrz niżej) — użytkownik nie klika ręcznie dat, tylko
   definiuje regułę raz, a kalendarz sam pokazuje wystąpienia.
7. Osobna, przypięta **zakładka „Dziś"** poza kalendarzem — szybki, uproszczony
   widok „co jest do zrobienia teraz" (to ma być ekran startowy aplikacji).

---

## SILNIK CYKLICZNOŚCI ZADAŃ

Zaimplementuj elastyczny system reguł powtarzalności, obsługujący:

| Typ | Opis | Przykład zadania |
|---|---|---|
| `daily` | codziennie | Mycie naczyń — na bieżąco |
| `every_other_day` | co drugi dzień | Sprzątanie kuchni i mycie podłogi |
| `twice_weekly` | minimum 1–2× w tygodniu (system śledzi dwie „połówki" tygodnia: pon–śr i czw–niedz, z licznikiem `x/2`) | Odkurzanie, ścieranie kurzu, mycie podłóg w kuchni/łazience, podlewanie kwiatów |
| `weekly` | raz w tygodniu | Koszenie trawy, mycie ganku |
| `monthly` | raz w miesiącu | Zmiana pościeli, sprzątanie lodówki |
| `seasonal_months` | dodatkowy filtr nakładany na dowolną częstotliwość — zadanie aktywne tylko w podanym zakresie miesięcy (obsłuż też zakresy „zawijające się" przez Nowy Rok, np. paź–mar) | patrz tabela niżej |

**Domyślny zestaw zadań do zaimplementowania (seed danych):**

- Cięcie drewna do pieca — co tydzień, sezon: czerwiec–wrzesień
- Przynoszenie drewna do kotłowni — codziennie, sezon: październik–marzec
- Czyszczenie pieca — co tydzień, sezon: wrzesień–kwiecień
- Koszenie trawy — co tydzień, sezon: kwiecień–październik
- Przygotowanie ogródka — co miesiąc, sezon: marzec–maj
- Podlewanie kwiatów — 1–2× w tygodniu, cały rok
- Zrobić zakupy — 1–2× w tygodniu, cały rok (osobne zadanie w kalendarzu,
  niezależne od logu wydatków w zakładce Zakupy)
- Odkurzanie sypialni i przedpokoju — 1–2× w tygodniu
- Odkurzanie pokoju Olivii — 1–2× w tygodniu
- Odkurzanie i mycie schodów — 1–2× w tygodniu
- Sprzątanie kuchni i mycie podłogi — 1–2× w tygodniu
- Mycie podłogi w łazience — 1–2× w tygodniu
- Mycie podłogi na ganku — co tydzień
- Ścieranie kurzu na górze — 1–2× w tygodniu
- Sprzątanie pokoju Olivii — 1–2× w tygodniu
- Sprzątanie lodówki — co miesiąc
- Zmiana pościeli — co miesiąc
- Mycie naczyń — codziennie, na bieżąco

Zadanie sezonowe, które nie jest aktywne w bieżącym miesiącu, **nie pojawia się**
w kalendarzu jako wystąpienie, ale jest widoczne w osobnej, zwiniętej sekcji
„Sezonowe — wróci w [miesiące]" w widoku „Dziś" i w ustawieniach zadań.

Użytkownik musi mieć możliwość **dodawania własnych zadań** przez formularz:
nazwa, ikona/kategoria, częstotliwość (z listy powyżej), opcjonalny zakres
sezonowy (od–do miesiąca).

---

## ATRYBUCJA WYKONANIA (nie przypisanie z góry)

- Każde wystąpienie zadania w kalendarzu ma przycisk „Odhacz".
- Przed odhaczeniem aplikacja pyta / używa aktualnie wybranego profilu
  (przełącznik „Kto teraz?" widoczny w headerze), kto wykonuje czynność, i
  zapisuje to przy zaznaczeniu (`completedBy`, `completedAt`).
- Po wykonaniu na karcie/wydarzeniu pojawia się mały, kolorowy tag z imieniem
  osoby, która to zrobiła (kolor przypisany na stałe do osoby: Kamil,
  Ilona, Olivia — ale kolor identyfikuje osobę, nie „właściciela zadania").
- Dodaj prosty **panel statystyk** (np. zakładka „Podsumowanie"): ile zadań
  wykonała każda osoba w tym tygodniu/miesiącu — czysto informacyjnie, bez
  rankingu czy oceniania.

---

## DOWÓD WYKONANIA — ZDJĘCIE / WIDEO „PRZED" I „PO"

Dla każdego wystąpienia zadania w kalendarzu użytkownik ma opcję (nieobowiązkową,
ale zawsze dostępną) udokumentowania wykonania za pomocą aparatu telefonu:

- Przy zadaniu dwa oddzielne przyciski: **„Dodaj dowód: PRZED"** i
  **„Dodaj dowód: PO"** — każdy otwiera natywny aparat telefonu (nie tylko
  wybór pliku z galerii, choć to też ma działać jako fallback) i pozwala
  zrobić **zdjęcie lub krótkie wideo** (limit np. 15–20 sekund dla wideo).
- Technicznie: input `<input type="file" accept="image/*,video/*" capture="environment">`
  jako baza działająca wszędzie, opcjonalnie rozszerzone o `MediaDevices.getUserMedia`
  dla bardziej dopracowanego podglądu na żywo w przeglądarce.
- Pliki przechowuj w **Vercel Blob Storage** (lub S3-kompatybilnym bucketcie),
  zapisując tylko URL w bazie danych, nie sam plik.
- Po dodaniu obu dowodów karta zadania pokazuje miniaturki **przed/po obok
  siebie** (prosty slider „przeciągnij, by porównać" to miły dodatek, ale
  nie wymóg MVP — wystarczą dwie miniatury side-by-side z podpisem daty i
  osoby, która dodała dowód).
- Historia dowodów dostępna też w zakładce „Podsumowanie" jako galeria —
  przydatne np. do pokazania postępu koszenia trawy czy sprzątania ogródka
  w czasie.
- Dowody są opcjonalne — zadanie można odhaczyć bez zdjęcia; przyciski dodania
  dowodu to osobna, dodatkowa akcja, nie blokująca odhaczenia.
- Rozszerz model danych `TaskCompletion` o pola: `proofBeforeUrl String?`,
  `proofAfterUrl String?`, `proofType String?` (`photo` | `video`),
  `proofAddedById String?` (relacja do `Profile`).
- Uwzględnij limit rozmiaru pliku (np. kompresja/resize zdjęcia po stronie
  klienta przed uploadem, żeby nie zapychać transferu na słabszym Wi-Fi w domu).

## ZAKUPY I WYDATKI

- **Zakupy jako zadanie cykliczne, nie tylko log wydatków**: dodaj do domyślnego
  zestawu zadań pozycję „Zrobić zakupy" (kategoria `shopping`, ikona koszyka,
  częstotliwość `twice_weekly`) — to osobne zadanie w kalendarzu/na liście
  „Dziś", odhaczane tak samo jak inne obowiązki, niezależne od logu wydatków
  poniżej.
- **Wspólna lista „do kupienia"** (checklista czasu rzeczywistego, osobna od
  historii wydatków) — dowolny domownik dopisuje pozycję z telefonu w dowolnym
  momencie (np. „kończy się mleko"), pozostali widzą aktualizację od razu.
  Pozycje odznacza się w trakcie zakupów; odznaczone znikają z checklisty po
  zamknięciu zakupów, ale trafiają do sugestii przy kolejnym dodawaniu wydatku.
- **Kalkulator zakupowy** — tryb aktywny „W trakcie zakupów": użytkownik dodaje
  pozycje z ceną w czasie rzeczywistym (stojąc w sklepie), aplikacja pokazuje
  bieżącą sumę w koszyku na dużym, czytelnym liczniku, opcjonalnie z porównaniem
  do ustawionego limitu/budżetu na te zakupy (pasek postępu zmieniający kolor
  przy zbliżaniu się do limitu). Po zakończeniu zakupów jedno kliknięcie
  „Zakończ i zapisz" konwertuje zawartość kalkulatora w pojedynczy wpis (lub
  kilka wpisów per kategoria) w historii wydatków poniżej — bez ręcznego
  przepisywania kwoty.
- Osobna zakładka „Zakupy": formularz dodania wydatku (kwota w PLN, notatka
  co kupiono, kto kupował, data — domyślnie dziś).
- Lista historii zakupów, najnowsze na górze, z możliwością usunięcia wpisu.
- Automatyczne podsumowania: **dziś / ten tydzień / ten miesiąc**, wyświetlone
  jako karty z sumą w PLN na górze zakładki.
- Wykres słupkowy wydatków dziennych z ostatnich 14 dni (biblioteka: Recharts).

---

## DODATKOWE FUNKCJE (do wdrożenia razem z resztą)

- **Wskaźnik „zabrudzenia" pomieszczenia** — inspirowane aplikacją Tody:
  zamiast sztywnego rytmu dla części zadań porządkowych, opcjonalny tryb
  wizualny pokazujący kolorowym paskiem/kropką, ile czasu minęło od ostatniego
  wykonania danego zadania (zielony → żółty → czerwony w miarę upływu czasu),
  niezależnie od tego czy „termin" formalnie minął.
- **Dodawanie zadań głosem** — przycisk mikrofonu przy „+ Dodaj obowiązek",
  wykorzystujący Web Speech API (`SpeechRecognition`) do wypełnienia pola nazwy
  zadania głosem, bez pisania na telefonie.
- **Skan odręcznej kartki obowiązków** — możliwość zrobienia zdjęcia papierowej
  listy/kartki i automatycznego rozpoznania pozycji (OCR, np. przez model
  wizyjny wywołany z backendu) jako propozycji nowych zadań do zatwierdzenia.
- **Eksport kalendarza obowiązków do pliku `.ics`** — subskrypcja/pobranie,
  żeby zadania były widoczne obok reszty życia rodziny w Google Calendar/Apple
  Calendar.
- **Rejestr sprzętu i dokumentów domu** — osobna, prosta sekcja: piec, kosiarka,
  odkurzacz itd. z datami zakupu, gwarancji i najbliższych przeglądów/serwisów;
  zbliżający się termin pojawia się jako zwykłe zadanie w kalendarzu.
- **Ciche godziny powiadomień + jedno dzienne podsumowanie** zamiast wielu
  osobnych powiadomień naraz — ustawienie per profil (np. „nie przeszkadzaj
  22:00–7:00", „wyślij jedno zbiorcze przypomnienie o 18:00").
- **Wspólny notatnik przy zadaniu** — krótkie pole tekstowe/komentarz dołączony
  do konkretnego zadania lub jego wystąpienia (np. „kosiarka nie odpala, trzeba
  dolać oleju"), widoczny dla całej rodziny.
- **Widget na ekran główny telefonu** (PWA/`display: standalone` +, jeśli
  platforma pozwala, Web App Widget) pokazujący listę „Dziś" bez otwierania
  aplikacji.
- **Eksport/kopia zapasowa danych** — przycisk w ustawieniach generujący plik
  CSV/JSON z pełną historią zadań i wydatków, do pobrania lokalnie.
- **Tryb gościa/serwisanta** — tymczasowy, ograniczony link (bez logowania
  profilem) pokazujący tylko jedno wybrane zadanie/termin — przydatny np. do
  pokazania terminu kominiarzowi lub serwisantowi pieca bez udostępniania
  całej aplikacji rodzinnej.

---

## FUNKCJE WYRÓŻNIAJĄCE (AI i automatyzacja — priorytet po MVP)

Te funkcje nie są niezbędne do pierwszego działającego wdrożenia, ale mają być
zaplanowane w architekturze od początku (np. osobna warstwa AI/automatyzacji
wywoływana przez API routes w Next.js), żeby dało się je dołożyć bez przebudowy:

- **AI-asystent domowy (czat)** — pole zapytania w appce ("kiedy ostatnio
  czyściliśmy piec?", "ile wydaliśmy na zakupy w lipcu?"), odpowiadające na
  podstawie historii `TaskCompletion`/`Expense` w bazie (RAG na własnych
  danych, wywołanie modelu językowego przez API z kontekstem z bazy).
- **Inteligentne przesuwanie zadań wg pogody** — integracja z darmowym API
  pogodowym (np. Open-Meteo); appka proponuje przesunięcie zadań wrażliwych
  na pogodę (koszenie trawy, mycie ganku) i pokazuje sugestię jako baner
  „Jutro deszcz — przesunąć koszenie na czwartek?" z jednym kliknięciem
  akceptacji.
- **Predykcja zapasu drewna** — na podstawie częstotliwości i historii zadania
  „Przynoszenie drewna do kotłowni" prosty licznik/estymacja „zapasu starczy
  na ok. X dni" z ostrzeżeniem przy niskim stanie (wymaga jednorazowego
  wprowadzenia przez użytkownika szacowanej ilości drewna po cięciu).
- **Automatyczna kronika „przed/po"** — zdjęcia z dowodów wykonania (patrz
  sekcja wyżej) automatycznie układają się w chronologiczną galerię/timelapse
  per kategoria zadania (np. postęp ogródka przez sezon) bez dodatkowej pracy
  użytkownika.
- **Tryb SOS/awaria** — wyraźny, czerwony przycisk „Coś się zepsuło" dostępny
  z każdego ekranu: tworzy priorytetowe zadanie z opisem, opcjonalnym zdjęciem
  i natychmiastowym powiadomieniem push do wszystkich profili (piec nie grzeje,
  przeciek itp.) — osobna kategoria, zawsze na górze listy „Dziś".
- **Interaktywny plan domu** — prosty, statyczny SVG rzutu pomieszczeń (parter/
  góra), klikalne obszary pokazujące zadania przypisane do danego pomieszczenia
  zamiast przeszukiwania płaskiej listy.
- **Cyfrowy stan pomieszczeń i ogródka (dokumentacja fotograficzna, nie skan 3D)**
  — dla każdego pomieszczenia i strefy ogródka (trawnik, grządki, kotłownia)
  aplikacja prowadzi użytkownika przez zrobienie kilku zdjęć z tych samych,
  podpowiadanych punktów/kątów (np. „zrób zdjęcie od drzwi", „zrób zdjęcie od
  okna"). Zestawy aktualizowane cyklicznie (np. raz w miesiącu) budują oś
  czasu wizualną per pomieszczenie/strefa — widać, jak dane miejsce wyglądało
  miesiąc/rok temu vs. teraz. Zdjęcia dopinają się do tego samego klikalnego
  obszaru na planie domu z punktu wyżej, więc kliknięcie w pokój pokazuje jego
  historię wizualną razem z listą zadań.
  **Uwaga techniczna:** prawdziwy geometryczny skan 3D z wymiarami (jak Apple
  RoomPlan) wymaga czujnika LiDAR i natywnej aplikacji iOS — Apple nie
  udostępnia tego przez przeglądarkę/PWA, a technologia w ogóle nie działa
  na zewnątrz (ogródek), bo opiera się na wykrywaniu ścian. To poza zakresem
  aplikacji webowej na Vercelu; jeśli w przyszłości powstanie towarzysząca
  natywna appka iOS, można ją podpiąć jako osobny moduł korzystający z tego
  samego backendu/bazy — zaprojektuj model danych (`RoomSnapshot`: pomieszczenie,
  data, lista URL-i zdjęć) tak, by dało się to rozszerzyć bez przebudowy.
- **Integracja z asystentem głosowym** (Google Home/Alexa przez odpowiednie
  Actions/Skills) — zapytanie głosowe o listę zadań na dziś.
- **Roczny „raport domu"** — wygenerowany na koniec roku PDF/strona z
  podsumowaniem: liczba wykonań każdego typu zadania, suma wydatków,
  wybrane zdjęcia „przed/po" — jako rodzaj rodzinnej pamiątki, nie tylko
  statystyki.
- **Sugerowana kolejność dnia** — prosty algorytm porządkujący listę zadań na
  „Dziś" w logicznej kolejności (np. zadania związane z piecem/drewnem przed
  porannymi porządkami) zamiast czysto chronologicznej/alfabetycznej listy.
- **Haki pod czujniki IoT (opcjonalnie, na przyszłość)** — zaprojektuj
  `TaskDefinition` tak, by dało się w przyszłości podpiąć trigger inny niż
  czas (np. webhook z czujnika wilgotności drewna lub poziomu w zbiorniku),
  bez zmiany całej architektury.

---

## POWIADOMIENIA

- Prawdziwe **web push** (Notification API + Service Worker), nie tylko
  przypomnienia działające przy otwartej karcie.
- Ustawienia per profil: o której godzinie przypominać o niewykonanych
  zadaniach dziennych (domyślnie 18:00) oraz przypomnienie w niedzielę wieczorem
  o niedokończonych zadaniach tygodniowych.
- Wymagana zgoda użytkownika (przycisk „Włącz powiadomienia" w ustawieniach
  profilu) — nigdy nie proś o nią automatycznie bez akcji użytkownika.

---

## IDENTYFIKACJA WIZUALNA I IKONY

- Styl: ciepły, „domowy/chatowy" klimat — drewno, zieleń, bursztyn — **unikaj**
  generycznego stylu „AI-owego" (kremowo-terakotowe tło, domyślne fiolety
  gradientowe). Zaproponuj spójną paletę: głęboka zieleń jodłowa, drewniany
  brąz, bursztynowy akcent, ciepły papierowy background.
- Czcionka nagłówkowa zaokrąglona/przyjazna (np. Fredoka), body — czytelny
  sans (np. Nunito), kwoty — monospace (np. JetBrains Mono).
- **Każde zadanie musi mieć własną, ręcznie zaprojektowaną ikonę w stylu
  szkicu liniowego (SVG, stroke-based)** — nie używaj generycznych ikon z
  gotowych bibliotek (Font Awesome, Material Icons) dla kategorii zadań;
  mają być unikalne dla tej appki (siekiera, płomień, źdźbła trawy, konewka,
  odkurzacz, mopa, kropla wody, miotła, ścierka, łóżko, lodówka, koszyk,
  naczynia itd. — zestaw dopasowany do listy zadań powyżej).
- **Część ikon ma mieć subtelną animację CSS/SVG w pętli** (np. migoczący
  płomień przy czyszczeniu pieca, kołyszące się źdźbła trawy przy koszeniu,
  kapiąca kropla przy łazience, kołyszący się koszyk przy zakupach) — ale
  nie każda ikona naraz w jednym widoku ma migać agresywnie; animacje mają
  być subtelne i nie rozpraszające przy dłuższym patrzeniu.
- Pełna responsywność mobile-first (główny use case: telefon), ale layout
  ma się też dobrze skalować na tablet/desktop (rodzina może zaglądać z laptopa).

---

## MODEL DANYCH (przykładowy szkielet Prisma)

```prisma
model Profile {
  id        String   @id @default(cuid())
  name      String   // "Kamil" | "Ilona" | "Olivia"
  colorHex  String
  pinHash   String?
  createdAt DateTime @default(now())
}

model TaskDefinition {
  id            String   @id @default(cuid())
  name          String
  category      String   // klucz kategorii -> ikona/kolor
  frequency     String   // daily | every_other_day | twice_weekly | weekly | monthly
  seasonStart   Int?     // 1-12
  seasonEnd     Int?     // 1-12
  isCustom      Boolean  @default(false)
  archivedAt    DateTime?
  createdAt     DateTime @default(now())
}

model TaskCompletion {
  id            String   @id @default(cuid())
  taskId        String
  task          TaskDefinition @relation(fields: [taskId], references: [id])
  periodKey     String   // np. "2026-08-24" / "2026-W34-A" / "2026-08"
  completedById String?
  completedBy   Profile? @relation(fields: [completedById], references: [id])
  completedAt   DateTime @default(now())

  @@unique([taskId, periodKey])
}

model Expense {
  id        String   @id @default(cuid())
  amount    Decimal
  note      String
  date      DateTime
  boughtById String?
  boughtBy  Profile? @relation(fields: [boughtById], references: [id])
  createdAt DateTime @default(now())
}
```

(Powyższe to punkt wyjścia — dostosuj wedle potrzeb, np. dodaj indeksy,
kaskadowe usuwanie, tabelę ustawień powiadomień per profil.)

---

## STRUKTURA WIDOKÓW / NAWIGACJA

Dolna nawigacja mobilna (4 zakładki):
1. **Dziś** (ekran startowy) — lista zadań na dziś + sekcja „zaległe"
2. **Kalendarz** — widoki miesiąc/tydzień/dzień opisane wyżej
3. **Zakupy** — wydatki i podsumowania
4. **Podsumowanie / Ustawienia** — statystyki wykonania, zarządzanie zadaniami
   (dodawanie/edycja/archiwizacja), ustawienia powiadomień, wybór profilu i PIN

---

## KRYTERIA AKCEPTACJI (MVP)

- [ ] Wybór/przełączanie profilu (Kamil/Ilona/Olivia) działa i zapamiętuje wybór
- [ ] Kalendarz miesięczny poprawnie generuje wystąpienia zadań ze wszystkich
      typów częstotliwości, respektując filtr sezonowy
- [ ] Odhaczenie zadania zapisuje `completedBy` i natychmiast aktualizuje UI
      oraz bazę danych (optymistyczne UI, potem sync)
- [ ] Zadania `twice_weekly` poprawnie liczą dwie połówki tygodnia i pokazują `x/2`
- [ ] Zakładka Zakupy poprawnie sumuje dziś/tydzień/miesiąc
- [ ] Dodawanie zdjęcia/wideo „przed" i „po" działa z poziomu aparatu telefonu
      (nie tylko z galerii) i pliki trwale zapisują się w Blob Storage
- [ ] Kalkulator zakupowy poprawnie liczy bieżącą sumę i zapisuje ją jako wpis
      wydatku po zakończeniu zakupów
- [ ] Powiadomienia push działają po wyrażeniu zgody (test na realnym telefonie)
- [ ] Aplikacja instaluje się jako PWA na Androidzie i iOS (ikona na ekranie głównym)
- [ ] Wszystkie ikony zadań to autorskie SVG w spójnym stylu, część animowana
- [ ] Pełna responsywność 320px–1440px, brak poziomego scrolla na mobile
- [ ] Aplikacja jest w języku polskim (UI, komunikaty, formatowanie dat i walut)

---

## DEPLOYMENT NA VERCEL

1. Zainicjuj repozytorium Git, skonfiguruj `vercel.json` (jeśli potrzebne)
   oraz zmienne środowiskowe w `.env.example`:
   - `DATABASE_URL` (Postgres — Vercel Postgres lub Neon)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY` (web push)
   - `SESSION_SECRET` (do podpisywania cookie sesji profilu)
   - `BLOB_READ_WRITE_TOKEN` (Vercel Blob Storage — zdjęcia/wideo dowodów)
2. Dodaj skrypt `prisma migrate deploy` do buildu (`postinstall` lub Vercel
   Build Command: `prisma generate && prisma migrate deploy && next build`).
3. Skonfiguruj Vercel Postgres/Neon jako dodatek projektu w Vercel Dashboard
   i podepnij zmienną `DATABASE_URL` automatycznie.
4. Upewnij się, że `manifest.json` i `service-worker` są serwowane poprawnie
   w produkcji (Next.js `public/` folder).
5. Po pierwszym deployu uruchom seed danych (domyślne 17 zadań + 3 profile)
   jednorazowym skryptem (`prisma db seed` lub endpoint `/api/seed` chroniony
   sekretem, wywołany ręcznie raz).
6. Dodaj krótki `README.md` z instrukcją: jak sklonować, jak podpiąć bazę,
   jak wygenerować klucze VAPID (`web-push generate-vapid-keys`), jak
   zdeployować jednym kliknięciem „Deploy to Vercel".

---

## UWAGA KOŃCOWA DLA AI BUILDERA

Priorytetyzuj w tej kolejności: (1) działający silnik cykliczności + kalendarz,
(2) odhaczanie z atrybucją, (3) zakupy (w tym kalkulator zakupowy i lista
„do kupienia"), (4) dowód wykonania (zdjęcie/wideo), (5) PWA + powiadomienia
push, (6) polish wizualny i animacje, (7) sekcja „FUNKCJE WYRÓŻNIAJĄCE" —
zaprojektuj pod nie architekturę (miejsca w bazie, osobne API routes), ale
zaimplementuj je jako ostatnie, po działającym w 100% rdzeniu aplikacji.
Jeśli czasu/kontekstu zabraknie na wszystko naraz, zostaw powiadomienia push,
PWA i całą sekcję funkcji wyróżniających na końcu — reszta ma działać w 100%
jako pełnoprawna aplikacja webowa nawet bez nich.
