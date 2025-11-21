import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = getSupabaseAdminClient();

    try {
        // 1. Fetch Defense Period
        const { data: period, error: periodError } = await supabase
            .from("oral_time_period")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (periodError && periodError.code !== "PGRST116") {
            throw new Error(`Period error: ${periodError.message}`);
        }

        // 2. Fetch Rooms
        const { data: rooms, error: roomsError } = await supabase
            .from("rooms")
            .select("*")
            .order("name");

        if (roomsError) throw new Error(`Rooms error: ${roomsError.message}`);

        // 3. Fetch Professors
        const { data: professors, error: professorsError } = await supabase
            .from("professors")
            .select("*")
            .order("name");

        if (professorsError) throw new Error(`Professors error: ${professorsError.message}`);

        // 4. Fetch Availability (All)
        const { data: availability, error: availabilityError } = await supabase
            .from("availability")
            .select("*");

        if (availabilityError) throw new Error(`Availability error: ${availabilityError.message}`);

        // 5. Fetch Existing Defenses
        const { data: defenses, error: defensesError } = await supabase
            .from("defenses")
            .select("room_id, date, time, defense_committee(professor_id)");

        if (defensesError) throw new Error(`Defenses error: ${defensesError.message}`);

        return NextResponse.json({
            period: period || null,
            rooms: rooms || [],
            professors: professors || [],
            availability: availability || [],
            defenses: defenses || []
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
