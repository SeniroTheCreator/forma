import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationDto[], void>({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markAsRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { useListNotificationsQuery, useMarkAsReadMutation } = notificationsApi;
