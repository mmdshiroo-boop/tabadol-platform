// frontend/utils/agentClubExport.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type ExportableRow = Record<string, any>;

// ─── خروجی Excel ───
export function exportToExcel(
  rows: ExportableRow[],
  filename: string,
  sheetName = "Sheet1"
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}-تبادل.xlsx`);
}

// ─── خروجی TXT ───
export function exportToText(rows: ExportableRow[], filename: string) {
  const header = Object.keys(rows[0] || {}).join("\t");
  const lines = rows.map((row) =>
    Object.values(row)
      .map((v) => (v === null || v === undefined ? "" : String(v)))
      .join("\t")
  );
  const text = [header, ...lines].join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${filename}-تبادل.txt`);
}

// ─── خروجی JSON ───
export function exportToJson(rows: ExportableRow[], filename: string) {
  const jsonString = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  saveAs(blob, `${filename}-تبادل.json`);
}

// ─── خروجی PDF با کیفیت بالا (html2canvas + jsPDF) ───
export async function exportToPdf(
  headers: string[],
  rows: any[][],
  filename: string,
  title?: string
) {
  try {
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasModule.default;
    const { jsPDF } = jsPDFModule;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.right = "-9999px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "20px";
    container.style.fontFamily = "Vazirmatn, sans-serif";
    container.style.direction = "rtl";
    container.style.textAlign = "center";
    container.style.color = "#333";

    // افزودن لوگوی برند به بالای گزارش
    const logoImg = document.createElement("img");
    logoImg.src = "/images/tabadol-logo-light.PNG";
    logoImg.alt = "تبادل";
    logoImg.style.width = "80px";
    logoImg.style.height = "80px";
    logoImg.style.objectFit = "contain";
    logoImg.style.marginBottom = "8px";
    container.appendChild(logoImg);

    if (title) {
      const titleElement = document.createElement("h2");
      titleElement.textContent = `تبادل - ${title}`;
      titleElement.style.marginBottom = "16px";
      titleElement.style.fontSize = "20px";
      titleElement.style.fontWeight = "bold";
      container.appendChild(titleElement);
    }

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      th.style.border = "1px solid #ddd";
      th.style.padding = "10px";
      th.style.backgroundColor = "#f97316";
      th.style.color = "#fff";
      th.style.fontWeight = "bold";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = cell === null || cell === undefined ? "" : String(cell);
        td.style.border = "1px solid #ddd";
        td.style.padding = "10px";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgAspect = canvas.height / canvas.width;
    const pageImgWidth = pageWidth;
    const pageImgHeight = pageWidth * imgAspect;
    let totalPages = Math.ceil(pageImgHeight / pageHeight);
    if (totalPages === 0) totalPages = 1;

    for (let i = 0; i < totalPages; i++) {
      const startY = i * pageHeight;
      const endY = Math.min((i + 1) * pageHeight, pageImgHeight);
      if (i > 0) pdf.addPage();

      const sliceCanvas = document.createElement("canvas");
      const sliceHeightPx = (endY - startY) * (canvas.height / pageImgHeight);
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        startY * (canvas.height / pageImgHeight),
        canvas.width,
        sliceHeightPx,
        0,
        0,
        sliceCanvas.width,
        sliceCanvas.height
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(
        sliceData,
        "PNG",
        0,
        0,
        pageWidth,
        (endY - startY) * (pageWidth / pageImgWidth)
      );
    }

    pdf.save(`${filename}-تبادل.pdf`);
  } catch (error) {
    console.error("خطا در تولید PDF:", error);
  }
}

// ─── پرینت ───
export function printElement(elementId: string, title?: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const element = document.getElementById(elementId);
  if (!element) return;
  printWindow.document.write(`<html dir="rtl"><head><title>${title || "چاپ تبادل"}</title><style>
    body { font-family: Vazirmatn, sans-serif; direction: rtl; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
    th { background: #f5f5f5; }
    @media print { .no-print { display: none; } }
  </style></head><body>${element.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}