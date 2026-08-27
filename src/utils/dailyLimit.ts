// 每日动漫图生成次数限制(localStorage 计数,跨天重置)
const KEY = 'pixel-bead:cartoon-limit';

export const CARTOON_DAILY_LIMIT = 100;

interface LimitState {
  date: string;
  count: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCartoonCountToday(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const state = JSON.parse(raw) as LimitState;
    if (state.date !== getToday()) return 0;
    return state.count;
  } catch {
    return 0;
  }
}

export function getCartoonRemainingToday(): number {
  return Math.max(0, CARTOON_DAILY_LIMIT - getCartoonCountToday());
}

export function incrementCartoonCount(): number {
  const today = getToday();
  const current = getCartoonCountToday();
  const newCount = current + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today, count: newCount }));
  } catch {
    // localStorage 不可用时静默
  }
  return newCount;
}
