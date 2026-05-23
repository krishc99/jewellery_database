// ═══════════════════════════════════════════════════════════════════════════
// JEWELLERY INVENTORY — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Delete any existing code and paste this entire file
// 3. Save (Ctrl+S), then click Deploy → New Deployment
// 4. Type: Web App | Execute as: Me | Who has access: Anyone
// 5. Click Deploy → copy the Web App URL
// 6. Paste that URL into index.html → CONFIG.API_URL
//
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_NAME_INVENTORY    = "Master Inventory";
const SHEET_NAME_TRANSACTIONS = "Transactions";

const COL_INV = { SKU:1, QR_URL:2, CATEGORY:3, SUBCATEGORY:4, METAL:5,
                  NAME:6, OPENING:7, CURRENT:8, WEIGHT:9, TARGET:10, STATUS:11 };
const COL_TXN = { DATE:1, SKU:2, NAME:3, TYPE:4, QUANTITY:5, UPDATED_BY:6, NOTES:7 };

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter.action || "").trim();
    if (action === "getProduct")     return jsonResponse(getProduct(e.parameter.sku || ""));
    if (action === "getAllProducts")  return jsonResponse(getAllProducts());
    return jsonResponse({ error: "Unknown action" });
  } catch(err) { return jsonResponse({ error: err.message }); }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === "addTransaction") return jsonResponse(addTransaction(payload));
    return jsonResponse({ error: "Unknown action" });
  } catch(err) { return jsonResponse({ error: err.message }); }
}

function getSheet(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Sheet not found: " + name);
  return sh;
}

function rowToProduct(row) {
  return {
    sku:          String(row[COL_INV.SKU-1]         || ""),
    category:     String(row[COL_INV.CATEGORY-1]    || ""),
    subcategory:  String(row[COL_INV.SUBCATEGORY-1] || ""),
    metal:        String(row[COL_INV.METAL-1]       || ""),
    name:         String(row[COL_INV.NAME-1]        || ""),
    openingStock: Number(row[COL_INV.OPENING-1]     || 0),
    currentStock: Number(row[COL_INV.CURRENT-1]     || 0),
    weight:       String(row[COL_INV.WEIGHT-1]      || ""),
    target:       Number(row[COL_INV.TARGET-1]      || 5),
    status:       String(row[COL_INV.STATUS-1]      || ""),
  };
}

function getProduct(sku) {
  const data = getSheet(SHEET_NAME_INVENTORY).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL_INV.SKU-1]).trim() === sku.trim()) return rowToProduct(data[i]);
  }
  return { error: "Not found", sku: sku };
}

function getAllProducts() {
  const data = getSheet(SHEET_NAME_INVENTORY).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_INV.SKU-1]) out.push(rowToProduct(data[i]));
  }
  return out;
}

function addTransaction(p) {
  const { sku, productName, type, quantity, updatedBy, notes } = p;
  if (!sku || !type || !quantity || quantity < 1) throw new Error("Invalid payload");
  if (!["SOLD","ADDED"].includes(String(type).toUpperCase())) throw new Error("Type must be SOLD or ADDED");

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy");
  getSheet(SHEET_NAME_TRANSACTIONS).appendRow([
    dateStr, String(sku).trim(), String(productName||""),
    String(type).toUpperCase(), Number(quantity),
    String(updatedBy||""), String(notes||"")
  ]);

  const product = getProduct(sku);
  return { status: "ok", message: "Transaction recorded", newStock: product.currentStock };
}

// ── Manual test — run in Apps Script editor to verify ──────────────────────
function testGetProduct()     { Logger.log(JSON.stringify(getProduct("CHN-925-PCUB-001"), null, 2)); }
function testAddTransaction() {
  Logger.log(JSON.stringify(addTransaction({
    sku:"CHN-925-PCUB-001", productName:"Plain Cuban Chain",
    type:"SOLD", quantity:1, updatedBy:"Test", notes:"Test entry"
  }), null, 2));
}
