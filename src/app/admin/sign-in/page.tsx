import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/sign-in-form";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

function sanitizeReturnTo(raw?: string): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw === "/admin/sign-in") {
    return "/admin";
  }
  return raw;
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const resolved = await searchParams;
  const returnTo = sanitizeReturnTo(resolved.returnTo);

  try {
    await requireAdmin();
    redirect(returnTo);
  } catch (err) {
    // redirect() throws a special NEXT_REDIRECT error — rethrow it cleanly
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
  }

  return <AdminSignInForm showLocalHint={process.env.NODE_ENV !== "production"} returnTo={returnTo} />;
}
