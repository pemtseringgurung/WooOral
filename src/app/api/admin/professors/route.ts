import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/session";

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
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing professor id" }, { status: 400 });
  }

  // Check if professor is on any defense committees
  const { data: committees, error: committeeCheckError } = await supabase
    .from("defense_committee")
    .select("id")
    .eq("professor_id", id)
    .limit(1);

  if (committeeCheckError) {
    return NextResponse.json(
      { error: `Failed to check defense assignments: ${committeeCheckError.message}` },
      { status: 500 }
    );
  }

  if (committees && committees.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete this professor because they are assigned to one or more scheduled defenses. Remove those defenses first." },
      { status: 409 }
    );
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
