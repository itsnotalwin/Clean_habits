/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Moon, 
  Sun, 
  Share2, 
  RotateCcw, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Habit } from './types';
import { 
  formatLocalDate, 
  computeStreak, 
  generateLast14Days 
} from './utils';

// Preloaded human-designed core habits (no emojis, neat typography)
const DEFAULT_HABITS = (today: string): Habit[] => {
  const yesterday = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - 86400000));
  const twoDaysAgo = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - (86400000 * 2)));
  const threeDaysAgo = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - (86400000 * 3)));
  const fourDaysAgo = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - (86400000 * 4)));
  const fiveDaysAgo = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - (86400000 * 5)));
  const twelveDaysAgo = formatLocalDate(new Date(new Date(today + "T12:00:00").getTime() - (86400000 * 12)));

  const list: Habit[] = [
    {
      id: "h_code",
      name: "Commit Code",
      streak: 5,
      maxStreak: 12,
      lastCompletedDate: yesterday,
      history: [yesterday, twoDaysAgo, threeDaysAgo, fourDaysAgo, fiveDaysAgo, twelveDaysAgo],
      createdAt: fiveDaysAgo,
    },
    {
      id: "h_meditate",
      name: "Morning Meditation",
      streak: 1,
      maxStreak: 3,
      lastCompletedDate: today,
      history: [today, threeDaysAgo, fourDaysAgo],
      createdAt: fourDaysAgo,
    }
  ];

  // Recompute streaks on startup
  list.forEach(h => {
    const s = computeStreak(h.history, today);
    h.streak = s.current;
    h.maxStreak = s.max;
  });

  return list;
};

// Available presets array (No emojis)
const PRESETS = [
  { name: "Morning Run", category: "Health" },
  { name: "Cold Shower", category: "Wellness" },
  { name: "Read Books", category: "Mind" },
  { name: "No Screen Time", category: "Focus" },
  { name: "Drink Water", category: "Hydration" },
  { name: "Stretch & Flex", category: "Fitness" }
];

export default function App() {
  const [todayStr, setTodayStr] = useState<string>(() => formatLocalDate(new Date()));
  const [habits, setHabits] = useState<Habit[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [inputValue, setInputValue] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // 1. Initial State Load
  useEffect(() => {
    const currentToday = formatLocalDate(new Date());
    setTodayStr(currentToday);

    // Dynamic light/dark sync
    const savedTheme = localStorage.getItem('chain_theme_v2') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }

    // Load habits from memory
    const savedHabitsRaw = localStorage.getItem('chain_habits_v3');
    if (savedHabitsRaw) {
      try {
        const loaded: Habit[] = JSON.parse(savedHabitsRaw);
        const reconciled = loaded.map(h => {
          const stats = computeStreak(h.history, currentToday);
          return {
            ...h,
            streak: stats.current,
            maxStreak: Math.max(h.maxStreak || 0, stats.max)
          };
        });
        setHabits(reconciled);
      } catch (err) {
        console.error("Parse issue, falling back to defaults", err);
        const defaults = DEFAULT_HABITS(currentToday);
        setHabits(defaults);
        localStorage.setItem('chain_habits_v3', JSON.stringify(defaults));
      }
    } else {
      const defaults = DEFAULT_HABITS(currentToday);
      setHabits(defaults);
      localStorage.setItem('chain_habits_v3', JSON.stringify(defaults));
    }
  }, []);

  // 2. Synchronize themes without showing toast messages
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('chain_theme_v2', nextTheme);
  };

  // 3. Midnight auto-boundary refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = formatLocalDate(new Date());
      if (nowStr !== todayStr) {
        setTodayStr(nowStr);
        setHabits(prev => {
          const next = prev.map(h => {
            const stats = computeStreak(h.history, nowStr);
            return {
              ...h,
              streak: stats.current,
              maxStreak: Math.max(h.maxStreak, stats.max)
            };
          });
          localStorage.setItem('chain_habits_v3', JSON.stringify(next));
          return next;
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [todayStr]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const saveHabitsToDisk = (updatedList: Habit[]) => {
    setHabits(updatedList);
    localStorage.setItem('chain_habits_v3', JSON.stringify(updatedList));
  };

  // 4. Create Habit action
  const handleAddHabit = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    if (habits.some(h => h.name.toLowerCase() === cleanName.toLowerCase())) {
      triggerToast(`"${cleanName}" has already been entered.`);
      return;
    }

    const newHabit: Habit = {
      id: 'h_' + Date.now() + Math.random().toString(36).substring(2, 7),
      name: cleanName,
      streak: 0,
      maxStreak: 0,
      lastCompletedDate: null,
      history: [],
      createdAt: todayStr
    };

    const newList = [newHabit, ...habits];
    saveHabitsToDisk(newList);
    setInputValue('');
    triggerToast(`Added ${cleanName}`);
  };

  // 5. Delete Habit action
  const handleDeleteHabit = (id: string, name: string) => {
    const filtered = habits.filter(h => h.id !== id);
    saveHabitsToDisk(filtered);
    triggerToast(`Removed ${name}`);
  };

  // 6. Direct button actions for today only (past days are read-only)
  const handleToggleToday = (habitId: string) => {
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;

      const isRecorded = h.history.includes(todayStr);
      let updatedHistory: string[];

      if (isRecorded) {
        updatedHistory = h.history.filter(d => d !== todayStr);
      } else {
        updatedHistory = [...h.history, todayStr];
      }

      const stats = computeStreak(updatedHistory, todayStr);

      if (!isRecorded) {
        setTimeout(() => {
          triggerToast(`Completed: ${h.name}`);
        }, 80);
      }

      return {
        ...h,
        history: updatedHistory,
        streak: stats.current,
        maxStreak: Math.max(h.maxStreak || 0, stats.current, stats.max),
        lastCompletedDate: updatedHistory.includes(todayStr) 
          ? todayStr 
          : (updatedHistory.length > 0 ? [...updatedHistory].sort().pop()! : null)
      };
    });

    saveHabitsToDisk(updated);
  };

  const handleAddPreset = (presetName: string) => {
    handleAddHabit(presetName);
  };

  const handleConfirmReset = () => {
    const defaults = DEFAULT_HABITS(todayStr);
    saveHabitsToDisk(defaults);
    setShowResetConfirm(false);
    triggerToast("All habits reset to original defaults");
  };

  const handleShareStats = () => {
    if (habits.length === 0) {
      triggerToast("No active stats recorded yet.");
      return;
    }

    const activeListText = habits.map(h => {
      return `- ${h.name}: ${h.streak}-day streak (Record: ${h.maxStreak})`;
    }).join("\n");

    const totalDones = habits.reduce((sum, h) => sum + h.history.length, 0);

    const report = `CHAIN Tracker Report\n\n` +
      `Active Chains:\n` +
      `${activeListText}\n\n` +
      `Total repetitions recorded: ${totalDones}.\n` +
      `Linked via direct client ledger storage.`;

    navigator.clipboard.writeText(report)
      .then(() => {
        triggerToast("Report copied to system clipboard");
      })
      .catch(() => {
        triggerToast("Failed to copy clipboard report.");
      });
  };

  // Statistics summaries
  const stats = useMemo(() => {
    const totalActive = habits.length;
    const totalCompletions = habits.reduce((acc, h) => acc + h.history.length, 0);
    const bestStreak = totalActive ? Math.max(...habits.map(h => h.streak)) : 0;
    
    const todaysCompletionsCount = habits.filter(h => h.history.includes(todayStr)).length;
    const todaysCompletionsRate = totalActive 
      ? Math.round((todaysCompletionsCount / totalActive) * 100) 
      : 0;

    return {
      totalActive,
      totalCompletions,
      bestStreak,
      todaysRate: totalActive ? `${todaysCompletionsRate}%` : "—"
    };
  }, [habits, todayStr]);

  const formattedReadableDate = useMemo(() => {
    const options: any = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  }, [todayStr]);

  return (
    <div className="min-h-screen px-4 pb-20 pt-4 md:pt-8 bg-[var(--bg)] text-[var(--text)] transition-all duration-300 antialiased font-sans flex flex-col items-center">
      
      {/* Centered clean notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 z-50 px-5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] text-xs shadow-md font-mono border-[var(--border)]"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xl flex flex-col gap-5">
        
        {/* Navigation / Control */}
        <header className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight font-sans text-[var(--text)]">
              CHAIN<span className="text-[var(--text-dim)] font-mono">_</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-mono">
              Habits and Streaks
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right font-mono text-[11px]">
              <span className="text-[var(--text-muted)] font-medium">{formattedReadableDate}</span>
            </div>
            
            <button 
              id="theme-toggle"
              onClick={handleToggleTheme}
              className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-raised)] active:scale-95 transition-all flex items-center justify-center text-[var(--text)] cursor-pointer"
              aria-label="Toggle Color Theme"
              title="Toggle Color Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </header>

        {/* Humble Bento Dashboard metrics Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border)] shadow-xs">
          <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]/50 justify-between min-h-[75px]">
            <span className="text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-wider block">Habits</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono tracking-tight">{stats.totalActive}</span>
              <span className="text-[10px] text-[var(--text-dim)]">active</span>
            </div>
          </div>

          <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]/50 justify-between min-h-[75px]">
            <span className="text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-wider block">Completed</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono tracking-tight">{stats.totalCompletions}</span>
              <span className="text-[10px] text-[var(--text-dim)]">times</span>
            </div>
          </div>

          <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]/50 justify-between min-h-[75px]">
            <span className="text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-wider block">Best streak</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono tracking-tight">{stats.bestStreak}</span>
              <span className="text-[10px] text-[var(--text-dim)]">days</span>
            </div>
          </div>

          <div className="flex flex-col p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]/50 justify-between min-h-[75px]">
            <span className="text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-wider block">Today</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono tracking-tight">{stats.todaysRate}</span>
              <span className="text-[10px] text-[var(--text-dim)]">done</span>
            </div>
          </div>
        </section>

        {/* Quick Add Presets Zone via polished custom select list */}
        <section className="flex flex-col gap-1.5 pl-0.5">
          <label htmlFor="presets-dropdown" className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)] block">
            Quick Add Preset
          </label>
          <div className="relative">
            <select
              id="presets-dropdown"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  handleAddPreset(val);
                  e.target.value = ""; // Reset after addition
                }
              }}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-xs px-3 py-2.5 rounded-lg outline-hidden font-sans cursor-pointer focus:border-[var(--text-dim)] transition-colors appearance-none pr-8"
            >
              <option value="" disabled>Choose from preset library...</option>
              {PRESETS.map(preset => {
                const isAlreadyAdded = habits.some(h => h.name.toLowerCase() === preset.name.toLowerCase());
                return (
                  <option 
                    key={preset.name} 
                    value={preset.name}
                    disabled={isAlreadyAdded}
                  >
                    {preset.name} {isAlreadyAdded ? "(Added)" : ""}
                  </option>
                );
              })}
            </select>
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-[var(--text-dim)]">
              <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </section>

        {/* Input Form Box */}
        <section className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)]">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAddHabit(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Record a custom habit..."
              maxLength={60}
              className="flex-1 bg-[var(--bg)] text-[var(--text)] text-sm px-3.5 py-2.5 rounded-lg border border-[var(--border)] focus:outline-hidden hover:border-[var(--text-dim)]/50 transition-all font-sans"
            />
            <button
              type="submit"
              className="bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95 text-xs font-semibold uppercase tracking-wider px-4 py-3 rounded-lg transition-all cursor-pointer font-mono shrink-0 select-none"
            >
              Add
            </button>
          </form>
        </section>

        {/* Active Habits list container */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
              Active Chains
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <button 
                onClick={handleShareStats}
                className="text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy stats to clipboard"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Stats</span>
              </button>
              
              {showResetConfirm ? (
                <div className="flex items-center gap-2 bg-red-500/5 dark:bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-md text-[10px]">
                  <span className="text-red-700 dark:text-red-400 font-bold">Reset all data?</span>
                  <button 
                    onClick={handleConfirmReset}
                    className="text-red-900 dark:text-red-300 font-bold hover:underline cursor-pointer"
                  >
                    Yes
                  </button>
                  <span className="text-[var(--text-dim)]">/</span>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="text-[var(--text-dim)] hover:text-[var(--text)] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="text-red-700/80 dark:text-red-400/80 hover:text-red-650 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset habits"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3" id="habit-list-container">
            <AnimatePresence initial={false}>
              {habits.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-[var(--border)] border-dashed bg-[var(--bg-card)]/50 gap-2.5"
                >
                  <Calendar className="w-8 h-8 text-[var(--text-dim)]/50" />
                  <div>
                    <h3 className="font-semibold text-[var(--text-muted)] text-xs">No active habits</h3>
                    <p className="text-[11px] text-[var(--text-dim)] mt-0.5 max-w-xs leading-relaxed font-sans">
                      Start tracking daily tasks by adding a preset or inputting a habit above!
                    </p>
                  </div>
                </motion.div>
              ) : (
                habits.map((habit) => {
                  const todayDone = habit.history.includes(todayStr);
                  const cellsList = generateLast14Days(habit.history, todayStr);
                  
                  // Simple non-obstructive milestone labels (strictly monospaced, minimal design)
                  let milestoneLabel = "";
                  if (habit.streak >= 100) {
                    milestoneLabel = "LEVEL 100";
                  } else if (habit.streak >= 30) {
                    milestoneLabel = "LEVEL 30";
                  } else if (habit.streak >= 7) {
                    milestoneLabel = "LEVEL 7";
                  }

                  return (
                    <motion.article
                      key={habit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-xs flex flex-col gap-3.5 relative overflow-hidden"
                    >
                      {/* Top metadata */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <h3 className="font-bold text-sm tracking-tight text-[var(--text)] uppercase select-text font-sans">
                            {habit.name}
                          </h3>
                        </div>

                        <button 
                          onClick={() => handleDeleteHabit(habit.id, habit.name)}
                          className="w-7 h-7 rounded-md hover:bg-red-500/10 text-[var(--text-dim)] hover:text-red-500 flex items-center justify-center transition-all cursor-pointer"
                          title="Remove habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Middle Strip: Streak counter alongside minimal horizontal 14-day tracking row */}
                      <div className="flex items-center justify-between py-2 border-t border-b border-[var(--border)]/60 gap-4">
                        
                        {/* Compact Numeric Counter */}
                        <div className="flex items-baseline gap-1 shrink-0 min-w-[55px]">
                          <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text)]">
                            {habit.streak}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-mono">
                            D
                          </span>
                        </div>

                        {/* Highly Compact Minimal 14-Day Calendar Segment Tracker */}
                        <div className="flex-1 flex flex-col gap-1 w-full max-w-[340px]">
                          {/* S M T W T F S labels mapping (Force strictly lowercase) */}
                          <div className="grid grid-cols-14 text-center">
                            {cellsList.map((c, i) => (
                              <span key={i} className="text-[8px] font-mono text-[var(--text-dim)] lowercase">
                                {c.dayLabel}
                              </span>
                            ))}
                          </div>

                          {/* 14 Dot Matrix Blocks (Simply visual read-only elements, non-button elements) */}
                          <div className="grid grid-cols-14 gap-1 sm:gap-1.5 justify-items-center">
                            {cellsList.map((cell, idx) => {
                              let cellClass = "w-4 h-4 rounded-sm transition-all duration-150 relative flex items-center justify-center ";
                              
                              if (cell.isCompleted) {
                                if (cell.isToday) {
                                  cellClass += " bg-[var(--text)] text-[var(--bg)] shadow-xs font-bold ";
                                } else {
                                  cellClass += " bg-[var(--text)] text-[var(--bg)] opacity-80 ";
                                }
                              } else {
                                if (cell.isToday) {
                                  cellClass += " bg-[var(--bg)] border border-dashed border-[var(--text-dim)] ";
                                } else {
                                  cellClass += " bg-[var(--bg)]/90 border border-[var(--border)]/40 ";
                                }
                              }

                              return (
                                <div
                                  key={idx}
                                  className={cellClass}
                                  title={`${cell.dateStr}: ${cell.isCompleted ? 'Completed' : 'Skipped'}`}
                                >
                                  {cell.isCompleted ? (
                                    <span className="text-[7px] font-mono font-bold">✓</span>
                                  ) : (
                                    cell.isToday && <span className="w-1 h-1 rounded-full bg-[var(--text-dim)]" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* Card Actions & milestones */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        
                        {/* Milestone indicators */}
                        <div>
                          {milestoneLabel ? (
                            <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-sm bg-[var(--bg-raised)] text-[var(--text-muted)] uppercase tracking-wider border border-[var(--border)]">
                              {milestoneLabel}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-[var(--text-dim)] uppercase">
                              Record: {habit.maxStreak} days
                            </span>
                          )}
                        </div>

                        {/* Direct Button toggle for Today */}
                        <div className="min-w-[130px]">
                          {todayDone ? (
                            <div className="py-1.5 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-mono font-medium">
                              <span className="text-[10px]">✓</span> LISTED TODAY
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleToday(habit.id)}
                              className="w-full py-2 px-3 rounded-lg border border-[var(--text)] bg-[var(--text)] text-[var(--bg)] text-[10.5px] font-bold font-mono tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer text-center"
                            >
                              MARK UPDATE
                            </button>
                          )}
                        </div>

                      </div>

                    </motion.article>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="flex items-center justify-between pt-5 border-t border-[var(--border)] text-[9px] font-mono uppercase tracking-widest text-[var(--text-dim)]">
          <span>Continuous Ledger Tracker</span>
          <span>© 2026</span>
        </footer>

      </div>
    </div>
  );
}
