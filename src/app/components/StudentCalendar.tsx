"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle, X, ChevronRight, ChevronLeft, Check } from "lucide-react";

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

type SlotData = { rooms: Room[]; professors: Professor[] };

// Helper: Generate Time Slots (9am - 5pm)
const TIME_SLOTS = [
    "09:00:00", "10:00:00", "11:00:00", "12:00:00",
    "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00"
];

const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
};

export default function StudentCalendar() {
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InitialData | null>(null);

    // Modal State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Time, 2: Professors, 3: Room, 4: Student Info, 5: Confirm

    // Booking Selections
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedProfessors, setSelectedProfessors] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [studentName, setStudentName] = useState("");
    const [studentEmail, setStudentEmail] = useState("");

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

        const slots: Record<string, Record<string, SlotData>> = {};

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

    // Modal Helpers
    const openModal = (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setSelectedProfessors([]);
        setSelectedRoom(null);
        setStudentName("");
        setStudentEmail("");
        setStep(1);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedDate(null);
    };

    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
    const slotsForDate = availableSlots[dateStr] || {};
    const currentSlot = selectedTime ? slotsForDate[selectedTime] : null;

    const toggleProfessor = (id: string) => {
        setSelectedProfessors(prev => {
            if (prev.includes(id)) return prev.filter(p => p !== id);
            if (prev.length < 2) return [...prev, id];
            return prev;
        });
    };

    const canProceed = () => {
        switch (step) {
            case 1: return !!selectedTime;
            case 2: return selectedProfessors.length === 2;
            case 3: return !!selectedRoom;
            case 4: return studentName.trim().length > 0 && studentEmail.trim().length > 0 && studentEmail.includes("@");
            default: return false;
        }
    };

    const [bookingError, setBookingError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        setBookingError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/student/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentName,
                    studentEmail,
                    roomId: selectedRoom,
                    professorIds: selectedProfessors,
                    date: dateStr,
                    time: selectedTime
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to book defense");
            }

            // Success - close modal and refresh data
            closeModal();
            // Refresh availability data
            const refreshRes = await fetch("/api/student/initial-data");
            if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                setData(refreshData);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setBookingError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Helpers
    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 text-neutral-500">
            <div className="w-10 h-10 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-4"></div>
            <p className="text-lg">Loading schedule...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-32 text-red-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p className="text-lg">Error loading data: {error}</p>
        </div>
    );

    if (!data?.period) return (
        <div className="flex flex-col items-center justify-center py-32 text-neutral-500">
            <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium text-neutral-900 dark:text-neutral-100">No Defense Period Active</p>
            <p className="text-base mt-2">Please check back later when the schedule is released.</p>
        </div>
    );

    // Main Calendar UI
    return (
        <>
            <div className="w-full">
                <div className="bg-white dark:bg-neutral-900 p-6 sm:p-10 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                            Select a Date
                        </h2>
                        <span className="text-sm font-medium px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {format(parseISO(data.period.period_start), "MMMM yyyy")}
                        </span>
                    </div>


                    <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                            <div key={d} className="text-center text-sm font-bold text-neutral-400 uppercase tracking-wider py-2">{d}</div>
                        ))}
                    </div>


                    <div className="grid grid-cols-7 gap-2 sm:gap-4">
                        {(() => {
                            const start = parseISO(data.period!.period_start);
                            const end = parseISO(data.period!.period_end);
                            const days = [];
                            let curr = start;

                            // Padding for first week
                            for (let i = 0; i < start.getDay(); i++) {
                                days.push(<div key={`pad-${i}`} className="aspect-square" />);
                            }

                            while (curr <= end) {
                                const currDateStr = format(curr, "yyyy-MM-dd");
                                const hasSlots = availableSlots[currDateStr] && Object.keys(availableSlots[currDateStr]).length > 0;
                                const dateClone = curr;

                                days.push(
                                    <button
                                        key={currDateStr}
                                        disabled={!hasSlots}
                                        onClick={() => openModal(dateClone)}
                                        className={`
                                            aspect-square rounded-2xl flex flex-col items-center justify-center text-lg sm:text-xl font-semibold transition-all relative group
                                            ${hasSlots
                                                ? "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-300 dark:text-neutral-700 cursor-not-allowed border border-transparent"}
                                        `}
                                    >
                                        <span>{format(curr, "d")}</span>
                                        {hasSlots && (
                                            <span className="absolute bottom-2 sm:bottom-3 w-2 h-2 rounded-full bg-green-500"></span>
                                        )}
                                    </button>
                                );
                                curr = addDays(curr, 1);
                            }
                            return days;
                        })()}
                    </div>


                    <div className="mt-10 flex items-center justify-center gap-8 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-white border-2 border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700"></span>
                            Available
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-neutral-100 dark:bg-neutral-900"></span>
                            Unavailable
                        </div>
                    </div>
                </div>
            </div>


            {modalOpen && selectedDate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >

                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />


                    <div className="relative bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <div>
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                    Book Defense
                                </h3>
                                <p className="text-sm text-neutral-500 mt-1">
                                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>


                        <div className="flex items-center justify-center gap-2 px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50">
                            {[1, 2, 3, 4, 5].map(s => (
                                <div key={s} className="flex items-center">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                                        ${s === step
                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                                            : s < step
                                                ? "bg-green-500 text-white"
                                                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"}
                                    `}>
                                        {s < step ? <Check className="w-4 h-4" /> : s}
                                    </div>
                                    {s < 5 && <div className={`w-6 h-0.5 mx-1 ${s < step ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-700"}`} />}
                                </div>
                            ))}
                        </div>


                        <div className="p-6 max-h-80 overflow-y-auto">
                            {step === 1 && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Select a Time</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.keys(slotsForDate).sort().map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`
                                                    px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all
                                                    ${selectedTime === time
                                                        ? "bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-black"
                                                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300"}
                                                `}
                                            >
                                                {formatTime(time)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && currentSlot && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Select 2 Committee Members</h4>
                                    <p className="text-sm text-neutral-500 mb-4">Choose exactly 2 professors for your defense committee.</p>
                                    <div className="space-y-2">
                                        {currentSlot.professors.map(prof => (
                                            <button
                                                key={prof.id}
                                                onClick={() => toggleProfessor(prof.id)}
                                                className={`
                                                    w-full px-4 py-3 rounded-xl text-left border-2 transition-all flex items-center justify-between
                                                    ${selectedProfessors.includes(prof.id)
                                                        ? "bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-black"
                                                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300"}
                                                `}
                                            >
                                                <div>
                                                    <div className="font-medium">{prof.name}</div>
                                                    <div className={`text-sm ${selectedProfessors.includes(prof.id) ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-500"}`}>{prof.email}</div>
                                                </div>
                                                {selectedProfessors.includes(prof.id) && <Check className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 3 && currentSlot && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Select a Room</h4>
                                    <div className="space-y-2">
                                        {currentSlot.rooms.map(room => (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedRoom(room.id)}
                                                className={`
                                                    w-full px-4 py-4 rounded-xl text-left border-2 transition-all flex items-center justify-between
                                                    ${selectedRoom === room.id
                                                        ? "bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-black"
                                                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300"}
                                                `}
                                            >
                                                <span className="font-medium">{room.name}</span>
                                                {selectedRoom === room.id && <Check className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Your Information</h4>
                                    <p className="text-sm text-neutral-500 mb-4">Enter your name and email to complete the booking.</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={studentName}
                                                onChange={(e) => setStudentName(e.target.value)}
                                                placeholder="Pem Gurung"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                value={studentEmail}
                                                onChange={(e) => setStudentEmail(e.target.value)}
                                                placeholder="pgurung26@wooster.edu"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:border-neutral-400 dark:focus:border-neutral-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">Confirm Your Booking</h4>
                                    <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Student</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{studentName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Email</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{studentEmail}</span>
                                        </div>
                                        <div className="border-t border-neutral-200 dark:border-neutral-700 my-2"></div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Date</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{format(selectedDate, "MMM d, yyyy")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Time</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{selectedTime && formatTime(selectedTime)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Room</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                                {currentSlot?.rooms.find(r => r.id === selectedRoom)?.name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Committee</span>
                                            <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right">
                                                {selectedProfessors.map(id => currentSlot?.professors.find(p => p.id === id)?.name).join(", ")}
                                            </span>
                                        </div>
                                    </div>
                                    {bookingError && (
                                        <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                            {bookingError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30">
                            {step > 1 ? (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 5 ? (
                                <button
                                    onClick={() => setStep(s => s + 1)}
                                    disabled={!canProceed()}
                                    className={`
                                        flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all
                                        ${canProceed()
                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90"
                                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"}
                                    `}
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${isSubmitting ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"} text-white`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Booking...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" /> Confirm Booking
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
