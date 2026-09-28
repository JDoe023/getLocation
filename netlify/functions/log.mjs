import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body = {};
  try { body = await req.json(); } catch {}

  const geo = context.geo || {};
  const record = {
    time: new Date().toISOString(),
    ip: context.ip,
    userAgent: (req.headers.get("user-agent") || "").slice(0, 300),
    permission: String(body.permission || "unknown").slice(0, 200),
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    accuracyMeters: typeof body.accuracyMeters === "number" ? body.accuracyMeters : null,
    ipCity: geo.city || null,
    ipRegion: geo.subdivision?.name || null,
    ipCountry: geo.country?.name || null,
  };

  const store = getStore("visits");
  await store.setJSON(`${Date.now()}-${crypto.randomUUID()}`, record);

  return Response.json({ ok: true });
};

export const config = { path: "/api/log" };