import * as XLSX from "xlsx";
import { exportToPdf } from "./agentClubExport";

// ==================== Types ====================
export interface AgentReportStats {
  properties: {
    total: number;
    active: number;
    sold: number;
    pending: number;
    expired: number;
  };
  views: {
    total: number;
    averagePerProperty: number;
  };
  leads: {
    total: number;
    new: number;
    converted: number;
    conversionRate: number;
  };
  revenue: {
    total: number;
    commission: number;
    averagePerSale: number;
  };
  topProperties: Array<{
    id: string;
    title: string;
    views: number;
    status: string;
  }>;
}

// ==================== توابع کمکی ====================
function getPersianDate(): string {
  return new Date().toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toPersianNum(num?: number): string {
  return (num ?? 0).toLocaleString("fa-IR");
}

function getStatusBadgeClass(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return { label: "فعال", className: "badge-green" };
    case "sold":
      return { label: "فروش رفته", className: "badge-blue" };
    case "pending":
      return { label: "در انتظار", className: "badge-yellow" };
    case "expired":
      return { label: "منقضی", className: "badge-red" };
    default:
      return { label: status || "نامشخص", className: "badge-gray" };
  }
}

// ==================== دانلود Excel برای Agent ====================
export function downloadAgentExcel(stats: AgentReportStats) {
  const persianDate = getPersianDate();

  const data: Array<Array<string | number>> = [
    ["📊 گزارش عملکرد آژانس تبادل", ""],
    ["", ""],
    ["تاریخ تهیه:", persianDate],
    ["", ""],
    ["─────────────────────────────────", ""],
    ["🏠 آمار املاک", ""],
    ["کل املاک", stats?.properties?.total ?? 0],
    ["فعال", stats?.properties?.active ?? 0],
    ["فروش رفته", stats?.properties?.sold ?? 0],
    ["در انتظار تأیید", stats?.properties?.pending ?? 0],
    ["منقضی شده", stats?.properties?.expired ?? 0],
    ["", ""],
    ["👁️ آمار بازدیدها", ""],
    ["کل بازدیدها", stats?.views?.total ?? 0],
    ["میانگین بازدید هر ملک", stats?.views?.averagePerProperty ?? 0],
    ["", ""],
    ["🎯 آمار لیدها", ""],
    ["کل لیدها", stats?.leads?.total ?? 0],
    ["لیدهای جدید", stats?.leads?.new ?? 0],
    ["لیدهای تبدیل شده", stats?.leads?.converted ?? 0],
    ["نرخ تبدیل (درصد)", stats?.leads?.conversionRate ?? 0],
    ["", ""],
    ["💰 آمار درآمد (تومان)", ""],
    ["کل درآمد", stats?.revenue?.total ?? 0],
    ["کمیسیون", stats?.revenue?.commission ?? 0],
    ["میانگین فروش هر ملک", Math.round(stats?.revenue?.averagePerSale ?? 0)],
  ];

  if (stats?.topProperties && stats.topProperties.length > 0) {
    data.push(["", ""]);
    data.push(["🏆 املاک برتر (بیشترین بازدید)", ""]);
    stats.topProperties.forEach((prop, i) => {
      data.push([`${i + 1}. ${prop.title}`, prop.views ?? 0]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 42 }, { wch: 22 }];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  XLSX.utils.book_append_sheet(wb, ws, "گزارش آژانس");

  const dateStr = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  const fileName = `گزارش-عملکرد-آژانس-تبادل-${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

// ==================== دانلود PDF برای Agent ====================
export async function downloadAgentPDF(stats: AgentReportStats) {
  const persianDate = getPersianDate();
  const dateStr = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  const title = `گزارش عملکرد آژانس - ${dateStr}`;

  const headers = ["شاخص", "مقدار"];
  const rows: any[][] = [
    ["کل املاک", toPersianNum(stats?.properties?.total)],
    ["فعال", toPersianNum(stats?.properties?.active)],
    ["فروش رفته", toPersianNum(stats?.properties?.sold)],
    ["در انتظار تأیید", toPersianNum(stats?.properties?.pending)],
    ["منقضی شده", toPersianNum(stats?.properties?.expired)],
    ["کل بازدیدها", toPersianNum(stats?.views?.total)],
    ["میانگین بازدید هر ملک", toPersianNum(stats?.views?.averagePerProperty)],
    ["کل لیدها", toPersianNum(stats?.leads?.total)],
    ["لیدهای جدید", toPersianNum(stats?.leads?.new)],
    ["لیدهای تبدیل شده", toPersianNum(stats?.leads?.converted)],
    ["نرخ تبدیل (درصد)", `${toPersianNum(stats?.leads?.conversionRate)}٪`],
    ["کل درآمد", `${toPersianNum(stats?.revenue?.total)} تومان`],
    ["کمیسیون", `${toPersianNum(stats?.revenue?.commission)} تومان`],
    ["میانگین فروش هر ملک", `${toPersianNum(Math.round(stats?.revenue?.averagePerSale ?? 0))} تومان`],
  ];

  if (stats?.topProperties && stats.topProperties.length > 0) {
    rows.push(["", ""]);
    rows.push(["🏆 املاک برتر", ""]);
    stats.topProperties.forEach((prop, i) => {
      const badge = getStatusBadgeClass(prop.status);
      rows.push([
        `${i + 1}. ${prop.title || "بدون عنوان"} (${badge.label})`,
        toPersianNum(prop.views),
      ]);
    });
  }

  await exportToPdf(headers, rows, title);
}