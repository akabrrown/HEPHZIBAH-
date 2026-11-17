import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { getPublicLegalDocument } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Website use, commissioned photography, videography, and design terms for Hephzibah Media.",
};

export default async function TermsPage() {
  const { current, history } = await getPublicLegalDocument("terms");
  return <LegalDocumentView current={current} history={history} />;
}
