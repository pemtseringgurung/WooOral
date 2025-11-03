import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const selectColumns = "id, person_id, person_type, slot_date, day_of_week, start_time, end_time, created_at";

type AvailabilityPayload = {
  id?: string;
  person_id: string;
  person_type: "professor";
  slot_date: string;
  day_of_week?: string | null;
  start_time: string;
  end_time: string;
};

type SlotRequest = {
  slot_date: string;
  start_time: string;
  end_time: string;
  id?: string;
  professor_id?: string;
};

type AvailabilityRecord = {
  id: string;
  person_id: string;
  person_type: "professor";
  slot_date: string | null;
  day_of_week: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
};

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("availability")
    .select(selectColumns)
    .eq("person_type", "professor")
    .order("slot_date", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const body = await request.json().catch(() => null);

  const { professor_id, id, slot_date, day_of_week, start_time, end_time, slots } = body ?? {};

  if (!professor_id && !Array.isArray(slots)) {
    return NextResponse.json({ error: "professor_id or slots array required" }, { status: 400 });
  }

  const records: AvailabilityPayload[] = Array.isArray(slots)
    ? (slots as SlotRequest[]).map((slot) => ({
        person_id: slot.professor_id ?? professor_id,
        person_type: "professor",
        slot_date: slot.slot_date,
        day_of_week: null,
        start_time: slot.start_time,
        end_time: slot.end_time,
        id: slot.id
      }))
    : [
        {
          person_id: professor_id,
          person_type: "professor",
          slot_date: slot_date as string,
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

  const results: AvailabilityRecord[] = [];

  if (toInsert.length > 0) {
    const insertPayloads = toInsert.map((record) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignore, ...rest } = record;
      return rest;
    });

    const { data, error } = await supabase
      .from("availability")
      .insert(insertPayloads)
      .select(selectColumns);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    results.push(...((data ?? []) as AvailabilityRecord[]));
  }

  if (toUpdate.length > 0) {
    for (const record of toUpdate) {
      const { id: recordId, ...payload } = record;
      const { data, error } = await supabase
        .from("availability")
        .update(payload)
        .eq("id", recordId!)
        .eq("person_type", "professor")
        .select(selectColumns)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      results.push(data as AvailabilityRecord);
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
    .eq("person_type", "professor");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
