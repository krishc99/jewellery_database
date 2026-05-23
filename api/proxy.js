// api/proxy.js — Vercel Serverless Function
// Browser calls /api/proxy (same Vercel domain = no CORS).
// This function calls Apps Script server-side (no CORS restriction).

export default async function handler(req, res) {
  // Hardcoded fallback — also set APPS_SCRIPT_URL in Vercel env vars for safety
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ||
    "https://script.google.com/macros/s/AKfycbxQ6hu99wt3qeYhBqKDWp_Zn3EpqCCcen2634MNMBq-pSV_VJq63aslzOSqhxnDARLhnA/exec";

  try {
    const params = new URLSearchParams(req.query).toString();
    const url = `${APPS_SCRIPT_URL}?${params}`;

    const response = await fetch(url, { redirect: "follow" });
    const text = await response.text();

    let data;
    try { data = JSON.parse(text); }
    catch { data = { error: "Non-JSON response from Apps Script", raw: text.slice(0, 300) }; }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(data);

  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message });
  }
}
