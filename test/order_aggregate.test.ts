import assert from "node:assert/strict";
import { orderUpdate, selectListings, listingRequest } from "../src/order_aggregate.ts";

const parsed = listingRequest.parse({
  customerId: "c-17",
  query: "desk lamp",
  sources: ["shop.example"]
});
const selected = selectListings([
  { title: "Z lamp", url: "HTTPS://shop.example/item-1", source: "shop.example" },
  { title: "A lamp", url: "https://shop.example/item-1", source: "shop.example" },
  { title: "B lamp", url: "https://shop.example/item-2", source: "shop.example" }
]);

assert.equal(parsed.customerId, "c-17");
assert.deepEqual(selected.map((item) => item.title), ["B lamp", "Z lamp"]);
assert.equal(orderUpdate(parsed.customerId, selected).status, "ready_for_review");
console.log("request boundary and duplicate selection passed");
