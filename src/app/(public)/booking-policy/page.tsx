import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { getPublicLegalDocument } from "@/modules/content-legal/service";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Booking, Cancellation and Refund Policy",
  description: "Quotes, deposit rules, date locking, rescheduling, and cancellation terms for Hephzibah Media.",
};

export default async function BookingPolicyPage() {
  const { current, history } = await getPublicLegalDocument("booking-policy");
  return <LegalDocumentView current={current} history={history} />;
}
