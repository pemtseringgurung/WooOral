import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("professors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing professor id" }, { status: 400 });
  }

  // First, delete all availability slots for this professor
  const { error: availabilityError } = await supabase
    .from("availability")
    .delete()
    .eq("person_type", "professor")
    .eq("person_id", id);

  if (availabilityError) {
    return NextResponse.json(
      { error: `Failed to delete professor availability: ${availabilityError.message}` },
      { status: 400 }
    );
  }

  // Then delete the professor
  const { error: professorError } = await supabase
    .from("professors")
    .delete()
    .eq("id", id);

  if (professorError) {
    return NextResponse.json(
      { error: `Failed to delete professor: ${professorError.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
