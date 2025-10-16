import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("oral_time_period")
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
  const { id, period_start, period_end } = body;

  if (!period_start || !period_end) {
    return NextResponse.json(
      { error: "Missing period_start or period_end" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const payload = { period_start, period_end };

  let response;

  if (id) {
    response = await supabase
      .from("oral_time_period")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    response = await supabase
      .from("oral_time_period")
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
