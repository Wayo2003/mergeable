#!/usr/bin/env python3
"""
extract-pdf.py — render each page of a PDF as a PNG image so Bob can read them visually.

Usage:
  python extract-pdf.py <path-to-pdf> [output-dir]

Output:
  <output-dir>/page_01.png, page_02.png, ... (2x zoom, suitable for visual reading)
  Prints the output directory path to stdout when done.
"""
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: extract-pdf.py <pdf-path> [output-dir]", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    # Default output dir: alongside the PDF
    output_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(pdf_path)), "pdf_pages"
    )
    os.makedirs(output_dir, exist_ok=True)

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("Installing pymupdf...", file=sys.stderr)
        os.system(f"{sys.executable} -m pip install pymupdf --quiet")
        import fitz

    doc = fitz.open(pdf_path)
    count = doc.page_count
    for i in range(count):
        page = doc[i]
        mat = fitz.Matrix(2, 2)  # 2× zoom for legibility
        pix = page.get_pixmap(matrix=mat)
        out_path = os.path.join(output_dir, f"page_{i+1:02d}.png")
        pix.save(out_path)

    doc.close()
    print(output_dir)
    print(f"Extracted {count} pages to: {output_dir}", file=sys.stderr)

if __name__ == "__main__":
    main()
