import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
    const supabase = getSupabaseAdminClient();

    // Fetch all defenses along with student name, room name, and committee info
    const { data, error } = await supabase
        .from("defenses")
        .select(`
      id,
      date,
      time,
      students ( name ),
      rooms ( name ),
      defense_committee ( professor_id )
    `)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
