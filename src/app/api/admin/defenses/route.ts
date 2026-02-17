import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabase = getSupabaseAdminClient();

    try {
        // Fetch all defenses with related data
        const { data: defenses, error } = await supabase
            .from("defenses")
            .select(`
                id,
                date,
                time,
                students (id, name, email),
                rooms (id, name),
                defense_committee (
                    professor_id,
                    professors (id, name)
                )
            `)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (error) {
            throw new Error(`Defenses fetch error: ${error.message}`);
        }

        // Transform data for easier consumption
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedDefenses = (defenses || []).map((defense: any) => ({
            id: defense.id,
            date: defense.date,
            time: defense.time,
            studentName: defense.students?.name || "Unknown Student",
            studentEmail: defense.students?.email || "",
            roomName: defense.rooms?.name || "Unknown Room",
            readers: (defense.defense_committee || []).map(
                (c: { professors: { name: string } | null }) => c.professors?.name || "Unknown"
            )
        }));

        return NextResponse.json({ defenses: formattedDefenses });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing defense id" }, { status: 400 });
    }

    try {
        // 1. Delete committee assignments first (foreign key)
        const { error: committeeError } = await supabase
            .from("defense_committee")
            .delete()
            .eq("defense_id", id);

        if (committeeError) {
            throw new Error(`Committee deletion error: ${committeeError.message}`);
        }

        // 2. Delete the defense row
        const { error: defenseError } = await supabase
            .from("defenses")
            .delete()
            .eq("id", id);

        if (defenseError) {
            throw new Error(`Defense deletion error: ${defenseError.message}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
