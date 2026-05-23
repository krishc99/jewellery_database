// api/proxy.js — Vercel Serverless Function
// Sits between your browser and Apps Script.
// Browser calls /api/proxy (same domain = no CORS).
// This function calls Apps Script server-side (no CORS restriction).
//
// SETUP: Add this environment variable in Vercel dashboard:
//   APPS_SCRIPT_URL = your full Apps Script web app URL
//   (Settings → Environment Variables → add for Production + Preview)

export default async function handler(req, res) {
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL env variable not set' });
  }

  try {
    // Forward all query params from the browser to Apps Script
    const params = new URLSearchParams(req.query).toString();
    const url = `${APPS_SCRIPT_URL}?${params}`;

    const response = await fetch(url, {
      redirect: 'follow', // follow Apps Script's 302 redirect automatically
    });

    const data = await response.json();

    // Allow browser to receive the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
