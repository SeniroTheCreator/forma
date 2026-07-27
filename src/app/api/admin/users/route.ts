import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as adminService from "@/lib/services/adminService";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const result = await adminService.listUsers(supabase, user.id, { search, page });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
