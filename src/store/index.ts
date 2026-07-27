import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import { notificationsApi } from "./api/notificationsApi";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(notificationsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
