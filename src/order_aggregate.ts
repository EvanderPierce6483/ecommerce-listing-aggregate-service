import { z } from "zod";

export const listingRequest = z.object({
  customerId: z.string().min(1),
  query: z.string().min(2),
  sources: z.array(z.string().min(1)).min(1).max(5)
});

export type ListingRequest = z.infer<typeof listingRequest>;

export type Listing = {
  title: string;
  url: string;
  source: string;
  price?: string;
};

export function selectListings(listings: Listing[], limit = 10): Listing[] {
  const seen = new Set<string>();
  return listings
    .filter((listing) => {
      const identity = listing.url.trim().toLowerCase();
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function orderUpdate(customerId: string, listings: Listing[]) {
  return {
    customerId,
    checkout: "pending_selection" as const,
    fulfillment: "not_started" as const,
    receipt: "not_issued" as const,
    status: "ready_for_review" as const,
    listingCount: listings.length,
    listings
  };
}
