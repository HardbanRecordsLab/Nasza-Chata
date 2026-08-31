/** One source of truth for expense categories — shared by the manual form,
 *  the budget tab and the receipt scanner. */
export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'Spożywcze & Dom', label: '🍞 Spożywcze & Dom' },
  { value: 'Opał & Drewno', label: '🪵 Opał & Drewno' },
  { value: 'Ogród & Rośliny', label: '🌿 Ogród & Rośliny' },
  { value: 'Narzędzia & Dom', label: '🔧 Remont & Naprawy' },
  { value: 'Inne', label: '📦 Inne' },
];

export const normalizeExpenseCategory = (raw: unknown): string => {
  const known = EXPENSE_CATEGORIES.map(c => c.value);
  if (typeof raw === 'string' && known.includes(raw)) return raw;
  const low = String(raw || '').toLowerCase();
  if (/opał|drewn|węgiel|pellet/.test(low)) return 'Opał & Drewno';
  if (/ogród|ogrod|rośl|rosl|kwiat|nasion|ziemi/.test(low)) return 'Ogród & Rośliny';
  if (/narzędz|narzedz|remont|budowl|farb|wkręt|castorama|leroy/.test(low)) return 'Narzędzia & Dom';
  if (/spożyw|spozyw|jedzen|market|biedronka|lidl|dom|chemi/.test(low)) return 'Spożywcze & Dom';
  return 'Inne';
};
