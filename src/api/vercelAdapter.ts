type NodeHeaderValue = string | string[] | undefined;

type NodeLikeRequest = {
  headers: Record<string, NodeHeaderValue>;
  method?: string;
  url?: string;
};

type NodeLikeResponse = {
  end: (chunk?: string | Uint8Array) => void;
  setHeader: (name: string, value: string | string[]) => void;
  statusCode: number;
};

function normalizeHeaders(
  headers: Record<string, NodeHeaderValue>
): Headers {
  const normalized = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        normalized.append(key, entry);
      }
      continue;
    }

    normalized.set(key, value);
  }

  return normalized;
}

function buildRequestUrl(request: NodeLikeRequest): string {
  const protocolHeader = request.headers["x-forwarded-proto"];
  const hostHeader = request.headers.host;

  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || "https";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || "localhost";
  const path = request.url || "/";

  return `${protocol}://${host}${path}`;
}

export function createVercelHandler(
  handler: (request: Request) => Promise<Response>
): (request: NodeLikeRequest, response: NodeLikeResponse) => Promise<void> {
  return async function vercelHandler(
    request: NodeLikeRequest,
    response: NodeLikeResponse
  ): Promise<void> {
    const webRequest = new Request(buildRequestUrl(request), {
      headers: normalizeHeaders(request.headers),
      method: request.method || "GET",
    });

    const webResponse = await handler(webRequest);
    response.statusCode = webResponse.status;

    webResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    const body = await webResponse.arrayBuffer();
    response.end(Buffer.from(body));
  };
}
