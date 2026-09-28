import { getStore } from "@netlify/blobs";

const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async (req) => {
    const pass = process.env.ADMIN_PASSWORD;

    if (!pass) {
        return new Response(
            "ADMIN_PASSWORD is not visible to this function. Check its scopes include Functions, then redeploy.",
            { status: 500 }
        );
    }

    const key = new URL(req.url).searchParams.get("key");
    if (key !== pass.trim()) {
        return new Response("Forbidden", { status: 403 });
    }


    const store = getStore("visits");
    const { blobs } = await store.list();
    const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 300); // newest 300
    const rows = (await Promise.all(keys.map((k) => store.get(k, { type: "json" })))).filter(Boolean);

    const tr = rows.map((r) => {
        const gps = r.latitude !== null
            ? `<a href="https://www.google.com/maps?q=${r.latitude},${r.longitude}" target="_blank" rel="noopener">${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}</a>`
            : "-";
        return `<tr>
      <td>${esc(r.time)}</td><td>${esc(r.ip)}</td><td>${esc(r.permission)}</td>
      <td>${gps}</td>
      <td>${r.accuracyMeters !== null ? Math.round(r.accuracyMeters) + " m" : "-"}</td>
      <td>${esc([r.ipCity, r.ipRegion, r.ipCountry].filter(Boolean).join(", ") || "-")}</td>
      <td>${esc(r.userAgent)}</td></tr>`;
    }).join("");

    return new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Visits</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px}
    table{border-collapse:collapse;width:100%;font-size:14px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f4f4f4}</style></head><body>
    <h1>Visits (${rows.length})</h1>
    <table><tr><th>Time (UTC)</th><th>IP</th><th>Permission</th><th>GPS</th>
    <th>Accuracy</th><th>IP-based location</th><th>Browser</th></tr>${tr}</table></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
};

export const config = { path: "/admin" };