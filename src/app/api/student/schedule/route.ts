import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = getSupabaseAdminClient();

    try {
        const { data: defenses, error } = await supabase
            .from("defenses")
            .select(`
                date,
                time,
                students (name),
                rooms (name),
                defense_committee (
                    professors (name)
                )
            `)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (error) {
            throw new Error(`Defenses fetch error: ${error.message}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = (defenses || []).map((d: any) => ({
            studentName: d.students?.name || "Unknown Student",
            date: d.date,
            time: d.time,
            roomName: d.rooms?.name || "Unknown Room",
            readers: (d.defense_committee || []).map(
                (c: { professors: { name: string } | null }) =>
                    c.professors?.name || "Unknown"
            ),
        }));

        return NextResponse.json({ defenses: formatted });
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
