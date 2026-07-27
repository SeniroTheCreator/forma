import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as notificationService from "@/lib/services/notificationService";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const notifications = await notificationService.listForUser(supabase, user.id);
    return NextResponse.json(notifications);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
