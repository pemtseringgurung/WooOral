"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Availability, Student, UpsertAvailabilityInput, UpsertPersonInput } from "@/types";
import PersonForm from "./PersonForm";
import AvailabilityForm from "./AvailabilityForm";

export default function StudentSection() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [list, setList] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [availability, setAvailability] = useState<Record<string, Availability[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else if (!ignore) {
        setList(data as Student[]);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("students-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => load()
      )
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const selectedIdRaw = selected?.id;
    if (!selectedIdRaw) return;
    const selectedId = selectedIdRaw as string;
    let ignore = false;
    async function loadAvailability() {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("person_type", "student")
        .eq("person_id", selectedId);
      if (!ignore) {
        if (error) {
          setMessage(null);
          setError(error.message);
        } else {
          setError(null);
          setAvailability((prev) => ({ ...prev, [selectedId as string]: (data as Availability[]) ?? [] }));
        }
      }
    }
    loadAvailability();
    const channel = supabase
      .channel(`availability-stu-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability", filter: `person_id=eq.${selectedId}` },
        () => loadAvailability()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected?.id, supabase]);

  async function handleSubmit(values: UpsertPersonInput) {
    setError(null);
    setMessage(null);
    if (values.id) {
      const { error } = await supabase
        .from("students")
        .update({ name: values.name, email: values.email })
        .eq("id", values.id);
      if (error) throw error;
      setSelected(null);
      setMessage("Student updated");
    } else {
      const { data, error } = await supabase
        .from("students")
        .insert({ name: values.name, email: values.email })
        .select("id")
        .single();
      if (error) throw error;
      const newId = (data as { id: string }).id;
      if (values.initialAvailability && values.initialAvailability.length > 0) {
        const rows = values.initialAvailability.map((r) => ({
          person_id: newId,
          person_type: "student" as const,
          day_of_week: r.day_of_week,
          start_time: `${r.start_time}:00`,
          end_time: `${r.end_time}:00`,
        }));
        await supabase.from("availability").insert(rows);
      }
      setMessage("Student added");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setMessage(null);
    const ok = window.confirm("Delete this student?");
    if (!ok) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      setError(error.message);
    } else {
      setSelected((cur) => (cur?.id === id ? null : cur));
      setMessage("Student deleted");
    }
  }

  async function handleUpsertAvailability(rows: UpsertAvailabilityInput[]) {
    setError(null);
    setMessage(null);
    if (!selected) return;
    const { error: delErr } = await supabase
      .from("availability")
      .delete()
      .eq("person_type", "student")
      .eq("person_id", selected.id);
    if (delErr) throw delErr;
    if (rows.length === 0) return;
    const { error: insErr } = await supabase.from("availability").insert(rows);
    if (insErr) throw insErr;
    setMessage("Availability saved");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Students</h2>
        {message ? <div className="text-sm text-green-700 dark:text-green-400">{message}</div> : null}
        {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
      </div>

      <PersonForm
        initial={selected ? { id: selected.id, name: selected.name, email: selected.email } : undefined}
        onSubmit={handleSubmit}
        onCancel={() => setSelected(null)}
        title={selected ? "Edit Student" : "Add Student"}
      />

      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow">
        <div className="p-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-sm text-slate-700 dark:text-slate-300">{loading ? "Loading..." : `${list.length} total`}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 text-xs">Realtime</span>
          </div>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
          {list.map((p) => (
            <li key={p.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  {p.name.slice(0,1).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{p.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-100" onClick={() => setSelected(p)}>
                  Edit
                </button>
                <button className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={() => handleDelete(p.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
          {list.length === 0 && !loading ? (
            <li className="p-3 text-sm text-slate-600 dark:text-slate-300">No students yet</li>
          ) : null}
        </ul>
      </div>

      {selected ? (
        <AvailabilityForm
          personId={selected.id}
          personType="student"
          initial={availability[selected.id]?.map((a) => ({
            id: a.id,
            person_id: a.person_id,
            person_type: a.person_type,
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
          }))}
          onUpsert={handleUpsertAvailability}
        />
      ) : null}
    </section>
  );
}


