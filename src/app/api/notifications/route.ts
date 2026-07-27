import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listNotificationsForUser } from "@/lib/db/notifications";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const notifications = await listNotificationsForUser(supabase, user.id);
    return NextResponse.json(notifications);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
