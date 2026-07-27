import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as notificationService from "@/lib/services/notificationService";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Every other route handler in this codebase authenticates first and goes through a
    // service; this one used to call the db layer straight through with no auth check at
    // all, leaving RLS as the only thing between an anonymous caller and the table.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    await notificationService.markRead(supabase, user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
