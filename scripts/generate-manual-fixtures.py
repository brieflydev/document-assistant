#!/usr/bin/env python3
"""Regenerate binary manual-test fixtures (PDF + PNG). Text fixtures are edited in place."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "fixtures" / "manual-tests"


def escape_pdf_text(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf(lines: list[str], out: Path) -> None:
    y = 720
    content_ops = ["BT", "/F1 12 Tf", "14 TL", f"72 {y} Td"]
    for i, line in enumerate(lines):
        text = escape_pdf_text(line)
        if i == 0:
            content_ops.append(f"({text}) Tj")
        else:
            content_ops.append("T*")
            content_ops.append(f"({text}) Tj")
    content_ops.append("ET")
    stream = "\n".join(content_ops).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        (
            b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
        ),
        (
            f"4 0 obj<< /Length {len(stream)} >>stream\n".encode("ascii")
            + stream
            + b"\nendstream endobj\n"
        ),
        b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    out.write_bytes(pdf)


FONT = {
    " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    "A": [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    "B": [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    "C": [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
    "D": [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
    "E": [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
    "F": [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    "G": [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E],
    "H": [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    "I": [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    "J": [0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0E],
    "K": [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    "L": [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    "M": [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
    "N": [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
    "O": [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    "P": [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    "Q": [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    "R": [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    "S": [0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E],
    "T": [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    "U": [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    "V": [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    "W": [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    "X": [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    "Y": [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    "Z": [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    "0": [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    "1": [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    "2": [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
    "3": [0x1F, 0x01, 0x02, 0x06, 0x01, 0x11, 0x0E],
    "4": [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    "5": [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    "6": [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    "7": [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    "8": [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    "9": [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    "-": [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    ":": [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00],
    ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C],
    "/": [0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x10],
}


def blit_char(img, width, height, x, y, ch, scale, color):
    glyph = FONT.get(ch, FONT[" "])
    for row, bits in enumerate(glyph):
        for col in range(5):
            on = bits & (0x10 >> col)
            if not on:
                continue
            for dy in range(scale):
                for dx in range(scale):
                    px = x + col * scale + dx
                    py = y + row * scale + dy
                    if 0 <= px < width and 0 <= py < height:
                        img[py][px] = color


def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def build_png(lines: list[str], out: Path) -> None:
    scale = 3
    pad = 24
    line_h = 7 * scale + 10
    width = pad * 2 + max(len(line) for line in lines) * 6 * scale
    height = pad * 2 + len(lines) * line_h
    bg = (245, 248, 252)
    fg = (20, 40, 70)
    accent = (21, 101, 192)
    img = [[bg for _ in range(width)] for _ in range(height)]
    for y in range(12):
        for x in range(width):
            img[y][x] = accent

    y = pad
    for li, line in enumerate(lines):
        color = accent if li == 0 else fg
        x = pad
        for ch in line.upper():
            blit_char(img, width, height, x, y, ch, scale, color)
            x += 6 * scale
        y += line_h

    raw = b"".join(b"\x00" + bytes([c for px in row for c in px]) for row in img)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"tEXt", b"Title\x00ACME shipping label fixture")
    png += chunk(
        b"tEXt",
        b"Description\x00" + "\n".join(lines).encode("latin-1", errors="replace"),
    )
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    out.write_bytes(png)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)

    build_pdf(
        [
            "Northwind Support Escalation Policy",
            "",
            "Document ID: NW-SUP-2026-01",
            "Effective date: 1 March 2026",
            "Owner: Customer Support Leadership",
            "",
            "1. Severity definitions",
            "   - SEV-1 (Critical): Production outage or data loss affecting many customers.",
            "   - SEV-2 (High): Major feature unavailable with no practical workaround.",
            "   - SEV-3 (Medium): Degraded experience with a workaround available.",
            "   - SEV-4 (Low): Cosmetic issue or minor inconvenience.",
            "",
            "2. Response time targets (business hours, CET)",
            "   - SEV-1: first response within 15 minutes; update every 30 minutes.",
            "   - SEV-2: first response within 1 hour; update every 2 hours.",
            "   - SEV-3: first response within 1 business day.",
            "   - SEV-4: first response within 3 business days.",
            "",
            "3. Escalation path",
            "   - Tier 1 Support acknowledges the ticket and triages severity.",
            "   - Tier 2 Support owns SEV-2 and SEV-3 investigations.",
            "   - On-call Engineering owns SEV-1 until mitigation.",
            "   - Customer Success is notified for all SEV-1 accounts labeled Enterprise.",
            "",
            "4. After-hours coverage",
            "   Only SEV-1 incidents page the on-call engineer outside business hours.",
            "   SEV-2 and below wait until the next business day unless an Enterprise",
            "   contract explicitly includes 24x7 coverage.",
        ],
        ROOT / "northwind-support-escalation.pdf",
    )

    build_png(
        [
            "ACME LABELS - SHIPPING CARD",
            "SKU: ACME-BOTTLE-500",
            "PRODUCT: Alpine Spring Water 500ml",
            "WAREHOUSE: WH-BERLIN-02",
            "SHELF: Aisle 7 / Bin C-14",
            "MAX STORAGE TEMP: 25C",
            "REORDER POINT: 1200 units",
            "SUPPLIER CODE: HYDRO-DE-09",
        ],
        ROOT / "acme-shipping-label.png",
    )

    print(f"Wrote binary fixtures to {ROOT}")


if __name__ == "__main__":
    main()
