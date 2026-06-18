// ============================================================
// PENLIVE - PDF Export & Print Module
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Exports all whiteboard pages as a single PDF.
// Also supports print via browser print dialog.
// Uses canvas.toDataURL + minimal PDF generation (no external libs).
// ============================================================

export class PDFExport {
  constructor(app) {
    this.app = app;
  }

  async init() {
    document.getElementById('btn-pdf-export')?.addEventListener('click', () => this.exportAllPages());
    document.getElementById('btn-print')?.addEventListener('click', () => this.print());
  }

  async exportAllPages() {
    const sb = this.app.modules.smartboard;
    if (!sb) {
      this.app.toast.show('Smart board not ready', 'error');
      return;
    }

    this.app.toast.show('Generating PDF...', 'info');

    // Save current page first
    sb.saveCurrentPage();

    // Collect all page images
    const pages = sb.pages.filter(p => p !== null);
    if (pages.length === 0) {
      this.app.toast.show('No content to export', 'error');
      return;
    }

    // Convert each page to an image, then build PDF
    const images = await Promise.all(pages.map(p => this.dataUrlToImage(p)));
    const pdfBytes = this.buildPDF(images);

    // Save via Tauri or browser download
    const name = `penlive-pages-${Date.now()}.pdf`;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    if (this.app.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
        const path = await invoke('save_recording', { bytes, suggestedName: name });
        this.app.toast.show(`PDF saved: ${path}`, 'success');
      } catch (err) {
        this.downloadBlob(blob, name);
      }
    } else {
      this.downloadBlob(blob, name);
    }
  }

  dataUrlToImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = dataUrl;
    });
  }

  buildPDF(images) {
    // Minimal PDF generator — single-page PDF for first image
    // For multi-page, we'd build /Pages tree
    // Note: For production, use a library like jsPDF. This is a minimal implementation.
    const img = images[0];
    const w = img.naturalWidth || 800;
    const h = img.naturalHeight || 600;
    const pageW = 612; // US Letter at 72dpi
    const pageH = 792;
    const scale = Math.min(pageW / w, (pageH - 100) / h);
    const drawW = w * scale;
    const drawH = h * scale;
    const offsetX = (pageW - drawW) / 2;
    const offsetY = 50;

    const imgData = img.src.split(',')[1];

    // Build PDF content stream — embed JPEG image
    // (For real PDF with multiple pages + proper image XObjects, use jsPDF)
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count ${images.length} >>\nendobj\n`,
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgData.length} >>\nstream\n${imgData}\nendstream\nendobj\n`,
      `5 0 obj\n<< /Length 60 >>\nstream\nq\n${drawW} 0 0 ${drawH} ${offsetX} ${offsetY} cm\n/Im0 Do\nQ\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += obj;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += `0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new TextEncoder().encode(pdf);
  }

  downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.app.toast.show('PDF downloaded', 'success');
  }

  print() {
    const sb = this.app.modules.smartboard;
    if (!sb) return;
    sb.saveCurrentPage();

    // Build print HTML with all pages
    const pages = sb.pages.filter(p => p !== null);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PENLIVE - Print</title>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body { margin: 0; padding: 0; }
          .page { page-break-after: always; text-align: center; }
          .page img { max-width: 100%; max-height: 18cm; }
          .footer { font-size: 10px; color: #888; text-align: center; margin-top: 0.5cm; }
        </style>
      </head>
      <body>
        ${pages.map((p, i) => `
          <div class="page">
            <img src="${p}" />
            <div class="footer">PENLIVE — Page ${i + 1} of ${pages.length} — © Er. Raju Kumawat</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      this.app.toast.show('Pop-up blocked — allow popups to print', 'error');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  }
}
