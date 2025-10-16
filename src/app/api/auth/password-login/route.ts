import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type Role = "student" | "professor" | "admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { role, password }: { role?: Role; password?: string } = body ?? {};

  if (!role || !password) {
    return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
  }

  if (!["student", "professor", "admin"].includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("passwords")
    .select("student_password, professor_password, admin_password")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "Password store not found" }, { status: 500 });
  }

  const expected =
    role === "student"
      ? data.student_password
      : role === "professor"
      ? data.professor_password
      : data.admin_password;

  const success = expected === password;

  return NextResponse.json({ success });
}
