import * as XLSX from "xlsx";
import { AdminPanelStats } from "@/services/api/admin-panel.api";

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

// ==================== دانلود Excel ====================
export function downloadExcel(stats: AdminPanelStats) {
  const persianDate = getPersianDate();

  const data = [
    ["📊 گزارش جامع سیستم تبادل", ""],
    ["", ""],
    ["تاریخ تهیه:", persianDate],
    ["", ""],
    ["─────────────────────────────────", ""],
    ["👥 آمار کاربران", ""],
    ["کل کاربران", stats?.totalUsers ?? 0],
    ["کاربران امروز", stats?.todayUsers ?? 0],
    ["", ""],
    ["📋 آمار آگهی‌ها", ""],
    ["کل آگهی‌ها", stats?.totalAds ?? 0],
    ["آگهی‌های در انتظار تأیید", stats?.pendingAds ?? 0],
    ["آگهی‌های امروز", stats?.todayAds ?? 0],
    ["", ""],
    ["🏠 آمار املاک", ""],
    ["کل املاک", stats?.totalProperties ?? 0],
    ["", ""],
    ["🚨 آمار گزارشات", ""],
    ["کل گزارشات", stats?.totalReports ?? 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 32 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };

  XLSX.utils.book_append_sheet(wb, ws, "گزارش سیستم");

  const dateStr = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  const fileName = `گزارش-سیستم-تبادل-${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

// ==================== دانلود PDF (HTML → Print) ====================
export function downloadPDF(stats: AdminPanelStats) {
  const persianDate = getPersianDate();
  const dateStr = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  const pageTitle = `گزارش-جامع-سیستم-تبادل-${dateStr}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${pageTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
          background: #ffffff;
          color: #1e293b;
          direction: rtl;
          padding: 36px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .header {
          text-align: center;
          border-bottom: 3px solid #f97316;
          padding-bottom: 20px;
          margin-bottom: 28px;
        }

        .logo-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .logo-icon {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #ea580c;
        }

        .meta {
          font-size: 12px;
          color: #64748b;
          margin-top: 6px;
        }

        .section { margin-bottom: 24px; }
        .section-title { font-size: 15px; font-weight: 700; color: #ea580c; border-right: 4px solid #f97316; padding-right: 10px; margin-bottom: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
        .stat-label { font-size: 13px; color: #64748b; }
        .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; }
        .stat-card.highlight { background: linear-gradient(135deg, #f97316, #ea580c); border: none; color: #ffffff; }
        .stat-card.highlight .stat-label, .stat-card.highlight .stat-value { color: #ffffff; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f97316; color: #ffffff; padding: 10px 14px; text-align: right; font-weight: 600; }
        td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; }
        tr:nth-child(even) td { background: #f8fafc; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-orange { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-yellow { background: #fef9c3; color: #a16207; }
        .badge-red { background: #fee2e2; color: #b91c1c; }
        .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
        @media print { body { padding: 10mm; } @page { size: A4; margin: 10mm; } }
      </style>
    </head>
    <body>

      <div class="header">
        <div class="logo-bar">
          <img src="/images/tabadol-logo-light.PNG" alt="تبادل" class="logo-icon" />
          <h1>گزارش جامع سیستم تبادل</h1>
        </div>
        <p class="meta">تاریخ تهیه: ${persianDate}</p>
      </div>

      <!-- آمار کلی -->
      <div class="section">
        <div class="section-title">📈 آمار کلی سیستم</div>
        <div class="stats-grid">
          <div class="stat-card highlight">
            <div class="stat-label">کل کاربران</div>
            <div class="stat-value">${toPersianNum(stats?.totalUsers)}</div>
          </div>
          <div class="stat-card highlight">
            <div class="stat-label">کل آگهی‌ها</div>
            <div class="stat-value">${toPersianNum(stats?.totalAds)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">کاربران امروز</div>
            <div class="stat-value">${toPersianNum(stats?.todayUsers)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">آگهی‌های امروز</div>
            <div class="stat-value">${toPersianNum(stats?.todayAds)}</div>
          </div>
        </div>
      </div>

      <!-- جدول جزئیات آگهی‌ها -->
      <div class="section">
        <div class="section-title">📋 جزئیات آگهی‌ها</div>
        <table>
          <thead>
            <tr>
              <th>شاخص</th>
              <th>مقدار</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>کل آگهی‌ها</td>
              <td>${toPersianNum(stats?.totalAds)}</td>
              <td><span class="badge badge-orange">کل</span></td>
            </tr>
            <tr>
              <td>در انتظار تأیید</td>
              <td>${toPersianNum(stats?.pendingAds)}</td>
              <td><span class="badge badge-yellow">نیازمند بررسی</span></td>
            </tr>
            <tr>
              <td>آگهی‌های امروز</td>
              <td>${toPersianNum(stats?.todayAds)}</td>
              <td><span class="badge badge-green">جدید</span></td>
            </tr>
            <tr>
              <td>کل املاک</td>
              <td>${toPersianNum(stats?.totalProperties)}</td>
              <td><span class="badge badge-orange">ثبت شده</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- جدول جزئیات کاربران -->
      <div class="section">
        <div class="section-title">👥 جزئیات کاربران</div>
        <table>
          <thead>
            <tr>
              <th>شاخص</th>
              <th>مقدار</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>کل کاربران ثبت‌نام شده</td>
              <td>${toPersianNum(stats?.totalUsers)}</td>
              <td><span class="badge badge-orange">کل</span></td>
            </tr>
            <tr>
              <td>کاربران ثبت‌نام امروز</td>
              <td>${toPersianNum(stats?.todayUsers)}</td>
              <td><span class="badge badge-green">جدید</span></td>
            </tr>
            <tr>
              <td>گزارش‌های ثبت شده</td>
              <td>${toPersianNum(stats?.totalReports)}</td>
              <td><span class="badge badge-red">بررسی</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        این گزارش به صورت خودکار توسط سامانه تبادل تهیه شده است
        &nbsp;|&nbsp; ${persianDate}
      </div>

    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert(
      "لطفاً اجازه باز شدن پنجره‌های پاپ‌آپ (Pop-up) را در مرورگر خود بدهید.",
    );
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    if (printWindow.document.fonts) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 200);
      });
    } else {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 600);
    }
  };
}