import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/sign-in-form";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage() {
  const session = await getAdminSession();
  if (session?.aal === "aal2") {
    redirect("/admin");
  }

  return <AdminSignInForm showLocalHint={process.env.NODE_ENV !== "production"} />;
}
