// frontend/components/ad/AdPrintContent.tsx

import React from "react";

interface AdPrintContentProps {
  adData: any;
  sellerName: string;
  sellerPhone: string;
}

export function AdPrintContent({
  adData,
  sellerName,
  sellerPhone,
}: AdPrintContentProps) {
  const formatPhone = (phone: string) =>
    phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  const formatPrice = (price?: number) =>
    price ? price.toLocaleString("fa-IR") + " تومان" : "توافقی";
  const today = new Date().toLocaleDateString("fa-IR");
  const time = new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const amenities = adData?.amenities || {};
  const amenityList = Object.entries(amenities)
    .filter(([, value]) => value)
    .map(([key]) => key);

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        direction: "rtl",
        background: "#ffffff",
        color: "#111827",
        padding: "15px",
        maxWidth: "800px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* استایل چاپ */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
          }
          .print-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            flex-wrap: wrap;
          }
          .ad-gallery {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .ad-gallery img {
            width: 100% !important;
            height: 150px !important;
            object-fit: cover !important;
            border-radius: 6px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .spec-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 15px !important;
          }
          .spec-table td {
            padding: 6px 8px !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 11px !important;
            vertical-align: middle;
          }
          .spec-table .label {
            background: #f8fafc;
            font-weight: 600;
            width: 35%;
          }
          .spec-table .value {
            font-weight: 500;
          }
          .feature-chip {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            padding: 3px 10px;
            font-size: 10px;
            margin: 0 3px 6px 0;
          }
          .description-box {
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
            background: #fafafa;
            margin-bottom: 15px;
          }
          .watermark {
            position: absolute;
            bottom: 10px;
            left: 10px;
            opacity: 0.1;
            pointer-events: none;
          }
          @media (max-width: 600px) {
            .ad-gallery {
              grid-template-columns: 1fr !important;
            }
            .ad-gallery img {
              height: 180px !important;
            }
          }
        }
      `}</style>

      <div className="print-area">
        {/* هدر */}
        <div
          className="print-header"
          style={{
            borderBottom: "2px solid #f97316",
            paddingBottom: "8px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src="/images/tabadol-logo-light.PNG"
              alt="تبادل"
              style={{ height: "35px", width: "auto", objectFit: "contain" }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#ea580c" }}>
                پلتفرم آگهی تبادل
              </div>
              <div style={{ fontSize: "9px", color: "#666" }}>
                بازار آنلاین املاک و کالا
              </div>
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "10px", color: "#444" }}>تاریخ: {today}</div>
            <div style={{ fontSize: "10px", color: "#444" }}>ساعت: {time}</div>
          </div>
        </div>

        {/* عنوان و قیمت */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 4px" }}>
              {adData?.title || "بدون عنوان"}
            </h1>
            <div style={{ color: "#4b5563", fontSize: "12px" }}>
              📍 {adData?.province ? `${adData.province}، ` : ""}
              {adData?.city || ""}
              {adData?.district ? `، ${adData.district}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ea580c" }}>
              {formatPrice(adData?.price)}
            </div>
            {adData?.rentPrice && (
              <div style={{ fontSize: "11px", color: "#666" }}>اجاره: {formatPrice(adData.rentPrice)}</div>
            )}
            {adData?.mortgagePrice && (
              <div style={{ fontSize: "11px", color: "#666" }}>رهن: {formatPrice(adData.mortgagePrice)}</div>
            )}
            {adData?.depositPrice && (
              <div style={{ fontSize: "11px", color: "#666" }}>ودیعه: {formatPrice(adData.depositPrice)}</div>
            )}
          </div>
        </div>

        {/* گالری تصاویر */}
        {(adData?.images || []).length > 0 && (
          <div
            className="ad-gallery"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {(adData.images || []).slice(0, 4).map((src: string, i: number) => (
              <img
                key={i}
                src={src}
                alt={`تصویر ${i + 1}`}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              />
            ))}
          </div>
        )}

        {/* جدول مشخصات */}
        <h2
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#ea580c",
            borderRight: "3px solid #f97316",
            paddingRight: "6px",
            margin: "12px 0 8px",
          }}
        >
          مشخصات ملک
        </h2>
        <table
          className="spec-table"
          style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}
        >
          <tbody>
            {[
              ["نوع ملک", adData?.propertyType],
              ["نوع معامله", adData?.adType],
              ["متراژ", adData?.area ? `${adData.area} متر مربع` : "—"],
              ["اتاق", adData?.rooms],
              ["طبقه", adData?.floor],
              ["کل طبقات", adData?.floorCount],
              ["سال ساخت", adData?.yearBuilt],
              ["سن بنا", adData?.buildingAge ? `${adData.buildingAge} سال` : "—"],
              ["سند", adData?.documentType],
              ["کاربری", adData?.usage],
            ].map(([label, value], idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff" }}>
                <td
                  className="label"
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 600,
                    width: "35%",
                  }}
                >
                  {label}
                </td>
                <td
                  className="value"
                  style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}
                >
                  {value || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* امکانات رفاهی */}
        {amenityList.length > 0 && (
          <>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#ea580c",
                borderRight: "3px solid #f97316",
                paddingRight: "6px",
                margin: "12px 0 8px",
              }}
            >
              امکانات رفاهی
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
              {amenityList.map((amenity) => (
                <span
                  key={amenity}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "10px",
                  }}
                >
                  {amenity}
                </span>
              ))}
            </div>
          </>
        )}

        {/* توضیحات */}
        {adData?.description && (
          <>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#ea580c",
                borderRight: "3px solid #f97316",
                paddingRight: "6px",
                margin: "12px 0 8px",
              }}
            >
              توضیحات تکمیلی
            </h2>
            <div
              style={{
                border: "1px solid #e2e8f0",
                padding: "10px",
                borderRadius: "6px",
                background: "#fafafa",
                marginBottom: "12px",
                fontSize: "11px",
                lineHeight: "1.6",
              }}
            >
              {adData.description}
            </div>
          </>
        )}

        {/* اطلاعات فروشنده */}
        <div
          style={{
            marginTop: "12px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#64748b",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          <span>فروشنده: {sellerName}</span>
          <span>تلفن: {formatPhone(sellerPhone || "—")}</span>
        </div>
      </div>

      {/* واترمارک */}
      <div
        className="watermark"
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          opacity: 0.1,
          pointerEvents: "none",
        }}
      >
        <img
          src="/images/tabadol-logo-light.PNG"
          alt="واترمارک"
          style={{ width: "70px", height: "auto" }}
        />
      </div>
    </div>
  );
}