import { z } from "zod";

// Characters that are STRUCTURAL in PostgREST's filter DSL, which `adminService.listUsers`
// builds an `or=(...)` filter with: `,` separates the conditions, `(`/`)` group them, and
// `"`/`\` are its value-quoting and escape characters. A `.` is deliberately NOT in this
// set: PostgREST splits each condition into `column.operator.value` on the first two dots
// only, so dots inside the value are literal — and rejecting them would break searching
// for an email address, which is the primary use of this box.
//
// adminService escapes the term as a quoted PostgREST literal regardless (see
// `toPostgrestLiteral` there); this schema is the "every input goes through zod at the
// route boundary" half of that, and gives the caller a clear 400 instead of a filter that
// silently matched nothing.
const POSTGREST_STRUCTURAL_CHARS = /["(),\\]/;

export const listUsersQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, "Search term must be 100 characters or fewer")
    .refine((value) => !POSTGREST_STRUCTURAL_CHARS.test(value), {
      message: 'Search term may not contain any of: " ( ) , \\',
    })
    .optional(),
  page: z.coerce.number().int().min(1, "Page must be 1 or greater").max(100000).default(1),
});

export const updateUserSchema = z
  .object({
    role: z.string().min(1).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
  })
  .refine(
    (body) => body.role !== undefined || body.status !== undefined || body.firstName !== undefined || body.lastName !== undefined,
    { message: "Request must include a role, status, or profile change" }
  );

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
