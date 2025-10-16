import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("passwords")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    id,
    student_password,
    professor_password,
    admin_password
  } = body;

  if (!student_password || !professor_password || !admin_password) {
    return NextResponse.json(
      { error: "Missing password values" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const payload = {
    student_password,
    professor_password,
    admin_password
  };

  let response;

  if (id) {
    response = await supabase
      .from("passwords")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    response = await supabase
      .from("passwords")
      .insert([payload])
      .select()
      .single();
  }

  if (response.error) {
    return NextResponse.json(
      { error: response.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(response.data);
}
