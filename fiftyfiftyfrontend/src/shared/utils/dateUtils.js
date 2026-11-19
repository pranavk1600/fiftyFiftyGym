/**
 * Calculates membership end date from join date and duration in days.
 * Consistent across frontend and backend, accurately handles leap years and month ends.
 */
export const calculateMembershipEndDate = (joinDateStr, durationDays) => {
  if (!joinDateStr || durationDays == null || isNaN(durationDays)) return '';
  const parts = String(joinDateStr).split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Number(durationDays));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
