import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { getPublicLegalDocument } from "@/modules/content-legal/service";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Hephzibah Media collects, stores, and protects booking and enquiry data under Ghana Act 843.",
};

export default async function PrivacyPage() {
  const { current, history } = await getPublicLegalDocument("privacy");
  return <LegalDocumentView current={current} history={history} />;
}
