import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as adminService from "@/lib/services/adminService";
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

    const body = (await req.json()) as { role?: string; status?: "active" | "suspended" };

    if (!body.role && !body.status) {
      throw new ValidationError("Request must include a role or status change");
    }

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
