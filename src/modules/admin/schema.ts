import { z } from "zod";

export const adminScopeValues = ["bookings", "content", "settings", "team"] as const;
export type AdminScopeValue = (typeof adminScopeValues)[number];

export interface AdminUserRecord {
  id: string;
  email: string;
  display_name: string;
  scopes: AdminScopeValue[];
  is_active: boolean;
  created_at: string;
}

export const adminSignInSchema = z.object({
  email: z.string().trim().email("Enter your admin email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),
});

export const adminVerifyTotpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export const adminTeamCreateSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  display_name: z
    .string()
    .trim()
    .min(1, "Enter the staff member's full name.")
    .max(80, "Full name must be 80 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
  scopes: z.array(z.enum(adminScopeValues)).min(1, "Assign at least one scope."),
});

export const adminTeamUpdateSchema = z.object({
  id: z.string().uuid("Invalid team member ID."),
  display_name: z
    .string()
    .trim()
    .min(1, "Full name cannot be empty.")
    .max(80, "Full name must be 80 characters or fewer.")
    .optional(),
  scopes: z.array(z.enum(adminScopeValues)).optional(),
  is_active: z.boolean().optional(),
  reset_totp: z.boolean().optional(),
});
