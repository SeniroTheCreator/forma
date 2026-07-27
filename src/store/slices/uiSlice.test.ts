import { describe, it, expect } from "vitest";
import uiReducer, { showToast, dismissToast } from "./uiSlice";

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
});
