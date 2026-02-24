import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const selectColumns = "id, person_id, person_type, slot_date, day_of_week, start_time, end_time, created_at";

export async function GET() {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
        .from("availability")
        .select(selectColumns)
        .eq("person_type", "room")
        .order("slot_date", { ascending: true })
        .order("day_of_week", { ascending: true })
        .order("start_time");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
