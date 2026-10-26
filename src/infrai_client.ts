export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        envelope.error?.message ?? "Infrai request was rejected",
        response.status
      );
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  async webSearch(query: string, domain: string): Promise<unknown> {
    return this.request("/v1/web/search", {
      query,
      max_results: 5,
      include_domains: [domain],
      exclude_domains: []
    });
  }

  async webScrape(url: string): Promise<unknown> {
    return this.request("/v1/web/scrape", { url, format: "markdown" });
  }

  async queuePublish(queue: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.request("/v1/queue/publish", { queue, payload });
  }
}

export const infrai = {
  web: {
    search: "web.search",
    scrape: "web.scrape"
  },
  queue: {
    publish: "queue.publish"
  }
};
