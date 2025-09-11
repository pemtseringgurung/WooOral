"use client";

import React, { useMemo, useState } from "react";
import type { PersonType, UpsertAvailabilityInput } from "@/types";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Day = typeof DAYS[number];

type Props = {
  personId: string;
  personType: PersonType;
  initial?: UpsertAvailabilityInput[];
  onUpsert: (rows: UpsertAvailabilityInput[]) => Promise<void> | void;
};

export default function AvailabilityForm({ personId, personType, initial, onUpsert }: Props) {
  const initialMap = useMemo(() => {
    const map = new Map<Day, { start_time: string; end_time: string; enabled: boolean }>();
    for (const day of DAYS) {
      map.set(day, { start_time: "", end_time: "", enabled: false });
    }
    if (initial) {
      for (const row of initial) {
        const day = row.day_of_week as Day;
        if (map.has(day)) {
          map.set(day, {
            start_time: row.start_time?.slice(0, 5) ?? "",
            end_time: row.end_time?.slice(0, 5) ?? "",
            enabled: true,
          });
        }
      }
    }
    return map;
  }, [initial]);

  const [state, setState] = useState(initialMap);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function setDay(day: Day, patch: Partial<{ start_time: string; end_time: string; enabled: boolean }>) {
    setState((prev) => new Map(prev.set(day, { ...prev.get(day)!, ...patch })));
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    const rows: UpsertAvailabilityInput[] = [];
    for (const [day, values] of state.entries()) {
      if (!values.enabled) continue;
      if (!values.start_time || !values.end_time) {
        setError("Please provide start and end times for enabled days");
        return;
      }
      if (values.end_time <= values.start_time) {
        setError("End time must be after start time for all days");
        return;
      }
      rows.push({
        person_id: personId,
        person_type: personType,
        day_of_week: day,
        start_time: `${values.start_time}:00`,
        end_time: `${values.end_time}:00`,
      });
    }
    try {
      setIsSubmitting(true);
      await onUpsert(rows);
      setSuccess("Availability updated");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save availability");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-xl border border-slate-200 dark:border-neutral-800 p-4">
      <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">Availability</h4>
      {error ? <div className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</div> : null}
      {success ? <div className="text-sm text-green-700 dark:text-green-400 mb-2">{success}</div> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DAYS.map((day) => {
          const values = state.get(day)!;
          return (
            <div key={day} className="flex items-center gap-2">
              <label className="w-24 capitalize text-sm text-slate-700 dark:text-slate-200">{day}</label>
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => setDay(day, { enabled: e.target.checked })}
              />
              <input
                type="time"
                value={values.start_time}
                onChange={(e) => setDay(day, { start_time: e.target.value })}
                className="border rounded px-2 py-1 disabled:opacity-50 bg-white dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-slate-100"
                disabled={!values.enabled}
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">to</span>
              <input
                type="time"
                value={values.end_time}
                onChange={(e) => setDay(day, { end_time: e.target.value })}
                className="border rounded px-2 py-1 disabled:opacity-50 bg-white dark:bg-neutral-800 border-slate-300 dark:border-neutral-700 text-slate-900 dark:text-slate-100"
                disabled={!values.enabled}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Availability"}
        </button>
      </div>
    </div>
  );
}


