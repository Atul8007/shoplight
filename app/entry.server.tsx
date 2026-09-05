import { PassThrough } from "node:stream";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { addDocumentResponseHeaders } from "./shopify.server";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const callbackName = isbot(userAgent) ? "onAllReady" : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
      [callbackName]: () => {
        shellRendered = true;
        const body = new PassThrough();
        const absoluteUrl = request.url.startsWith("http")
          ? request.url
          : `${process.env.SHOPIFY_APP_URL || "http://localhost:3000"}${request.url.startsWith("/") ? "" : "/"}${request.url}`;
        const reqForHeaders = request.url.startsWith("http") ? request : new Request(absoluteUrl, request);
        addDocumentResponseHeaders(reqForHeaders, responseHeaders);
        responseHeaders.set("Content-Type", "text/html");
        resolve(new Response(createReadableStreamFromReadable(body), { headers: responseHeaders, status: responseStatusCode }));
        pipe(body);
      },
      onShellError(error: unknown) {
        reject(error);
      },
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) console.error(error);
      },
    });

    setTimeout(abort, 5000);
  });
}

