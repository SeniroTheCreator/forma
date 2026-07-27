import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer, { showToast } from "@/store/slices/uiSlice";
import { ToastViewport, TOAST_TIMEOUT_MS } from "./ToastViewport";

function renderWithStore() {
  const store = configureStore({ reducer: { ui: uiReducer } });
  store.dispatch(showToast({ message: "Saved successfully", variant: "success" }));
  render(
    <Provider store={store}>
      <ToastViewport />
    </Provider>
  );
  return store;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastViewport", () => {
  it("exposes dismissal as a real, focusable button with an accessible name", () => {
    renderWithStore();

    // The previous implementation was a bare `<div onClick>`: not focusable, not
    // announced as an interactive control, and not operable by keyboard at all. Asserting
    // the native element (rather than simulating Enter, which jsdom does not translate
    // into a click) is what actually pins the fix: a <button> gets tab focus and
    // Enter/Space activation from the platform.
    const dismiss = screen.getByRole("button", { name: /dismiss notification/i });
    expect(dismiss.tagName).toBe("BUTTON");
    expect(dismiss).not.toHaveAttribute("disabled");

    dismiss.focus();
    expect(dismiss).toHaveFocus();
  });

  it("dismisses the toast when the dismissal button is activated", () => {
    const store = renderWithStore();

    fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));

    expect(store.getState().ui.toasts).toHaveLength(0);
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("still announces the toast to assistive tech via role=status", () => {
    renderWithStore();
    expect(screen.getByRole("status")).toHaveTextContent("Saved successfully");
  });

  it("auto-dismisses the toast after the timeout with no interaction at all", () => {
    vi.useFakeTimers();
    const store = renderWithStore();

    expect(store.getState().ui.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(TOAST_TIMEOUT_MS - 1);
    });
    expect(store.getState().ui.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(store.getState().ui.toasts).toHaveLength(0);
    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });
});
