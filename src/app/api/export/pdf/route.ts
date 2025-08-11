import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { title = "Makalah", content = "" } = (await req.json()) as { title?: string; content?: string };

    // Lazy import to keep cold start light
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const doc = await PDFDocument.create();
    const pageMargin = 50;
    const page = doc.addPage();
    const width = page.getWidth();
    const height = page.getHeight();

    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

    const titleSize = 18;
    const textSize = 12;
    let cursorY = height - pageMargin;

    // Draw Title (centered)
    const safeTitle = String(title).slice(0, 200);
    const titleWidth = fontBold.widthOfTextAtSize(safeTitle, titleSize);
    page.drawText(safeTitle, {
      x: (width - titleWidth) / 2,
      y: cursorY,
      size: titleSize,
      font: fontBold,
      color: rgb(0.9, 0.9, 0.95),
    });
    cursorY -= titleSize + 14;

    // Text wrapping
    const lineHeight = textSize * 1.4;
    const maxLineWidth = width - pageMargin * 2;

    function addPageIfNeeded() {
      if (cursorY < pageMargin + lineHeight) {
        const p = doc.addPage();
        cursorY = p.getHeight() - pageMargin;
        return p;
      }
      return page;
    }

    function wrapText(paragraph: string): string[] {
      const words = paragraph.replace(/\r/g, "").split(/\s+/);
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        const test = current ? current + " " + w : w;
        const testWidth = font.widthOfTextAtSize(test, textSize);
        if (testWidth > maxLineWidth) {
          if (current) lines.push(current);
          current = w;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    const paragraphs = String(content).split(/\n\n+/);

    let currentPage = page;
    currentPage.setFont(font);
    currentPage.setFontSize(textSize);

    for (const para of paragraphs) {
      const lines = wrapText(para.trim());
      for (const line of lines) {
        currentPage = addPageIfNeeded();
        currentPage.drawText(line, {
          x: pageMargin,
          y: cursorY,
          size: textSize,
          font,
          color: rgb(0.95, 0.95, 0.95),
        });
        cursorY -= lineHeight;
      }
      cursorY -= lineHeight * 0.6; // paragraph spacing
    }

    const pdfBytes = await doc.save();
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "makalah"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Export PDF error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
