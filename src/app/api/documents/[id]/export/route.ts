import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canView } from "@/lib/permissions";
import { loadDocWithPermission } from "@/lib/document-access";
import { buildPrintableHtml, tiptapToHtml, tiptapToMarkdown } from "@/lib/export";
import type { TiptapDoc } from "@/lib/import";

function safeFilename(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "document";
}

// GET /api/documents/[id]/export?format=md|html|pdf
// - md  -> Markdown file download
// - html -> standalone HTML file download
// - pdf -> standalone HTML page that auto-opens the browser print dialog (Save as PDF)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document, permission } = await loadDocWithPermission(id, session.user.id);
  if (!document || !canView(permission)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "md";
  const content = document.contentJson as TiptapDoc;
  const filename = safeFilename(document.title);

  if (format === "md") {
    const markdown = `# ${document.title}\n\n${tiptapToMarkdown(content)}`;
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.md"`,
      },
    });
  }

  if (format === "html" || format === "pdf") {
    const html = buildPrintableHtml(document.title, tiptapToHtml(content), format === "pdf");
    const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8" };
    if (format === "html") {
      headers["Content-Disposition"] = `attachment; filename="${filename}.html"`;
    }
    return new NextResponse(html, { headers });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
