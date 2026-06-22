/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Habit, DayCell } from "./types";

/**
 * Safely format a Date object as YYYY-MM-DD in the user's local timezone.
 */
export function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates days between two YYYY-MM-DD date strings.
 */
export function daysBetween(aStr: string, bStr: string): number {
  const a = new Date(aStr + "T12:00:00");
  const b = new Date(bStr + "T12:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/**
 * Calculates the exact current and highest (max) streak from a habit's history,
 * self-healing dynamically if missed days are crossed or filled.
 */
export function computeStreak(history: string[], todayStr: string): { current: number; max: number } {
  if (history.length === 0) return { current: 0, max: 0 };

  const sortedUnique = Array.from(new Set(history)).sort(); // Ascending temporal sort

  // Max Streak Sweep
  let max = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedUnique) {
    const curDate = new Date(dateStr + "T12:00:00");
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diffTime = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / 86400000);

      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      } // same day is ignored in unique set
    }
    prevDate = curDate;
    if (tempStreak > max) {
      max = tempStreak;
    }
  }

  // Current Streak Calculation
  let current = 0;
  const todayDate = new Date(todayStr + "T12:00:00");

  const todayCompleted = history.includes(todayStr);
  const yesterdayDate = new Date(todayDate.getTime() - 86400000);
  const yesterdayStr = formatLocalDate(yesterdayDate);
  const yesterdayCompleted = history.includes(yesterdayStr);

  // If not completed today nor yesterday, active streak is 0
  if (!todayCompleted && !yesterdayCompleted) {
    current = 0;
  } else {
    // Step backwards iteratively starting with the latest logged day
    let tempDate = todayCompleted ? todayDate : yesterdayDate;
    while (true) {
      const tempStr = formatLocalDate(tempDate);
      if (history.includes(tempStr)) {
        current++;
        tempDate = new Date(tempDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  return { current, max: Math.max(max, current) };
}

/**
 * Generates cells for the last 14 days of history grid ending with today.
 */
export function generateLast14Days(history: string[], todayStr: string): DayCell[] {
  const cells: DayCell[] = [];
  const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
  const todayDate = new Date(todayStr + "T12:00:00");

  for (let i = 13; i >= 0; i--) {
    const targetDate = new Date(todayDate.getTime() - i * 86400000);
    const dateStr = formatLocalDate(targetDate);
    const dayLabel = DAYS_SHORT[targetDate.getDay()];
    const isCompleted = history.includes(dateStr);
    
    // Yesterday Relative Check
    const yesterdayDate = new Date(todayDate.getTime() - 86400000);
    const yesterdayStr = formatLocalDate(yesterdayDate);

    cells.push({
      dateStr,
      dayLabel,
      isCompleted,
      isToday: dateStr === todayStr,
      isYesterday: dateStr === yesterdayStr,
      isFuture: targetDate.getTime() > todayDate.getTime(),
    });
  }

  return cells;
}
