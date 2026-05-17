export const CARD_COLORS = [
  'bg-gradient-to-br from-amber-100 to-orange-100',
  'bg-gradient-to-br from-blue-100 to-cyan-100',
  'bg-gradient-to-br from-green-100 to-emerald-100',
  'bg-gradient-to-br from-pink-100 to-rose-100',
  'bg-gradient-to-br from-purple-100 to-violet-100',
  'bg-gradient-to-br from-teal-100 to-green-100',
  'bg-gradient-to-br from-yellow-100 to-amber-100',
  'bg-gradient-to-br from-indigo-100 to-blue-100',
];

export const MUTED_COLORS = [
  'bg-amber-50',
  'bg-blue-50',
  'bg-green-50',
  'bg-pink-50',
  'bg-purple-50',
  'bg-teal-50',
  'bg-yellow-50',
  'bg-indigo-50',
];

export function getCardColor(index: number): string {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export function getMutedColor(index: number): string {
  return MUTED_COLORS[index % MUTED_COLORS.length];
}
