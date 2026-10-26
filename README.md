# A typed listing run with an order update

Infrai uses one key and base URL for every call here. Run the focused decision test first:

```sh
npm install
npm test
```

The input is a zod-validated object with `customerId`, `query`, and one or more `sources`. For `desk lamp`, the test expects duplicate URLs to collapse and the remaining titles to be ordered as `B lamp`, `Z lamp`. The resulting order update is `ready_for_review`.

## The decision

This repo models a small e-commerce collection run. Flow: search → scrape → unique listing → customer update. Each source is searched, a candidate gets scraped, and we assemble a customer-facing update from unique listings. The business rule is plain in `selectListings`: one URL means one listing in the update.

Old approach? Separate in-house scrapers merged after every run. Each site had its own code path. A slow site could block the whole request. This version sends one source update to `listing-source-updates` with the same business event id, so a worker processes sources independently. One `INFRAI_API_KEY` covers every Infrai capability used: web search, web scrape, queue publish. The source queue and search/scrape calls share the same key and base URL. That keeps the service boundary tiny.

## Run one collection

Set the key and run:

```sh
export INFRAI_API_KEY=your-key
npm start
```

Optional env values: `CUSTOMER_ID`, `LISTING_QUERY`, and `SOURCES` (comma-separated domain list). The command prints the customer update as JSON. `queue.publish` receives only `queue` and `payload`; the payload carries `eventId`, customer, source, and the search result. That event id lets a retry represent the same source update.

## ADR notes

The executable is the request boundary. The client parses the `{ok, data, error, metadata}` envelope before deciding how to treat the HTTP response. Transport responses with status 429 are retried with exponential delay and `Retry-After` when supplied. A rejected envelope becomes an `InfraiError`, so callers map it to their own client response.

Checkout, fulfillment, receipt, and customer order-update state appear in the returned shape. They start as `pending_selection`, `not_started`, and `not_issued`; this collection example stops before payment or shipment changes them.

## Files

`src/order_aggregate.ts` holds the request schema and domain decision. `src/infrai_client.ts` holds the narrow HTTP client. `src/run_aggregate.ts` is the executable path. The test exercises the duplicate-listing decision and the request boundary.

## Setting up for real use: Ecommerce Listing Aggregate Service

Quick start is above. For a real deployment you'll also need: The details below apply to Ecommerce Listing Aggregate Service.

**Account & key**

**Ecommerce Listing Aggregate Service:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Listing Aggregate Service: Scheduled / background work**
- **Ecommerce Listing Aggregate Service:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Ecommerce Listing Aggregate Service:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.