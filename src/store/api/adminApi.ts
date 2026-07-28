import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface AdminUserDto {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AdminUserDetailDto extends AdminUserDto {
  role: string | null;
}

export interface ListUsersResponse {
  users: AdminUserDto[];
  total: number;
}

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/admin" }),
  tagTypes: ["AdminUser"],
  endpoints: (builder) => ({
    listUsers: builder.query<ListUsersResponse, { search?: string; page: number }>({
      query: ({ search, page }) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("page", String(page));
        return `/users?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.users.map((u) => ({ type: "AdminUser" as const, id: u.id })),
              { type: "AdminUser" as const, id: "LIST" },
            ]
          : [{ type: "AdminUser" as const, id: "LIST" }],
    }),
    getUser: builder.query<AdminUserDetailDto, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "AdminUser" as const, id }],
    }),
    changeRole: builder.mutation<{ success: boolean }, { id: string; role: string }>({
      query: ({ id, role }) => ({ url: `/users/${id}`, method: "PATCH", body: { role } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminUser" as const, id },
        { type: "AdminUser" as const, id: "LIST" },
      ],
    }),
    setStatus: builder.mutation<{ success: boolean }, { id: string; status: "active" | "suspended" }>({
      query: ({ id, status }) => ({ url: `/users/${id}`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminUser" as const, id },
        { type: "AdminUser" as const, id: "LIST" },
      ],
    }),
    updateProfile: builder.mutation<{ success: boolean }, { id: string; firstName?: string; lastName?: string }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminUser" as const, id },
        { type: "AdminUser" as const, id: "LIST" },
      ],
    }),
    uploadAvatar: builder.mutation<{ url: string }, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({ url: `/users/${id}/avatar`, method: "POST", body: formData }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminUser" as const, id },
        { type: "AdminUser" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useChangeRoleMutation,
  useSetStatusMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} = adminApi;
