// frontend/src/pages/secretary/reportExport.js
// CSV at PDF export para sa Reports (client-side lang, walang backend).
// Kailangan: npm install jspdf jspdf-autotable

const CHURCH = "River of Life Calapan";
const LOGO_SRC = "/logo.png"; // frontend/public/logo.png
const TEAL = [14, 116, 144];
const DARK = [11, 46, 58];
const MUTED = [91, 116, 128];

const generatedText = () =>
  new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ CSV */
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvLine = (arr) => arr.map(csvCell).join(",");

/*
 model = {
   title, lines: [string],
   stats: [[label, value]],
   sections: [{ heading, head: [..], rows: [[..]], bars?, values?, moneyCols? }]
 }
*/
export function exportCsv(model, filename) {
  const out = [
    csvLine([CHURCH]),
    csvLine([model.title]),
    ...(model.lines || []).map((l) => csvLine([l])),
    csvLine([`Generated: ${generatedText()}`]),
    "",
  ];

  if (model.stats?.length) {
    model.stats.forEach((s) => out.push(csvLine(s)));
    out.push("");
  }

  (model.sections || []).forEach((s) => {
    out.push(csvLine([s.heading]), csvLine(s.head));
    s.rows.forEach((r) =>
      out.push(csvLine(r.map((v, i) => (s.moneyCols?.includes(i) ? Number(v || 0).toFixed(2) : v))))
    );
    out.push("");
  });

  (model.signatures || []).forEach((s) =>
    out.push(csvLine([`${s.label}: ${s.name || ""}${s.role ? ` (${s.role})` : ""}`]))
  );

  // BOM para tama ang UTF-8 sa Excel
  saveBlob(new Blob(["\uFEFF" + out.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

/* ------------------------------------------------------------------ PDF */
async function loadLogo() {
  try {
    const res = await fetch(LOGO_SRC);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!/png|jpe?g/i.test(blob.type)) return null;
    const dataUrl = await new Promise((ok, no) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = no;
      r.readAsDataURL(blob);
    });
    const dim = await new Promise((ok) => {
      const im = new Image();
      im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => ok(null);
      im.src = dataUrl;
    });
    if (!dim || !dim.w || !dim.h) return null;
    return { dataUrl, ratio: dim.w / dim.h, type: /png/i.test(blob.type) ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

export async function exportPdf(model, filename) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const logo = await loadLogo();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 14;

  /* ---- header: logo + pangalan ng church ---- */
  let textX = M;
  if (logo) {
    let h = 18;
    let w = h * logo.ratio;
    if (w > 40) {
      w = 40;
      h = w / logo.ratio;
    }
    doc.addImage(logo.dataUrl, logo.type, M, y, w, h);
    textX = M + w + 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(CHURCH, textX, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(model.title, textX, y + 13.5);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Generated ${generatedText()}`, W - M, y + 7, { align: "right" });

  y += 23;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 6;

  /* ---- filters ---- */
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  (model.lines || []).forEach((l) => {
    doc.text(String(l), M, y);
    y += 5;
  });
  if (model.lines?.length) y += 2;

  /* ---- stat boxes ---- */
  if (model.stats?.length) {
    const n = model.stats.length;
    const gap = 4;
    const bw = Math.min(60, (W - 2 * M - gap * (n - 1)) / n);
    model.stats.forEach(([label, value], i) => {
      const x = M + i * (bw + gap);
      doc.setFillColor(224, 242, 246);
      doc.roundedRect(x, y, bw, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...DARK);
      doc.text(String(value), x + 4, y + 7.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize(String(label), bw - 8)[0], x + 4, y + 13);
    });
    y += 24;
  }

  /* ---- sections ---- */
  (model.sections || []).forEach((s) => {
    if (y > H - 45) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(s.heading, M, y);
    y += 2;

    if (s.rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text("No data", M, y + 6);
      y += 14;
      return;
    }

    const max = Math.max(1, ...(s.values || [1]));
    const head = s.bars ? [[...s.head, ""]] : [s.head];
    const body = s.rows.map((r) => {
      const row = r.map((v, i) => (s.moneyCols?.includes(i) ? fmtMoney(v) : String(v ?? "")));
      return s.bars ? [...row, ""] : row;
    });

    autoTable(doc, {
      startY: y + 2,
      head,
      body,
      theme: "grid",
      margin: { left: M, right: M, top: 20, bottom: 16 },
      styles: { fontSize: 9, cellPadding: 2, lineColor: [219, 229, 232], textColor: DARK },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 250, 251] },
      columnStyles: s.bars ? { 1: { halign: "right", cellWidth: 35 }, 2: { cellWidth: 70 } } : {},
      didParseCell: (d) => {
        if (s.bars && d.section === "head" && d.column.index === 1) d.cell.styles.halign = "right";
      },
      didDrawCell: (d) => {
        if (!s.bars || d.section !== "body" || d.column.index !== 2) return;
        const v = Number(s.values?.[d.row.index]) || 0;
        const bw = (d.cell.width - 4) * (v / max);
        if (bw > 0) {
          doc.setFillColor(...TEAL);
          doc.rect(d.cell.x + 2, d.cell.y + d.cell.height / 2 - 1.5, bw, 3, "F");
        }
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  /* ---- pirma ---- */
  if (model.signatures?.length) {
    const n = model.signatures.length;
    if (y > H - 62) {
      doc.addPage();
      y = 20;
    }
    y += 8;
    const gap = 18;
    const cw = (W - 2 * M - gap * (n - 1)) / n;
    model.signatures.forEach((s, i) => {
      const x = M + i * (cw + gap);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(String(s.label), x, y);
      doc.setDrawColor(...DARK);
      doc.setLineWidth(0.4);
      doc.line(x, y + 20, x + cw, y + 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(String(s.name || ""), x + cw / 2, y + 25.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      if (s.role) doc.text(String(s.role), x + cw / 2, y + 30, { align: "center" });
      doc.text("Date: ____________________", x + cw / 2, y + 37, { align: "center" });
    });
  }

  /* ---- footer: page numbers ---- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${CHURCH}  |  Page ${i} of ${pages}`, W / 2, H - 8, { align: "center" });
  }

  doc.save(filename);
}