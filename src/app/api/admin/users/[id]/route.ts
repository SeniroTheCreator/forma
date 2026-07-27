import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as adminService from "@/lib/services/adminService";
import { updateUserSchema } from "@/lib/validation/adminSchemas";
import { mapErrorToResponse, ValidationError } from "@/lib/errors/AppError";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const result = await adminService.getUserById(supabase, user.id, id);
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const parsed = updateUserSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
    const body = parsed.data;

    if (body.role) {
      await adminService.changeUserRole(supabase, user.id, id, body.role);
    }
    if (body.status) {
      await adminService.setAccountStatus(supabase, user.id, id, body.status);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
