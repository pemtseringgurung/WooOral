"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Availability, DefensePeriod, Room } from "@/types/index";

const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 17; // exclusive for start time (last slot ends at 5pm)
const SLOT_INTERVAL_MINUTES = 30;

interface RoomFormState {
  name: string;
}

type SlotSelections = Record<string, Set<string>>;
type SlotsByDate = Record<string, Availability[]>;

const emptyRoomForm: RoomFormState = { name: "" };

const formatTime = (hours: number, minutes: number) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

const addMinutesToTime = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(1970, 0, 1, h, m);
  date.setMinutes(date.getMinutes() + minutes);
  return formatTime(date.getHours(), date.getMinutes());
};

const groupSlotsForRoom = (roomId: string, slots: Availability[]): SlotsByDate => {
  const grouped: SlotsByDate = {};
  for (const slot of slots) {
    if (slot.person_type !== "room" || slot.person_id !== roomId) continue;
    const key = slot.slot_date ?? null;
    if (!key) continue; // skip legacy rows without slot_date
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

export default function RoomAvailabilityForm() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [defensePeriod, setDefensePeriod] = useState<DefensePeriod | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomMessage, setRoomMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [existingSlotsByDate, setExistingSlotsByDate] = useState<SlotsByDate>({});
  const [selectedSlots, setSelectedSlots] = useState<SlotSelections | null>(null);
  const [slotMessage, setSlotMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [roomPendingDelete, setRoomPendingDelete] = useState<Room | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRooms(), fetchDefensePeriod(), fetchAvailabilities()]);
    } catch (error) {
      console.error("Failed to load room availability data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    const res = await fetch("/api/admin/rooms", { method: "GET" });
    if (!res.ok) throw new Error("Rooms fetch failed");
    const data = (await res.json()) as Room[];
    setRooms(data ?? []);
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
    const res = await fetch("/api/admin/rooms/availability", { method: "GET" });
    if (!res.ok) throw new Error("Availability fetch failed");
    const data = (await res.json()) as Availability[];
    setAvailabilities(data ?? []);
  };

  const resetRoomForm = () => {
    setRoomForm(emptyRoomForm);
    setEditingRoom(null);
  };

  const handleRoomSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = roomForm.name.trim();
    if (!name) {
      setRoomMessage({ type: "error", text: "Room name is required" });
      return;
    }

    setIsSavingRoom(true);
    setRoomMessage(null);

    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, id: editingRoom?.id })
      });

      const result = await res.json();

      if (!res.ok) {
        setRoomMessage({ type: "error", text: result?.error ?? "Failed to save room" });
        return;
      }

      setRooms(prev => {
        if (editingRoom) {
          return prev.map(room => (room.id === editingRoom.id ? (result as Room) : room));
        }
        return [result as Room, ...prev];
      });

      setRoomMessage({ type: "success", text: editingRoom ? "Room updated" : "Room added" });
      resetRoomForm();
    } catch (error) {
      console.error("Room save failed", error);
      setRoomMessage({ type: "error", text: "Unexpected error saving room" });
    } finally {
      setIsSavingRoom(false);
    }
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

    const start = new Date(defensePeriod.period_start);
    const end = new Date(defensePeriod.period_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const range: Array<{ iso: string; label: string }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      range.push({ iso, label: formatter.format(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return range;
  }, [defensePeriod]);

  const slotsByRoom = useMemo(() => {
    const map = new Map<string, Availability[]>();
    for (const slot of availabilities) {
      if (slot.person_type !== "room") continue;
      if (!map.has(slot.person_id)) map.set(slot.person_id, []);
      map.get(slot.person_id)!.push(slot);
    }
    return map;
  }, [availabilities]);

  const handleOpenModal = (room: Room) => {
    setActiveRoomId(room.id);
    setSlotMessage(null);
    const grouped = groupSlotsForRoom(room.id, availabilities);
    setExistingSlotsByDate(grouped);
    setSelectedSlots(buildSelections(grouped));
  };

  const handleCloseModal = () => {
    setActiveRoomId(null);
    setExistingSlotsByDate({});
    setSelectedSlots(null);
    setSlotMessage(null);
    setIsSavingSlots(false);
  };

  const handleToggleSlot = (date: string, time: string) => {
    setSelectedSlots(prev => {
      const current: SlotSelections = {};
      if (prev) {
        for (const [key, set] of Object.entries(prev)) {
          current[key] = new Set(set);
        }
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
      if (!prev) return prev;
      const next: SlotSelections = {};
      for (const [key, set] of Object.entries(prev)) {
        if (key === date) continue;
        next[key] = new Set(set);
      }
      return next;
    });
  };

  const handleSaveSlots = async () => {
    if (!activeRoomId || !selectedSlots) return;

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
      setSlotMessage({ type: "success", text: "No changes to save" });
      return;
    }

    setIsSavingSlots(true);

    try {
      let insertedRows: Availability[] = [];
      if (toInsert.length > 0) {
        const res = await fetch("/api/admin/rooms/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: activeRoomId, slots: toInsert })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to save availability" );
        }
        insertedRows = Array.isArray(data) ? data : [data];
      }

      if (toDelete.length > 0) {
        const errors: string[] = [];
        await Promise.all(
          toDelete.map(async slot => {
            const res = await fetch(`/api/admin/rooms/availability?id=${slot.id}`, { method: "DELETE" });
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
        const grouped = groupSlotsForRoom(activeRoomId, next);
        setExistingSlotsByDate(grouped);
        setSelectedSlots(buildSelections(grouped));
        return next;
      });

      setSlotMessage({ type: "success", text: "Availability updated" });
    } catch (error) {
      console.error("Saving slot selections failed", error);
      setSlotMessage({ type: "error", text: (error as Error).message || "Failed to update availability" });
    } finally {
      setIsSavingSlots(false);
    }
  };

  const openRooms = rooms.map(room => ({
    room,
    slots: slotsByRoom.get(room.id)?.filter(slot => slot.slot_date) ?? []
  }));

  const activeRoom = activeRoomId ? rooms.find(room => room.id === activeRoomId) ?? null : null;

  const handleDeleteRoom = async (room: Room) => {
    setRoomPendingDelete(room);
  };

  const executeDeleteRoom = async () => {
    const room = roomPendingDelete;
    if (!room) return;
    setDeletingRoomId(room.id);
    setRoomMessage(null);

    try {
      const res = await fetch(`/api/admin/rooms?id=${room.id}`, { method: "DELETE" });
      const data = res.ok ? null : await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete room");
      }

      setRooms(prev => prev.filter(r => r.id !== room.id));
      setAvailabilities(prev => prev.filter(slot => slot.person_id !== room.id));
      if (activeRoomId === room.id) {
        handleCloseModal();
      }
      if (editingRoom?.id === room.id) {
        resetRoomForm();
      }
      setRoomMessage({ type: "success", text: `${room.name} deleted` });
    } catch (error) {
      console.error("Failed to delete room", error);
      setRoomMessage({ type: "error", text: (error as Error).message || "Failed to delete room" });
    } finally {
      setDeletingRoomId(null);
      setRoomPendingDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      <header className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Room Availability</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Add rooms and configure available time slots that align with the official defense window.
        </p>
        {!defensePeriod && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Tip: set the defense period first to focus the available days.
          </p>
        )}
      </header>

      {roomMessage && (
        <div
          className={`max-w-3xl mx-auto rounded-md border px-4 py-3 text-sm ${
            roomMessage.type === "success"
              ? "border-emerald-300/60 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300"
              : "border-rose-300/60 text-rose-600 dark:border-rose-500/40 dark:text-rose-300"
          }`}
        >
          {roomMessage.text}
        </div>
      )}

      <section className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {editingRoom ? "Edit Room" : "Add a Room"}
            </h3>
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {editingRoom ? "Update the room name" : "Create a room before managing its slots"}
            </p>
          </div>
          {editingRoom && (
            <button
              onClick={resetRoomForm}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleRoomSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="text"
            value={roomForm.name}
            onChange={(event) => setRoomForm({ name: event.target.value })}
            placeholder="Example: Mateer 209"
            className="w-full sm:flex-1 px-4 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            disabled={isSavingRoom}
          />
          <button
            type="submit"
            disabled={isSavingRoom}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingRoom ? "Saving…" : editingRoom ? "Save changes" : "Add room"}
          </button>
        </form>
      </section>

      <section className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Rooms</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {rooms.length} room{rooms.length === 1 ? "" : "s"} configured
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60 bg-white/40 dark:bg-neutral-900/30 px-4 py-10 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">Loading rooms…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-12 text-center">
            <p className="text-neutral-500 dark:text-neutral-400">No rooms yet. Add one to begin configuring availability.</p>
          </div>
        ) : (
          openRooms.map(({ room, slots }) => (
            <div
              key={room.id}
              className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-900/40 px-5 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{room.name}</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {slots.length} slot{slots.length === 1 ? "" : "s"} configured
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDeleteRoom(room)}
                  disabled={deletingRoomId === room.id}
                  className="px-3 py-2 text-xs font-medium rounded-md border border-rose-400/60 text-rose-500 hover:text-rose-600 disabled:opacity-50"
                >
                  {deletingRoomId === room.id ? "Deleting…" : "Delete room"}
                </button>
                <button
                  onClick={() => handleOpenModal(room)}
                  className="px-3 py-2 text-xs font-medium rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
                >
                  Manage availability
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {activeRoom && selectedSlots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <div className="relative z-10 w-full max-w-3xl rounded-lg border border-neutral-200/80 dark:border-neutral-800/60 bg-white dark:bg-neutral-950 shadow-xl">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{activeRoom.name}</h4>
                <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Room availability</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-5 space-y-6 max-h-[75vh] overflow-y-auto">
              {slotMessage && (
                <div
                  className={`rounded-md border px-4 py-2 text-xs ${
                    slotMessage.type === "success"
                      ? "border-emerald-300/60 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300"
                      : "border-rose-300/60 text-rose-600 dark:border-rose-500/40 dark:text-rose-300"
                  }`}
                >
                  {slotMessage.text}
                </div>
              )}

              {dateRange.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Set a defense period to begin assigning date-specific availability.
                </p>
              ) : (
                dateRange.map(({ iso, label }) => {
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
                          const isExisting = (existingSlotsByDate[iso] ?? []).some(slot => slot.start_time.slice(0, 5) === time);
                          const labelRange = `${time} – ${addMinutesToTime(time, SLOT_INTERVAL_MINUTES)}`;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleToggleSlot(iso, time)}
                              className={`text-xs font-medium rounded-md border px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "bg-white text-neutral-900 border-neutral-900 shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
                                  : "bg-white/60 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500"
                              }`}
                              aria-pressed={isSelected}
                            >
                              <span>{labelRange}</span>
                              {isExisting && (
                                <span className="block text-[10px] text-emerald-500 dark:text-emerald-400 mt-1">
                                  Existing slot
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Slots are saved in 30 minute increments from 9:00 AM to 5:00 PM.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlots}
                  disabled={isSavingSlots}
                  className="px-4 py-2 text-xs font-medium rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingSlots ? "Saving…" : "Save availability"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {roomPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRoomPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950 shadow-xl">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Delete room</h4>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <p>Are you sure you want to remove <span className="font-medium text-neutral-900 dark:text-neutral-100">{roomPendingDelete.name}</span>?</p>
              <p>This action will also delete all saved availability slots for this room.</p>
            </div>
            <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setRoomPendingDelete(null)}
                className="px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteRoom}
                className="px-4 py-2 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

