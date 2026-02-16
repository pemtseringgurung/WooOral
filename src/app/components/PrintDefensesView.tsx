"use client";

import React, { useState, useEffect } from "react";

interface Defense {
    id: string;
    date: string;
    time: string;
    studentName: string;
    studentEmail: string;
    roomName: string;
    readers: string[];
}

export default function PrintDefensesView() {
    const [defenses, setDefenses] = useState<Defense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Defense | null>(null);

    const fetchDefenses = async () => {
        try {
            const response = await fetch("/api/admin/defenses", { method: "GET" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch defenses");
            }

            setDefenses(data.defenses || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDefenses();
    }, []);

    const deleteDefense = async () => {
        const defense = pendingDelete;
        if (!defense) return;
        setDeletingId(defense.id);
        setMessage(null);

        try {
            const res = await fetch(`/api/admin/defenses?id=${defense.id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data?.error ?? "Failed to delete defense");
            }

            setDefenses(prev => prev.filter(d => d.id !== defense.id));
            setMessage({ type: 'success', text: `Defense for ${defense.studentName} removed. The time slot is now available again.` });
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message || "Failed to delete defense" });
        } finally {
            setDeletingId(null);
            setPendingDelete(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":");
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500 dark:text-neutral-400">Loading defenses...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-rose-300/60 dark:border-rose-500/40 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                Error loading defenses: {error}
            </div>
        );
    }

    return (
        <>
            {/* Print-specific styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-area table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .print-area th, .print-area td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: left;
                    }
                    .print-area th {
                        background-color: #f5f5f5 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 no-print">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                            Scheduled Defenses
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {defenses.length} defense{defenses.length !== 1 ? "s" : ""} scheduled
                        </p>
                    </div>
                    {defenses.length > 0 && (
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-colors"
                        >
                            Print
                        </button>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <div className={`rounded-md border px-4 py-3 text-sm no-print ${message.type === 'success'
                        ? 'border-emerald-300/60 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300'
                        : 'border-rose-300/60 text-rose-600 dark:border-rose-500/40 dark:text-rose-300'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Content - Print Area */}
                <div className="print-area">
                    {/* Print Header (only visible when printing) */}
                    <div className="hidden print:block mb-6">
                        <h1 className="text-2xl font-bold text-center">I.S. Oral Defense Schedule</h1>
                        <p className="text-center text-sm text-neutral-500 mt-1">
                            Generated on {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            })}
                        </p>
                    </div>

                    {defenses.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-neutral-500 dark:text-neutral-400">
                                No defenses scheduled yet. Scheduled oral defense presentations will appear here.
                            </p>
                        </div>
                    ) : (
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
                                            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide whitespace-nowrap no-print w-20">

                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {defenses.map((defense) => (
                                            <tr
                                                key={defense.id}
                                                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                            {defense.studentName}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {defense.studentEmail}
                                                        </p>
                                                    </div>
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
                                                <td className="px-4 py-3 text-right no-print whitespace-nowrap w-20">
                                                    <button
                                                        onClick={() => setPendingDelete(defense)}
                                                        disabled={deletingId === defense.id}
                                                        className="text-xs font-medium text-rose-500 hover:text-rose-600 disabled:opacity-50"
                                                    >
                                                        {deletingId === defense.id ? "Removing…" : "Remove"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {pendingDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setPendingDelete(null)} />
                    <div className="relative z-10 w-full max-w-sm rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950 shadow-xl">
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                            <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Remove defense</h4>
                        </div>
                        <div className="px-5 py-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                            <p>
                                Remove the defense for <span className="font-medium text-neutral-900 dark:text-neutral-100">{pendingDelete.studentName}</span> on {formatDate(pendingDelete.date)} at {formatTime(pendingDelete.time)}?
                            </p>
                            <p>The time slot will become available for booking again.</p>
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setPendingDelete(null)}
                                className="px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteDefense}
                                className="px-4 py-2 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
