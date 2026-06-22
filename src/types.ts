/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Habit {
  id: string;
  name: string;
  streak: number;
  maxStreak: number;
  lastCompletedDate: string | null; // ISO string YYYY-MM-DD
  history: string[]; // List of YYYY-MM-DD dates completed
  createdAt: string; // ISO string YYYY-MM-DD
}

export interface DayCell {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // S, M, T, W, T, F, S
  isCompleted: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isFuture: boolean;
}

export interface HabitPreset {
  name: string;
  category: string;
  icon: string;
}
