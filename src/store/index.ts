import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import { notificationsApi } from "./api/notificationsApi";
import { adminApi } from "./api/adminApi";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(notificationsApi.middleware, adminApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
