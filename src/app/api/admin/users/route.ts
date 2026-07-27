import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as adminService from "@/lib/services/adminService";
import { listUsersQuerySchema } from "@/lib/validation/adminSchemas";
import { mapErrorToResponse, ValidationError } from "@/lib/errors/AppError";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const parsed = listUsersQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query");

    const { search, page } = parsed.data;
    const result = await adminService.listUsers(supabase, user.id, { search: search || undefined, page });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
