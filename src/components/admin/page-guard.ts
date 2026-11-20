import { redirect } from "next/navigation";
import { requireAdmin, type AdminSessionPayload } from "@/lib/auth";
import { ProblemError } from "@/lib/errors";
import type { AdminScopeValue } from "@/modules/admin/schema";

export async function resolveAdminPageSession(
  requiredScope?: AdminScopeValue
): Promise<AdminSessionPayload | null> {
  try {
    return await requireAdmin(requiredScope);
  } catch (err) {
    if (err instanceof ProblemError) {
      if (err.status === 403 && err.code === "forbidden") {
        return null;
      }
      if (err.status === 401 || err.code === "mfa_required") {
        redirect("/admin/sign-in");
      }
    }
    throw err;
  }
}
