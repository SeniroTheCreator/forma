import { describe, it, expect } from "vitest";
import uiReducer, { showToast, dismissToast, setLocale } from "./uiSlice";

describe("uiSlice", () => {
  it("showToast adds a toast with a generated id", () => {
    const state = uiReducer(undefined, showToast({ message: "Saved", variant: "success" }));
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].message).toBe("Saved");
    expect(state.toasts[0].id).toBeDefined();
  });

  it("dismissToast removes the toast by id", () => {
    let state = uiReducer(undefined, showToast({ message: "Saved", variant: "success" }));
    const id = state.toasts[0].id;
    state = uiReducer(state, dismissToast(id));
    expect(state.toasts).toHaveLength(0);
  });

  it("defaults to English", () => {
    const state = uiReducer(undefined, { type: "@@INIT" });
    expect(state.locale).toBe("en");
  });

  it("setLocale switches the locale", () => {
    const state = uiReducer(undefined, setLocale("el"));
    expect(state.locale).toBe("el");
  });
});
