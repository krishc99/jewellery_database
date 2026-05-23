export default async function handler(req, res) {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQ6hu99wt3qeYhBqKDWp_Zn3EpqCCcen2634MNMBq-pSV_VJq63aslzOSqhxnDARLhnA/exec";

  try {
    const params = new URLSearchParams(req.query).toString();
    const url = `${APPS_SCRIPT_URL}?${params}`;
    const response = await fetch(url, { redirect: "follow" });
    const text = await response.text();

    let data;
    try { data = JSON.parse(text); }
    catch { data = { error: "Non-JSON from Apps Script", raw: text.slice(0, 500) }; }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message });
  }
}
