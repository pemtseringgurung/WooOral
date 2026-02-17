import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdminClient();
  const body = await request.json().catch(() => null);

  const name = body?.name?.trim();
  const id = body?.id as string | undefined;

  if (!name) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 });
  }

  const table = supabase.from("rooms");

  let duplicateQuery = table
    .select("id")
    .ilike("name", name)
    .limit(1);

  if (id) {
    duplicateQuery = duplicateQuery.neq("id", id);
  }

  const { data: duplicates, error: duplicateError } = await duplicateQuery;

  if (duplicateError) {
    return NextResponse.json({ error: duplicateError.message }, { status: 400 });
  }

  if (duplicates && duplicates.length > 0) {
    return NextResponse.json({ error: "A room with that name already exists" }, { status: 409 });
  }

  if (id) {
    const { data, error } = await table
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  }

  const { data, error } = await table
    .insert([
      {
        name
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing room id" }, { status: 400 });
  }

  // Check if room is used in any defenses
  const { data: roomDefenses, error: defenseCheckError } = await supabase
    .from("defenses")
    .select("id")
    .eq("room_id", id)
    .limit(1);

  if (defenseCheckError) {
    return NextResponse.json(
      { error: `Failed to check defense assignments: ${defenseCheckError.message}` },
      { status: 500 }
    );
  }

  if (roomDefenses && roomDefenses.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete this room because it is assigned to one or more scheduled defenses. Remove those defenses first." },
      { status: 409 }
    );
  }

  const availabilityResponse = await supabase
    .from("availability")
    .delete()
    .eq("person_id", id)
    .eq("person_type", "room");

  if (availabilityResponse.error) {
    return NextResponse.json({ error: availabilityResponse.error.message }, { status: 400 });
  }

  const roomResponse = await supabase.from("rooms").delete().eq("id", id);

  if (roomResponse.error) {
    return NextResponse.json({ error: roomResponse.error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

