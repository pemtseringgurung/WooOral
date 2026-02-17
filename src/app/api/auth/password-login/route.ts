import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

type Role = "student" | "professor" | "admin";

const COOKIE_NAME = "woo_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

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

  if (success) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  return NextResponse.json({ success });
}
