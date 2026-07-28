"use client";

import { useSelector } from "react-redux";
import { selectLocale } from "@/store/slices/uiSlice";
import { dictionary, type Dictionary } from "@/lib/i18n/dictionary";

export function useTranslation(): { locale: ReturnType<typeof selectLocale>; t: Dictionary } {
  const locale = useSelector(selectLocale);
  return { locale, t: dictionary[locale] };
}
