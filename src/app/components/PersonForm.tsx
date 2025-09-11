"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { UpsertPersonInput } from "@/types";

type Props = {
  initial?: UpsertPersonInput;
  onSubmit: (values: UpsertPersonInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  title?: string;
};

export default function PersonForm({ initial, onSubmit, onCancel, submitLabel, title }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initial availability (required on create) - dynamic rows with AM/PM
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  type Meridiem = "AM" | "PM";
  type TimeRange = { sh: string; sm: string; smd: Meridiem; eh: string; em: string; emd: Meridiem };
  const emptyRange = (): TimeRange => ({ sh: "", sm: "00", smd: "AM", eh: "", em: "00", emd: "AM" });
  const [daySlots, setDaySlots] = useState<Record<string, TimeRange[]>>(() => {
    const map: Record<string, TimeRange[]> = {} as Record<string, TimeRange[]>;
    for (const d of days) map[d] = [];
    return map;
  });
  const [showModal, setShowModal] = useState(false);
  const [addAvailability, setAddAvailability] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setError(null);
    setSuccess(null);
  }, [initial?.name, initial?.email]);

  const isEdit = useMemo(() => Boolean(initial?.id), [initial?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: UpsertPersonInput = { id: initial?.id, name: name.trim(), email: email.trim() };

      if (!initial?.id) {
        // Require opening the modal and confirming at least one enabled day
        if (!addAvailability) {
          setShowModal(true);
          setIsSubmitting(false);
          return;
        }
        const initial: { day_of_week: string; start_time: string; end_time: string }[] = [];
        for (const d of days) {
          for (const r of (daySlots[d] || [])) {
            const start24 = to24Hour(r.sh, r.sm, r.smd);
            const end24 = to24Hour(r.eh, r.em, r.emd);
            if (!start24 || !end24) {
              setError("Please provide valid times for all ranges");
              setIsSubmitting(false);
              return;
            }
            if (end24 <= start24) {
              setError("End time must be after start time for all ranges");
              setIsSubmitting(false);
              return;
            }
            initial.push({ day_of_week: d, start_time: start24, end_time: end24 });
          }
        }
        if (initial.length === 0) {
          setError("Select at least one day and time");
          setIsSubmitting(false);
          return;
        }
        payload.initialAvailability = initial;
      }

      await onSubmit(payload);
      setSuccess(isEdit ? "Saved successfully" : "Added successfully");
      if (!isEdit) {
        setName("");
        setEmail("");
        setAddAvailability(false);
        setDaySlots(() => {
          const map: Record<string, TimeRange[]> = {} as Record<string, TimeRange[]>;
          for (const d of days) map[d] = [];
          return map;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function to24Hour(hourStr: string, minuteStr: string, meridiem: Meridiem): string | null {
    const hourNum = parseInt(hourStr, 10);
    const minuteNum = parseInt(minuteStr, 10);
    if (!hourNum || hourNum < 1 || hourNum > 12) return null;
    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) return null;
    let h = hourNum % 12;
    if (meridiem === "PM") h += 12;
    const hh = String(h).padStart(2, "0");
    const mm = String(minuteNum).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 shadow rounded-xl p-4 space-y-4 border border-slate-200 dark:border-neutral-800">
      {title ? <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3> : null}
      {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
      {success ? <div className="text-sm text-green-700 dark:text-green-400">{success}</div> : null}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          className="w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          placeholder="Pem Gurung"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="w-full rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          placeholder="pgurung26@wooster.edu"
          required
        />
      </div>

      {!isEdit ? (
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700 dark:text-slate-200">Initial availability</label>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center rounded-md border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
            >
              Set availability
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">You must set at least one day and time when creating.</div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 w-full max-w-2xl shadow-xl">
            <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-3">Set initial availability</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {days.map((d) => (
                <div key={d} className="border border-slate-200 dark:border-neutral-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="capitalize text-sm text-slate-800 dark:text-slate-100">{d}</span>
                    <button type="button" onClick={() => setDaySlots((prev) => ({ ...prev, [d]: [...(prev[d]||[]), emptyRange()] }))} className="text-sm px-2 py-1 rounded-md border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-900/20">+ Add time</button>
                  </div>
                  <div className="space-y-2">
                    {(daySlots[d] || []).map((r, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <input value={r.sh} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], sh: e.target.value }; return { ...prev, [d]: arr }; })} placeholder="HH" className="w-14 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100" />
                        <span className="text-slate-600 dark:text-slate-300">:</span>
                        <input value={r.sm} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], sm: e.target.value }; return { ...prev, [d]: arr }; })} placeholder="MM" className="w-14 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100" />
                        <select value={r.smd} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], smd: e.target.value as Meridiem }; return { ...prev, [d]: arr }; })} className="rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100"><option>AM</option><option>PM</option></select>
                        <span className="mx-1 text-slate-600 dark:text-slate-300">to</span>
                        <input value={r.eh} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], eh: e.target.value }; return { ...prev, [d]: arr }; })} placeholder="HH" className="w-14 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100" />
                        <span className="text-slate-600 dark:text-slate-300">:</span>
                        <input value={r.em} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], em: e.target.value }; return { ...prev, [d]: arr }; })} placeholder="MM" className="w-14 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100" />
                        <select value={r.emd} onChange={(e) => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr[idx] = { ...arr[idx], emd: e.target.value as Meridiem }; return { ...prev, [d]: arr }; })} className="rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 text-slate-900 dark:text-slate-100"><option>AM</option><option>PM</option></select>
                        <button type="button" onClick={() => setDaySlots((prev) => { const arr = [...(prev[d]||[])]; arr.splice(idx,1); return { ...prev, [d]: arr }; })} className="text-sm px-2 py-1 rounded-md border border-red-600 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20">Remove</button>
                      </div>
                    ))}
                    {(daySlots[d] || []).length === 0 ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">No times added</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  setAddAvailability(true);
                  setShowModal(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel ?? (isEdit ? "Save" : "Add")}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-4 py-2 text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}


