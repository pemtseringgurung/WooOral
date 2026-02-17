import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendBookingEmails } from "@/lib/email";

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
        } else {
            const { data: newStudent, error: createError } = await supabase
                .from("students")
                .insert([{ name: studentName, email: studentEmail }])
                .select("id")
                .single();

            if (createError) throw new Error(`Student creation error: ${createError.message}`);
            studentId = newStudent.id;
        }

        // Check if student already has a defense booked
        const { data: existingDefense } = await supabase
            .from("defenses")
            .select("id")
            .eq("student_id", studentId)
            .limit(1);

        if (existingDefense && existingDefense.length > 0) {
            return NextResponse.json(
                { error: "You already have a defense scheduled. Please contact an administrator to reschedule." },
                { status: 409 }
            );
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
            if (defenseError.code === "23505") {
                return NextResponse.json({ error: "This slot has just been taken. Please choose another." }, { status: 409 });
            }
            throw new Error(`Defense creation error: ${defenseError.message}`);
        }

        const defenseId = defense.id;

        // 3. Create Committee Members
        const committeeInserts = professorIds.map((profId: string) => ({
            defense_id: defenseId,
            professor_id: profId
        }));

        const { error: committeeError } = await supabase
            .from("defense_committee")
            .insert(committeeInserts);

        if (committeeError) {
            await supabase.from("defenses").delete().eq("id", defenseId);
            throw new Error(`Committee assignment error: ${committeeError.message}`);
        }

        // 4. Send confirmation emails (fire-and-forget, don't block response)
        console.log("professorIds from request:", professorIds);

        const { data: professors, error: profFetchError } = await supabase
            .from("professors")
            .select("name, email")
            .in("id", professorIds);

        console.log("professors fetched for email:", professors);
        if (profFetchError) console.error("Prof fetch error:", profFetchError);

        const { data: room } = await supabase
            .from("rooms")
            .select("name")
            .eq("id", roomId)
            .single();

        sendBookingEmails({
            studentName,
            studentEmail,
            professors: professors ?? [],
            date,
            time,
            roomName: room?.name ?? "TBD",
        }).catch((err) => console.error("Email send error:", err));

        return NextResponse.json({ success: true, defenseId });

    } catch (error: unknown) {
        console.error("Booking error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
