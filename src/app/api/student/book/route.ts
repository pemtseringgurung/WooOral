import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    const supabase = getSupabaseAdminClient();

    try {
        const body = await request.json();
        const { studentName, studentEmail, roomId, professorIds, date, time } = body;

        // Basic Validation
        if (!studentName || !studentEmail || !roomId || !date || !time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!Array.isArray(professorIds) || professorIds.length !== 2) {
            return NextResponse.json({ error: "Exactly 2 professors must be selected" }, { status: 400 });
        }

        // 1. Upsert Student
        // Check if student exists
        let studentId;
        const { data: existingStudent, error: fetchError } = await supabase
            .from("students")
            .select("id")
            .eq("email", studentEmail)
            .single();

        if (fetchError && fetchError.code !== "PGRST116") {
            throw new Error(`Student fetch error: ${fetchError.message}`);
        }

        if (existingStudent) {
            studentId = existingStudent.id;
            // Optional: Update name if changed? For now, let's just use the ID.
        } else {
            // Create new student
            const { data: newStudent, error: createError } = await supabase
                .from("students")
                .insert([{ name: studentName, email: studentEmail }])
                .select("id")
                .single();

            if (createError) throw new Error(`Student creation error: ${createError.message}`);
            studentId = newStudent.id;
        }

        // 2. Create Defense
        const { data: defense, error: defenseError } = await supabase
            .from("defenses")
            .insert([{
                student_id: studentId,
                room_id: roomId,
                date: date,
                time: time
            }])
            .select("id")
            .single();

        if (defenseError) {
            // Handle double booking error gracefully if possible, but unique constraint will catch it
            if (defenseError.code === "23505") {
                return NextResponse.json({ error: "This slot has just been taken. Please choose another." }, { status: 409 });
            }
            throw new Error(`Defense creation error: ${defenseError.message}`);
        }

        const defenseId = defense.id;

        // 3. Create Committee Members
        const committeeInserts = professorIds.map(profId => ({
            defense_id: defenseId,
            professor_id: profId
        }));

        const { error: committeeError } = await supabase
            .from("defense_committee")
            .insert(committeeInserts);

        if (committeeError) {
            // Rollback defense if committee fails? 
            // Ideally we'd use a transaction/RPC, but for now let's just error out.
            // Manual cleanup:
            await supabase.from("defenses").delete().eq("id", defenseId);
            throw new Error(`Committee assignment error: ${committeeError.message}`);
        }

        return NextResponse.json({ success: true, defenseId });

    } catch (error: any) {
        console.error("Booking error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
