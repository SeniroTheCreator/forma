import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

export type Locale = "en" | "el";

interface UiState {
  toasts: Toast[];
  sidebarCollapsed: boolean;
  locale: Locale;
}

const initialState: UiState = { toasts: [], sidebarCollapsed: false, locale: "en" };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(payload: { message: string; variant: Toast["variant"] }) {
        return { payload: { id: nanoid(), ...payload } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
  },
});

export const { showToast, dismissToast, toggleSidebar, setLocale } = uiSlice.actions;
export default uiSlice.reducer;
export const selectToasts = (state: { ui: UiState }) => state.ui.toasts;
export const selectLocale = (state: { ui: UiState }) => state.ui.locale;
