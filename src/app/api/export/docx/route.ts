import { NextRequest } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { title = "Makalah", content = "" } = await req.json();
    const paragraphs = String(content)
      .split(/\n+/)
      .map((t) => new Paragraph({ text: t }));

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }), ...paragraphs],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${title.replace(/[^a-z0-9-_]+/gi, "-") || "makalah"}.docx`;

    // Use Uint8Array (ArrayBufferView) which is a valid BodyInit in Node runtime
    const body = new Uint8Array(buffer);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Export error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
