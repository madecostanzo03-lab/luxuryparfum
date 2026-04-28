import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/image-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const raw = requestUrl.searchParams.get("url");
        if (!raw) return new Response("Missing url", { status: 400 });

        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }

        if (target.protocol !== "https:") {
          return new Response("Only https images are allowed", { status: 400 });
        }

        const upstream = await fetch(target.toString(), {
          headers: {
            accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (compatible; LuxuryParfumImagePreview/1.0)",
          },
        });

        if (!upstream.ok || !upstream.body) {
          return new Response("Image fetch failed", { status: 502 });
        }

        const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          return new Response("Not an image", { status: 415 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=86400",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
