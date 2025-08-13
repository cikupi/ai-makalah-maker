import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const reqBody = (await req.json()) as {
      title?: string;
      content?: string;
      contentHtml?: string;
      layout?: { pageSize?: 'A4P' | 'A4L'; marginsPx?: { top: number; right: number; bottom: number; left: number } };
    };
    const { title = "Makalah", content, contentHtml } = reqBody || {};

    // Layout defaults and conversions
    const pageSize = reqBody?.layout?.pageSize || 'A4P';
    const marginsPx = reqBody?.layout?.marginsPx || { top: 96, right: 96, bottom: 96, left: 96 }; // 96px = 1in
    const toTwips = (px: number) => Math.round(px * 15); // 1px @96dpi = 15 twips
    const marginsTw = {
      top: toTwips(marginsPx.top),
      right: toTwips(marginsPx.right),
      bottom: toTwips(marginsPx.bottom),
      left: toTwips(marginsPx.left),
    };
    const A4 = { w: Math.round(8.27 * 1440), h: Math.round(11.69 * 1440) }; // twips
    const sizeTw = pageSize === 'A4P' ? { w: A4.w, h: A4.h } : { w: A4.h, h: A4.w };

    // Prefer HTML if provided, fallback to plain text paragraphs
    const html = (contentHtml && String(contentHtml).trim()) || "";

    let buffer: ArrayBuffer | Uint8Array;
    if (html) {
      // Lazy import html-to-docx to keep cold start lighter
      const htmlToDocx = (await import("html-to-docx")).default as (html: string, options?: any) => Promise<ArrayBuffer>;
      const safeTitle = String(title || "Makalah");
      const fullHtml = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
              h1 { font-size: 20pt; font-weight: 700; text-align: center; margin: 0 0 16pt; }
              h2 { font-size: 16pt; font-weight: 700; margin: 16pt 0 8pt; }
              h3 { font-size: 14pt; font-weight: 700; margin: 12pt 0 6pt; }
              p { margin: 0 0 8pt; }
              ul, ol { margin: 0 0 8pt 22pt; }
              blockquote { margin: 8pt 0; padding-left: 12pt; border-left: 3pt solid #ccc; }
              code { font-family: Consolas, Monaco, monospace; background: #f3f3f3; padding: 1pt 3pt; }
            </style>
            <title>${safeTitle}</title>
          </head>
          <body>
            <h1>${safeTitle}</h1>
            <div>${html}</div>
          </body>
        </html>`;
      buffer = await htmlToDocx(fullHtml, {
        table: { row: { cantSplit: true } },
        pageNumber: true,
        // Apply margins from UI
        margins: { top: marginsTw.top, right: marginsTw.right, bottom: marginsTw.bottom, left: marginsTw.left },
        // Some versions of html-to-docx may not support explicit page size; margins still applied.
      });
    } else {
      // Fallback: plain text to paragraphs via docx when no HTML present
      const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
      const paragraphs = String(content || "")
        .split(/\n+/)
        .map((t) => new Paragraph({ text: t }));
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: sizeTw.w, height: sizeTw.h },
                margin: { top: marginsTw.top, right: marginsTw.right, bottom: marginsTw.bottom, left: marginsTw.left },
              },
            },
            children: [new Paragraph({ text: String(title || "Makalah"), heading: HeadingLevel.HEADING_1 }), ...paragraphs],
          },
        ],
      });
      const buf = await Packer.toBuffer(doc); // Node Buffer (Uint8Array)
      buffer = buf as unknown as Uint8Array;
    }
    const filename = `${title.replace(/[^a-z0-9-_]+/gi, "-") || "makalah"}.docx`;

    // Normalize to Uint8Array and return as Blob to satisfy BodyInit typing across environments
    const respBody = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    // Create a concrete ArrayBuffer (not SharedArrayBuffer) to satisfy BlobPart typing
    const ab = new ArrayBuffer(respBody.byteLength);
    new Uint8Array(ab).set(respBody);
    const blob = new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    return new Response(blob, {
      status: 200,
      headers: {
        // Blob already has the content-type, but we also set it explicitly for clarity
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Export error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
