"use client";

import React, { useState, useEffect } from "react";

interface ScheduleDefense {
    studentName: string;
    date: string;
    time: string;
    roomName: string;
    readers: string[];
}

export default function ScheduleViewer() {
    const [defenses, setDefenses] = useState<ScheduleDefense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const res = await fetch("/api/student/schedule");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load schedule");
                setDefenses(data.defenses || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":");
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const filtered = defenses.filter((d) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            d.studentName.toLowerCase().includes(q) ||
            d.roomName.toLowerCase().includes(q) ||
            d.readers.some((r) => r.toLowerCase().includes(q))
        );
    });

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="inline-block h-6 w-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-800 dark:border-t-neutral-200 rounded-full animate-spin mb-3" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Loading schedule…
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-rose-300/60 dark:border-rose-500/40 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                Error loading schedule: {error}
            </div>
        );
    }

    if (defenses.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-neutral-500 dark:text-neutral-400">
                    No defenses have been scheduled yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        Current Defense Schedule
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {filtered.length} of {defenses.length} defense{defenses.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Search by name, room, reader…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                    </svg>
                </div>
            </div>

            <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Student
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Time
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Room
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Reader 1
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                                    Reader 2
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {filtered.map((defense, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                                        {defense.studentName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        {formatDate(defense.date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        {formatTime(defense.time)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        {defense.roomName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        {defense.readers[0] || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                                        {defense.readers[1] || "—"}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                                        No results match &ldquo;{search}&rdquo;
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
