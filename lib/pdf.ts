import type { Course, Note } from "@/lib/types";

// Brand colors (RGB) for the PDF.
const GOLD: [number, number, number] = [200, 146, 24];
const NAVY: [number, number, number] = [12, 27, 54];
const INK: [number, number, number] = [40, 40, 40];
const FAINT: [number, number, number] = [130, 130, 130];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Build a single PDF of all the notes a learner saved across a topic's videos and
 * trigger a download. Notes are grouped by video (in roadmap order); each note keeps
 * its timestamp. Uses jsPDF, dynamically imported so it stays out of the main bundle.
 */
export async function downloadNotesPdf(course: Course, notes: Note[], learnerName?: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (space: number) => {
    if (y + space > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const write = (text: string, size: number, color: [number, number, number], style: "normal" | "bold" = "normal", lh = 1.4) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lineH = size * lh;
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, margin, y);
      y += lineH;
    }
  };

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text("LEAP COACH · MY NOTES", margin, y);
  y += 22;
  write(course.title, 20, NAVY, "bold", 1.25);
  y += 4;
  const meta = [learnerName, `Exported ${fmtDate(new Date().toISOString())}`].filter(Boolean).join("  ·  ");
  write(meta, 10, FAINT, "normal", 1.4);
  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + 60, y);
  y += 22;

  // ── Notes grouped by video (roadmap order) ──
  const videos = [...course.videos].sort((a, b) => a.order - b.order);
  let total = 0;
  for (const v of videos) {
    const vNotes = notes
      .filter((n) => n.videoId === v.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    if (!vNotes.length) continue;
    total += vNotes.length;

    ensure(40);
    y += 6;
    write(`Video ${v.order} · ${v.title}`, 13, NAVY, "bold", 1.3);
    y += 2;

    for (const n of vNotes) {
      ensure(28);
      // bullet
      doc.setFillColor(...GOLD);
      doc.circle(margin + 3, y - 4, 2, "F");
      const before = y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(n.text, contentW - 16) as string[];
      const lineH = 11 * 1.45;
      for (const line of lines) {
        ensure(lineH);
        doc.text(line, margin + 14, y);
        y += lineH;
      }
      // timestamp under the note
      doc.setFontSize(8.5);
      doc.setTextColor(...FAINT);
      ensure(12);
      doc.text(fmtDate(n.createdAt), margin + 14, y);
      y += 16;
      void before;
    }
    y += 8;
  }

  if (total === 0) {
    write("You haven't saved any notes for this topic yet.", 11, FAINT, "normal");
  }

  // ── Footer page numbers ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...FAINT);
    doc.text(`LEAP Coach · ${course.title}`, margin, pageH - 24);
    doc.text(`${i} / ${pages}`, pageW - margin, pageH - 24, { align: "right" });
  }

  doc.save(`${course.slug}-my-notes.pdf`);
}
