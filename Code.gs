// ═══════════════════════════════════════════════════════════════════════════
// JEWELLERY INVENTORY — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════════════════════
//
// SHEET COLUMNS — Master Inventory:
// A: SKU Code       B: QR URL         C: Category       D: Subcategory
// E: Metal          F: Product Name   G: Opening Stock  H: Current Stock
// I: Gross Weight   J: Net Weight     K: Target         L: Status
// M: Image URL      N: Notes
//
// ADD these columns to your Google Sheet if not already there:
//   Col J: Net Weight   Col M: Image URL
// (rename existing col I from "Weight" to "Gross Weight")
//
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_INVENTORY    = "Master Inventory";
const SHEET_TRANSACTIONS = "Transactions";

const C = {
  SKU:1, QR_URL:2, SOURCE:3, CATEGORY:4,
  GROSS_WEIGHT:5, NET_WEIGHT:6, MAKING_COST:7, SELLING_COST:8,
  OPENING:9, CURRENT:10, TARGET:11, STATUS:12,
  IMAGE_URL:13, NOTES:14
};

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter.action || "").trim();
    if (action === "getProduct")     return jsonOut(getProduct(e.parameter.sku || ""));
    if (action === "getAllProducts")  return jsonOut(getAllProducts());
    if (action === "addTransaction")  return jsonOut(addTransaction(e.parameter));
    if (action === "uploadPhoto")     return jsonOut(uploadPhoto(e.parameter.sku, e.parameter.imageBase64));
    return jsonOut({ error: "Unknown action: " + action });
  } catch(err) {
    return jsonOut({ error: err.message });
  }
}

function getSheet(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Sheet not found: " + name);
  return sh;
}

function rowToProduct(row) {
  return {
    sku:          String(row[C.SKU-1]          || ""),
    source:       String(row[C.SOURCE-1]        || ""),
    category:     String(row[C.CATEGORY-1]      || ""),
    grossWeight:  String(row[C.GROSS_WEIGHT-1]  || ""),
    netWeight:    String(row[C.NET_WEIGHT-1]    || ""),
    makingCost:   String(row[C.MAKING_COST-1]   || ""),
    sellingCost:  String(row[C.SELLING_COST-1]  || ""),
    openingStock: Number(row[C.OPENING-1]       || 0),
    currentStock: Number(row[C.CURRENT-1]       || 0),
    target:       Number(row[C.TARGET-1]        || 5),
    status:       String(row[C.STATUS-1]        || ""),
    imageUrl:     String(row[C.IMAGE_URL-1]     || ""),
    notes:        String(row[C.NOTES-1]         || ""),
  };
};
}

function getProduct(sku) {
  const data = getSheet(SHEET_INVENTORY).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][C.SKU-1]).trim() === sku.trim()) return rowToProduct(data[i]);
  }
  return { error: "Not found", sku };
}

function getAllProducts() {
  const data = getSheet(SHEET_INVENTORY).getDataRange().getValues();
  return data.slice(1).filter(r => r[C.SKU-1]).map(rowToProduct);
}

function addTransaction(p) {
  const { sku, productName, type, quantity, updatedBy, notes } = p;
  const qty = Number(quantity);
  if (!sku || !type || !qty || qty < 1) throw new Error("Invalid payload");
  const t = String(type).toUpperCase();
  if (!["SOLD","ADDED"].includes(t)) throw new Error("Type must be SOLD or ADDED");

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy");
  getSheet(SHEET_TRANSACTIONS).appendRow([
    dateStr, String(sku).trim(), String(productName||""),
    t, qty, String(updatedBy||""), String(notes||"")
  ]);
  return { status: "ok", newStock: getProduct(sku).currentStock };
}

function uploadPhoto(sku, base64) {
  if (!sku || !base64) throw new Error("Missing sku or image data");

  // Save image to Google Drive in a "Jewellery Photos" folder
  const folderName = "Jewellery Photos";
  let folder;
  const folders = DriveApp.getFoldersByName(folderName);
  folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  // Delete old photo for this SKU if exists
  const existing = folder.getFilesByName(sku + ".jpg");
  while (existing.hasNext()) existing.next().setTrashed(true);

  // Save new photo
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", sku + ".jpg");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Direct image URL via Drive
  const imageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();

  // Write URL back to Master Inventory col M
  const sheet = getSheet(SHEET_INVENTORY);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][C.SKU-1]).trim() === sku.trim()) {
      sheet.getRange(i + 1, C.IMAGE_URL).setValue(imageUrl);
      break;
    }
  }
  return { status: "ok", imageUrl };
}

// ── Tests — run in Apps Script editor ─────────────────────────────────────
function testGet()    { Logger.log(JSON.stringify(getProduct("CHN-925-PCUB-001"), null, 2)); }
function testAll()    { Logger.log(getAllProducts().length + " products"); }
function testTxn()    {
  Logger.log(JSON.stringify(addTransaction({
    sku:"CHN-925-PCUB-001", productName:"Plain Cuban Chain",
    type:"SOLD", quantity:1, updatedBy:"Test", notes:""
  }), null, 2));
}
