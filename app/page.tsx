import type { Metadata } from "next";
import CmntToDmLanding from "@/components/cmnttodm-landing";

export const metadata: Metadata = {
  title: "[CmntToDm] // High-Velocity Instagram Comment-to-DM Engine",
  description:
    "Direct-response Instagram direct message infrastructure. Zero fluff. Turn comments into DMs, trackable links, and sales in sub-second speed with 100% official Meta Graph API compliance.",
  keywords: [
    "CmntToDm",
    "instagram automation",
    "comment to dm",
    "instagram direct reply",
    "social commerce",
    "meta graph api",
    "openreply",
  ],
  openGraph: {
    title: "[CmntToDm] // Instant Instagram Comment-to-DM Engine",
    description:
      "Someone comments a keyword. They get your link in their DMs in one second. Zero friction. 100% automated delivery.",
    type: "website",
  },
};

export default function Page() {
  return <CmntToDmLanding />;
}
