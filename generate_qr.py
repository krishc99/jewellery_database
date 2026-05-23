"""
QR Code Generator for Jewellery Inventory
==========================================
Generates one 300dpi PNG per SKU, sized for 30x20mm labels.
Each QR encodes:  https://YOUR-APP.vercel.app/?sku=SKU_CODE

Usage:
  1. pip install qrcode[pil] openpyxl
  2. Set VERCEL_URL below to your deployed app URL
  3. Run:  python generate_qr.py

Output: ./qr_codes/  folder with one PNG per SKU
"""

import os, openpyxl, qrcode
from PIL import Image, ImageDraw, ImageFont

# ── CONFIG ────────────────────────────────────────────────────────────────
VERCEL_URL    = "https://YOUR-APP.vercel.app"   # ← replace after deploying
EXCEL_FILE    = "Jewellery_Inventory.xlsx"       # same folder as this script
SHEET_NAME    = "Master Inventory"
OUTPUT_DIR    = "qr_codes"
LABEL_W_MM    = 30   # label width  in mm
LABEL_H_MM    = 20   # label height in mm
DPI           = 300
# ─────────────────────────────────────────────────────────────────────────

def mm_to_px(mm): return int(mm * DPI / 25.4)

def make_qr_label(sku, url, product_name):
    W = mm_to_px(LABEL_W_MM)
    H = mm_to_px(LABEL_H_MM)

    # QR code — leave room at bottom for SKU text (~18% of height)
    text_area = int(H * 0.22)
    qr_size   = H - text_area - 8  # 4px padding top+bottom

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=1, border=0
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)

    # Canvas
    canvas = Image.new("RGB", (W, H), "white")

    # Center QR horizontally, top-aligned with 4px margin
    qr_x = (W - qr_size) // 2
    canvas.paste(qr_img, (qr_x, 4))

    # SKU text below QR
    draw = ImageDraw.Draw(canvas)
    text_y = 4 + qr_size + 2

    font_size = int(text_area * 0.52)
    font = None
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf",
    ]:
        if os.path.exists(path):
            try: font = ImageFont.truetype(path, font_size); break
            except: pass
    if not font: font = ImageFont.load_default()

    # Draw SKU centered
    bbox = draw.textbbox((0, 0), sku, font=font)
    tw = bbox[2] - bbox[0]
    tx = max(0, (W - tw) // 2)
    draw.text((tx, text_y), sku, fill="black", font=font)

    return canvas

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
    ws = wb[SHEET_NAME]

    count = 0
    for row in ws.iter_rows(min_row=3, values_only=True):
        sku  = str(row[0] or "").strip()
        name = str(row[5] or "").strip()
        if not sku or sku == "None": continue

        url = f"{VERCEL_URL}/?sku={sku}"
        img = make_qr_label(sku, url, name)

        out_path = os.path.join(OUTPUT_DIR, f"{sku}.png")
        img.save(out_path, dpi=(DPI, DPI))
        print(f"  ✓  {sku}  →  {out_path}")
        count += 1

    print(f"\nGenerated {count} QR codes in ./{OUTPUT_DIR}/")
    print(f"Each QR encodes: {VERCEL_URL}/?sku=<SKU>")

if __name__ == "__main__":
    main()
