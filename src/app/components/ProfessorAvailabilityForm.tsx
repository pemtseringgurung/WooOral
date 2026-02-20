"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { Availability, DefensePeriod, Professor } from "@/types/index";
import { parseYMDToLocal, formatDisplayLong } from "@/lib/dates";

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 17;
const SLOT_INTERVAL_MINUTES = 60;

type SlotSelections = Record<string, Set<string>>;
type SlotsByDate = Record<string, Availability[]>;

const formatTime = (hours: number, minutes: number) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

const addMinutesToTime = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(1970, 0, 1, h, m);
  date.setMinutes(date.getMinutes() + minutes);
  return formatTime(date.getHours(), date.getMinutes());
};

const groupSlotsForProfessor = (professorId: string, slots: Availability[]): SlotsByDate => {
  const grouped: SlotsByDate = {};
  for (const slot of slots) {
    if (slot.person_type !== "professor" || slot.person_id !== professorId) continue;
    const key = slot.slot_date ?? null;
    if (!key) continue;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(slot);
  }

  for (const items of Object.values(grouped)) {
    items.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return grouped;
};

const buildSelections = (grouped: SlotsByDate): SlotSelections => {
  const selections: SlotSelections = {};
  for (const [date, items] of Object.entries(grouped)) {
    selections[date] = new Set(items.map(slot => slot.start_time.slice(0, 5)));
  }
  return selections;
};

export default function ProfessorAvailabilityForm() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [defensePeriod, setDefensePeriod] = useState<DefensePeriod | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProfessorId, setSelectedProfessorId] = useState<string>("");
  const [existingSlotsByDate, setExistingSlotsByDate] = useState<SlotsByDate>({});
  const [selectedSlots, setSelectedSlots] = useState<SlotSelections>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfessors(), fetchDefensePeriod(), fetchAvailabilities()]);
    } catch (error) {
      console.error("Failed to load professor availability data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const fetchProfessors = async () => {
    const res = await fetch("/api/admin/professors", { method: "GET" });
    if (!res.ok) throw new Error("Professors fetch failed");
    const data = (await res.json()) as Professor[];
    setProfessors(data ?? []);
  };

  const fetchDefensePeriod = async () => {
    const res = await fetch("/api/admin/defense-period", { method: "GET" });
    if (!res.ok) {
      setDefensePeriod(null);
      return;
    }
    const data = (await res.json()) as DefensePeriod | null;
    setDefensePeriod(data);
  };

  const fetchAvailabilities = async () => {
    const res = await fetch("/api/professor/availability", { method: "GET" });
    if (!res.ok) throw new Error("Availability fetch failed");
    const data = (await res.json()) as Availability[];
    setAvailabilities(data ?? []);
  };

  const timeBlocks = useMemo(() => {
    const blocks: string[] = [];
    const startMinutes = SLOT_START_HOUR * 60;
    const endMinutes = SLOT_END_HOUR * 60;
    for (let minutes = startMinutes; minutes < endMinutes; minutes += SLOT_INTERVAL_MINUTES) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      blocks.push(formatTime(hours, mins));
    }
    return blocks;
  }, []);

  const dateRange = useMemo(() => {
    if (!defensePeriod) return [] as Array<{ iso: string; label: string }>;
    const start = parseYMDToLocal(defensePeriod.period_start);
    const end = parseYMDToLocal(defensePeriod.period_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const pad = (v: number) => String(v).padStart(2, "0");
    const range: Array<{ iso: string; label: string }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
      range.push({ iso, label: formatDisplayLong(new Date(cursor)) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return range;
  }, [defensePeriod]);

  useEffect(() => {
    if (selectedProfessorId) {
      const grouped = groupSlotsForProfessor(selectedProfessorId, availabilities);
      setExistingSlotsByDate(grouped);
      setSelectedSlots(buildSelections(grouped));
    } else {
      setExistingSlotsByDate({});
      setSelectedSlots({});
    }
  }, [selectedProfessorId, availabilities]);

  const handleToggleSlot = (date: string, time: string) => {
    setSelectedSlots(prev => {
      const current: SlotSelections = {};
      for (const [key, set] of Object.entries(prev)) {
        current[key] = new Set(set);
      }
      const set = current[date] ?? new Set<string>();
      if (set.has(time)) {
        set.delete(time);
      } else {
        set.add(time);
      }
      current[date] = set;
      return current;
    });
  };

  const handleClearDay = (date: string) => {
    setSelectedSlots(prev => {
      const next: SlotSelections = {};
      for (const [key, set] of Object.entries(prev)) {
        if (key === date) continue;
        next[key] = new Set(set);
      }
      return next;
    });
  };

  const handleSaveSlots = async () => {
    if (!selectedProfessorId) {
      setMessage({ type: "error", text: "Please select a professor" });
      return;
    }

    // Verify professor still exists
    const professorExists = professors.find(p => p.id === selectedProfessorId);
    if (!professorExists) {
      setMessage({ type: "error", text: "This professor no longer exists. Please refresh the page." });
      return;
    }

    const toInsert: Array<{ slot_date: string; start_time: string; end_time: string }> = [];
    const toDelete: Availability[] = [];

    for (const [date, set] of Object.entries(selectedSlots)) {
      const existingByTime = new Map(
        (existingSlotsByDate[date] ?? []).map(slot => [slot.start_time.slice(0, 5), slot])
      );
      for (const time of set) {
        if (!existingByTime.has(time)) {
          toInsert.push({
            slot_date: date,
            start_time: `${time}:00`,
            end_time: `${addMinutesToTime(time, SLOT_INTERVAL_MINUTES)}:00`
          });
        }
      }

      for (const [time, slot] of existingByTime.entries()) {
        if (!set.has(time)) {
          toDelete.push(slot);
        }
      }
    }

    for (const [date, slots] of Object.entries(existingSlotsByDate)) {
      if (selectedSlots[date]) continue;
      toDelete.push(...slots);
    }

    if (toInsert.length === 0 && toDelete.length === 0) {
      setMessage({ type: "success", text: "No changes to save" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      let insertedRows: Availability[] = [];
      if (toInsert.length > 0) {
        const res = await fetch("/api/professor/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professor_id: selectedProfessorId, slots: toInsert })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to save availability");
        }
        insertedRows = Array.isArray(data) ? data : [data];
      }

      if (toDelete.length > 0) {
        const errors: string[] = [];
        await Promise.all(
          toDelete.map(async slot => {
            const res = await fetch(`/api/professor/availability?id=${slot.id}`, { method: "DELETE" });
            if (!res.ok) {
              const data = await res.json();
              errors.push(data?.error ?? `Failed to delete slot ${slot.id}`);
            }
          })
        );
        if (errors.length > 0) {
          throw new Error(errors[0]);
        }
      }

      setAvailabilities(prev => {
        const deletedIds = new Set(toDelete.map(slot => slot.id));
        const remaining = deletedIds.size ? prev.filter(slot => !deletedIds.has(slot.id)) : prev;
        const next = insertedRows.length ? [...insertedRows, ...remaining] : remaining;
        return next;
      });

      setMessage({ type: "success", text: "Availability saved successfully!" });

      // Scroll to top to show success message
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Saving availability failed", error);
      setMessage({ type: "error", text: (error as Error).message || "Failed to update availability" });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProfessor = professors.find(p => p.id === selectedProfessorId);
  const professorSlots = selectedProfessorId ? availabilities.filter(
    slot => slot.person_type === "professor" && slot.person_id === selectedProfessorId && slot.slot_date
  ) : [];

  return (
    <div ref={containerRef} className="space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Set Your Availability
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Select the time slots when you are available for oral defense presentations
        </p>
      </header>

      {message && (
        <div
          className={`max-w-3xl mx-auto rounded-xl border-2 px-5 py-4 text-sm font-medium flex items-center gap-3 ${message.type === "success"
            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-300"
            }`}
        >
          {message.type === "success" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      ) : (
        <>
          <section className="max-w-3xl mx-auto space-y-4">
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Please select your name from the dropdown menu
              </label>
              <div className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
                <select
                  value={selectedProfessorId}
                  onChange={(e) => setSelectedProfessorId(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent rounded-md text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">Select a professor</option>
                  {professors.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProfessor && (
              <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-900/40 px-5 py-4">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedProfessor.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {professorSlots.length} time slot{professorSlots.length === 1 ? "" : "s"} configured
                </p>
              </div>
            )}
          </section>

          {selectedProfessorId && (
            <section className="max-w-4xl mx-auto space-y-6">
              {dateRange.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  No defense period set. Please contact the administrator.
                </p>
              ) : (
                <>
                  {dateRange.map(({ iso, label }) => {
                    const selectedForDate = selectedSlots[iso] ?? new Set<string>();
                    return (
                      <div key={iso} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</h5>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {selectedForDate.size} slot{selectedForDate.size === 1 ? "" : "s"} selected
                            </span>
                          </div>
                          {(selectedForDate.size > 0 || (existingSlotsByDate[iso]?.length ?? 0) > 0) && (
                            <button
                              type="button"
                              onClick={() => handleClearDay(iso)}
                              className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                            >
                              Clear day
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {timeBlocks.map(time => {
                            const isSelected = selectedForDate.has(time);
                            const isExisting = (existingSlotsByDate[iso] ?? []).some(
                              slot => slot.start_time.slice(0, 5) === time
                            );
                            const labelRange = `${time} – ${addMinutesToTime(time, SLOT_INTERVAL_MINUTES)}`;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => handleToggleSlot(iso, time)}
                                className={`text-xs font-medium rounded-md border px-3 py-2 text-left transition-colors h-14 flex flex-col justify-center ${isSelected
                                  ? "bg-white text-neutral-900 border-neutral-900 shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
                                  : "bg-white/60 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500"
                                  }`}
                                aria-pressed={isSelected}
                              >
                                <span>{labelRange}</span>
                                <span className={`block text-[10px] mt-1 ${isExisting ? "text-emerald-500 dark:text-emerald-400" : "invisible"}`}>
                                  Saved
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveSlots}
                      disabled={isSaving}
                      className="px-6 py-3 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Saving…" : "Save Availability"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
