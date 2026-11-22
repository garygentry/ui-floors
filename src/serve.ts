// A static file server for sweeping a built app or a fixture folder without a dev server.
// Unknown paths without an extension fall back to index.html, as a single-page app expects.

import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

export type Served = { base: string; stop: () => void };

export function serveDir(dir: string, port = 0): Served {
  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch(req) {
      const url = new URL(req.url);
      let p = normalize(join(dir, decodeURIComponent(url.pathname)));
      if (!p.startsWith(normalize(dir))) return new Response("forbidden", { status: 403 });
      if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
      else if (!existsSync(p) && !extname(p) && existsSync(p + ".html")) p += ".html";
      else if (!existsSync(p) && !extname(p)) p = join(dir, "index.html");
      if (!existsSync(p)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(p));
    },
  });
  return { base: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true) };
}
