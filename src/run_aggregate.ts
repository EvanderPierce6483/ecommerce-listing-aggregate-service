import { InfraiClient, infrai } from "./infrai_client.ts";
import { listingRequest, orderUpdate, selectListings, type Listing } from "./order_aggregate.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

const input = listingRequest.parse({
  customerId: process.env.CUSTOMER_ID ?? "demo-customer",
  query: process.env.LISTING_QUERY ?? "wireless blood pressure monitor",
  sources: (process.env.SOURCES ?? "amazon.com,walmart.com").split(",")
});

const client = new InfraiClient(key);
const listings: Listing[] = [];
for (const source of input.sources) {
  const searchResult = await client.webSearch(input.query, source);
  await client.queuePublish("listing-source-updates", {
    eventId: `${input.customerId}:${source}:${input.query}`,
    customerId: input.customerId,
    source,
    searchResult
  });
  const candidate = searchResult as { url?: string };
  if (candidate.url) {
    const scraped = await client.webScrape(candidate.url);
    listings.push({ title: input.query, url: candidate.url, source, price: String(scraped) });
  }
}

console.log(JSON.stringify({
  capabilities: [infrai.web.search, infrai.web.scrape, infrai.queue.publish],
  update: orderUpdate(input.customerId, selectListings(listings))
}, null, 2));
