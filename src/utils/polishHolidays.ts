/**
 * Polish public (state) and church holidays.
 * Date-aware: movable holidays (Easter-based) are computed per year.
 */

export interface PolishHoliday {
  name: string;
  date: string; // YYYY-MM-DD
  type: 'state' | 'church';
  emoji: string;
}

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Returns all Polish holidays for a given year.
 */
export function getPolishHolidays(year: number): PolishHoliday[] {
  const e = easterSunday(year);
  const holidays: PolishHoliday[] = [
    // === STATE HOLIDAYS (dni ustawowo wolne od pracy) ===
    { name: 'Nowy Rok', date: `${year}-01-01`, type: 'state', emoji: '🎆' },
    { name: 'Trzech Króli', date: `${year}-01-06`, type: 'state', emoji: '👑' },
    { name: 'Święto Pracy', date: `${year}-05-01`, type: 'state', emoji: '🚩' },
    { name: 'Święto Konstytucji 3 Maja', date: `${year}-05-03`, type: 'state', emoji: '🇵🇱' },
    { name: 'Wniebowzięcie NMP', date: `${year}-08-15`, type: 'state', emoji: '⛪' },
    { name: 'Wszystkich Świętych', date: `${year}-11-01`, type: 'state', emoji: '🕯️' },
    { name: 'Święto Niepodległości', date: `${year}-11-11`, type: 'state', emoji: '🇵🇱' },
    { name: 'Boże Narodzenie', date: `${year}-12-25`, type: 'state', emoji: '🎄' },
    { name: 'Drugi dzień Bożego Narodzenia', date: `${year}-12-26`, type: 'state', emoji: '🎁' },

    // === CHURCH HOLIDAYS (ruchome — zależne od Wielkanocy) ===
    { name: 'Wielki Piątek', date: fmt(addDays(e, -2)), type: 'church', emoji: '✝️' },
    { name: 'Wielka Sobota', date: fmt(addDays(e, -1)), type: 'church', emoji: '🌒' },
    { name: 'Wielkanoc', date: fmt(e), type: 'church', emoji: '🥚' },
    { name: 'Poniedziałek Wielkanocny (Śmigus-Dyngus)', date: fmt(addDays(e, 1)), type: 'church', emoji: '💧' },
    { name: 'Zesłanie Ducha Świętego (Zielone Świątki)', date: fmt(addDays(e, 49)), type: 'church', emoji: '🕊️' },
    { name: 'Boże Ciało', date: fmt(addDays(e, 60)), type: 'church', emoji: '⛪' },

    // === INNE ISTOTNE DATY (nie ustawowe, ale ważne) ===
    { name: 'Tłusty Czwartek', date: fmt(addDays(e, -52)), type: 'church', emoji: '🍩' },
    { name: 'Środa Popielcowa', date: fmt(addDays(e, -46)), type: 'church', emoji: ' ash' },
    { name: 'Niedziela Palmowa', date: fmt(addDays(e, -7)), type: 'church', emoji: '🌴' },
    { name: 'Zaduszki', date: `${year}-11-02`, type: 'church', emoji: '🕯️' },
    { name: 'Andrzejki', date: `${year}-11-29`, type: 'church', emoji: '🔮' },
    { name: 'Mikołajki', date: `${year}-12-06`, type: 'church', emoji: '🎅' },
    { name: 'Wigilia', date: `${year}-12-24`, type: 'state', emoji: '🐟' },
    { name: 'Sylwester', date: `${year}-12-31`, type: 'state', emoji: '🎆' },
    { name: 'Dzień Babci', date: `${year}-01-21`, type: 'state', emoji: '👵' },
    { name: 'Dzień Dziadka', date: `${year}-01-22`, type: 'state', emoji: '👴' },
    { name: 'Dzień Kobiet', date: `${year}-03-08`, type: 'state', emoji: '💐' },
    { name: 'Dzień Ojca', date: `${year}-06-23`, type: 'state', emoji: '👨' },
    { name: 'Dzień Matki', date: `${year}-05-26`, type: 'state', emoji: '👩' },
    { name: 'Dzień Dziecka', date: `${year}-06-01`, type: 'state', emoji: '🧒' },
  ];

  return holidays;
}

/**
 * Check if a given date string (YYYY-MM-DD) is a Polish holiday.
 */
export function isPolishHoliday(dateStr: string): PolishHoliday | null {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const holidays = getPolishHolidays(year);
  return holidays.find(h => h.date === dateStr) || null;
}

/**
 * Get all holidays for a month range (for calendar rendering).
 */
export function getHolidaysForMonth(year: number, month: number): PolishHoliday[] {
  return getPolishHolidays(year).filter(h => {
    const m = parseInt(h.date.substring(5, 7), 10);
    return m === month;
  });
}
