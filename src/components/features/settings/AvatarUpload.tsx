"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useDispatch } from "react-redux";
import { uploadAvatarAction } from "@/app/(dashboard)/actions";
import { showToast } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";

export function AvatarUpload({ initialAvatarUrl }: { initialAvatarUrl?: string | null }) {
  const dispatch = useDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [serverError, setServerError] = useState<string>();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setServerError(undefined);

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (result.error) {
        setServerError(result.error);
        dispatch(showToast({ message: result.error, variant: "error" }));
      } else if (result.url) {
        setAvatarUrl(result.url);
        dispatch(showToast({ message: "Avatar updated successfully", variant: "success" }));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Supabase Storage, not a static/optimizable local asset
          <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">No avatar</span>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload avatar"
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isPending}>
          {isPending ? "Uploading..." : "Upload avatar"}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
        {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
      </div>
    </div>
  );
}
