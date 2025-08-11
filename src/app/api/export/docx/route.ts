import { NextRequest } from "next/server";
import { Document, Packer, Paragraph } from "docx";

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
          children: [new Paragraph({ text: title, heading: "HEADING_1" as any }), ...paragraphs],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${title.replace(/[^a-z0-9-_]+/gi, "-") || "makalah"}.docx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Export error" }), { status: 500 });
  }
}
