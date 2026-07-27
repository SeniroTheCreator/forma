import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/db/notifications";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await markNotificationRead(supabase, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
