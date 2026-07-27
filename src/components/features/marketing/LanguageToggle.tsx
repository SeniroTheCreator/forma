"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectLocale, setLocale, type Locale } from "@/store/slices/uiSlice";

const STORAGE_KEY = "forma-locale";

export function LanguageToggle() {
  const locale = useSelector(selectLocale);
  const dispatch = useDispatch();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "el") {
      dispatch(setLocale(saved));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: Locale) {
    dispatch(setLocale(next));
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => choose("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          locale === "en" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => choose("el")}
        aria-pressed={locale === "el"}
        className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
          locale === "el" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ΕΛ
      </button>
    </div>
  );
}
