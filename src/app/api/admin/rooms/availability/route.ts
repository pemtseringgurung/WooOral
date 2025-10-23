import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const selectColumns = "id, person_id, person_type, slot_date, day_of_week, start_time, end_time, created_at";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("availability")
    .select(selectColumns)
    .eq("person_type", "room")
    .order("slot_date", { ascending: true, nulls: "first" })
    .order("day_of_week", { ascending: true, nulls: "last" })
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const body = await request.json().catch(() => null);

  const { room_id, id, slot_date, day_of_week, start_time, end_time, slots } = body ?? {};

  if (!room_id && !Array.isArray(slots)) {
    return NextResponse.json({ error: "room_id or slots array required" }, { status: 400 });
  }

  const records = Array.isArray(slots)
    ? slots.map((slot: any) => ({
        person_id: room_id ?? slot.room_id,
        person_type: "room" as const,
        slot_date: slot.slot_date ?? slot.date ?? null,
        day_of_week: slot.day_of_week ?? null,
        start_time: slot.start_time,
        end_time: slot.end_time,
        id: slot.id
      }))
    : [
        {
          person_id: room_id,
          person_type: "room" as const,
          slot_date: slot_date ?? null,
          day_of_week: day_of_week ?? null,
          start_time,
          end_time,
          id
        }
      ];

  if (records.some((r) => !r.person_id || !r.start_time || !r.end_time || !r.slot_date)) {
    return NextResponse.json({ error: "slot_date and start/end times are required" }, { status: 400 });
  }

  const toInsert = records.filter((r) => !r.id);
  const toUpdate = records.filter((r) => r.id);

  const results: any[] = [];

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("availability")
      .insert(
        toInsert.map(({ id: _id, ...rest }) => rest)
      )
      .select(selectColumns);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    results.push(...(data ?? []));
  }

  if (toUpdate.length > 0) {
    for (const record of toUpdate) {
      const { id: recordId, ...payload } = record;
      const { data, error } = await supabase
        .from("availability")
        .update(payload)
        .eq("id", recordId!)
        .eq("person_type", "room")
        .select(selectColumns)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      results.push(data);
    }
  }

  return NextResponse.json(results, { status: 200 });
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing availability id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("id", id)
    .eq("person_type", "room");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

