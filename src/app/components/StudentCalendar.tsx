"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";

// Types
type Period = { period_start: string; period_end: string };
type Room = { id: string; name: string };
type Professor = { id: string; name: string; email: string };
type Availability = {
    person_id: string;
    person_type: "room" | "professor";
    slot_date: string;
    start_time: string;
};
type Defense = {
    room_id: string;
    date: string;
    time: string;
    defense_committee: { professor_id: string }[];
};

type InitialData = {
    period: Period | null;
    rooms: Room[];
    professors: Professor[];
    availability: Availability[];
    defenses: Defense[];
};

// Helper: Generate Time Slots (9am - 5pm)
const TIME_SLOTS = [
    "09:00:00", "10:00:00", "11:00:00", "12:00:00",
    "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00"
];

export default function StudentCalendar() {
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InitialData | null>(null);

    // Selection State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/student/initial-data");
                if (!res.ok) throw new Error("Failed to load data");
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Logic: Calculate Available Slots
    const availableSlots = useMemo(() => {
        if (!data || !data.period) return {};

        const slots: Record<string, Record<string, { rooms: Room[]; professors: Professor[] }>> = {};

        const isBooked = (type: "room" | "professor", id: string, date: string, time: string) => {
            return data.defenses.some(d =>
                d.date === date &&
                d.time === time &&
                (type === "room" ? d.room_id === id : d.defense_committee.some(c => c.professor_id === id))
            );
        };

        let curr = parseISO(data.period.period_start);
        const end = parseISO(data.period.period_end);

        while (curr <= end) {
            const dateStr = format(curr, "yyyy-MM-dd");
            slots[dateStr] = {};

            for (const time of TIME_SLOTS) {
                const normalizeTime = (t: string) => t.length === 5 ? `${t}:00` : t;

                const freeRooms = data.rooms.filter(room => {
                    const hasAvail = data.availability.some(a =>
                        a.person_type === "room" &&
                        a.person_id === room.id &&
                        a.slot_date === dateStr &&
                        normalizeTime(a.start_time) === time
                    );
                    return hasAvail && !isBooked("room", room.id, dateStr, time);
                });

                const freeProfs = data.professors.filter(prof => {
                    const hasAvail = data.availability.some(a =>
                        a.person_type === "professor" &&
                        a.person_id === prof.id &&
                        a.slot_date === dateStr &&
                        normalizeTime(a.start_time) === time
                    );
                    return hasAvail && !isBooked("professor", prof.id, dateStr, time);
                });

                if (freeRooms.length >= 1 && freeProfs.length >= 2) {
                    slots[dateStr][time] = { rooms: freeRooms, professors: freeProfs };
                }
            }
            curr = addDays(curr, 1);
        }

        return slots;
    }, [data]);

    // Render Helpers
    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-4"></div>
            <p>Loading schedule...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="w-10 h-10 mb-4" />
            <p>Error loading data: {error}</p>
        </div>
    );

    if (!data?.period) return (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">No Defense Period Active</p>
            <p className="text-sm mt-2">Please check back later when the schedule is released.</p>
        </div>
    );

    // Main Calendar UI
    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-neutral-500" />
                        Select a Date
                    </h2>
                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {format(parseISO(data.period.period_start), "MMMM yyyy")}
                    </span>
                </div>

                <div className="grid grid-cols-7 gap-4 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="text-center text-sm font-bold text-neutral-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-4">
                    {(() => {
                        const start = parseISO(data.period!.period_start);
                        const end = parseISO(data.period!.period_end);
                        const days = [];
                        let curr = start;

                        // Padding
                        for (let i = 0; i < start.getDay(); i++) {
                            days.push(<div key={`pad-${i}`} />);
                        }

                        while (curr <= end) {
                            const dateStr = format(curr, "yyyy-MM-dd");
                            const hasSlots = availableSlots[dateStr] && Object.keys(availableSlots[dateStr]).length > 0;
                            const isSelected = selectedDate && isSameDay(curr, selectedDate);
                            const dateClone = curr;

                            days.push(
                                <button
                                    key={dateStr}
                                    disabled={!hasSlots}
                                    onClick={() => setSelectedDate(dateClone)}
                                    className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center text-base transition-all relative group
                    ${isSelected
                                            ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg scale-105 z-10"
                                            : hasSlots
                                                ? "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-300 dark:text-neutral-700 cursor-not-allowed border border-transparent"}
                  `}
                                >
                                    <span className={`font-semibold`}>{format(curr, "d")}</span>
                                    {hasSlots && !isSelected && (
                                        <span className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    )}
                                </button>
                            );
                            curr = addDays(curr, 1);
                        }
                        return days;
                    })()}
                </div>


                <div className="mt-8 flex items-center justify-center gap-8 text-sm text-neutral-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 dark:bg-white"></span>
                        Selected
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"></span>
                        Available
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-900"></span>
                        Unavailable
                    </div>
                </div>
            </div>
        </div>
    );
}
