import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as adminService from "@/lib/services/adminService";
import { mapErrorToResponse, ValidationError } from "@/lib/errors/AppError";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("No file provided");
    }

    const result = await adminService.uploadUserAvatar(supabase, user.id, id, file);
    return NextResponse.json({ url: result.publicUrl });
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
