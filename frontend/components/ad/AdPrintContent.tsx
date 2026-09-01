"use client";

import React from "react";

interface AdPrintContentProps {
  adData: any;
  sellerName: string;
  sellerPhone: string;
}

const amenityLabels: Record<string, string> = {
  parking: "پارکینگ",
  storage: "انباری",
  elevator: "آسانسور",
  balcony: "بالکن",
  pool: "استخر",
  yard: "حیاط",
};

export function AdPrintContent({
  adData,
  sellerName,
  sellerPhone,
}: AdPrintContentProps) {
  const formatPhone = (phone?: string) => {
    if (!phone) return "—";
    return phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  };

  const formatPrice = (price?: number) =>
    price && price > 0
      ? price.toLocaleString("fa-IR") + " تومان"
      : "توافقی";

  const today = new Date().toLocaleDateString("fa-IR");
  const time = new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const amenities = adData?.amenities || {};
  const amenityList = Object.entries(amenities)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => amenityLabels[key] || key);

  const specs: Array<[string, string | number | undefined]> = [
    ["نوع ملک", adData?.propertyType || adData?.category?.name],
    ["نوع معامله", adData?.adType || adData?.priceType],
    ["متراژ", adData?.area ? `${adData.area} متر مربع` : undefined],
    ["اتاق", adData?.rooms],
    ["طبقه", adData?.floor],
    ["کل طبقات", adData?.floorCount],
    ["سال ساخت", adData?.yearBuilt],
    [
      "سن بنا",
      adData?.buildingAge != null ? `${adData.buildingAge} سال` : undefined,
    ],
    ["پارکینگ", adData?.parkingCount != null ? `${adData.parkingCount} خودرو` : undefined],
    ["سند", adData?.documentType],
    ["کاربری", adData?.usage],
  ];

  const images: string[] = Array.isArray(adData?.images)
    ? adData.images.slice(0, 4)
    : [];

  return (
    <div
      className="print-area"
      dir="rtl"
      style={{
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        direction: "rtl",
        background: "#ffffff",
        color: "#111827",
        padding: "16px",
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* هدر */}
      <div
        style={{
          borderBottom: "2px solid #f97316",
          paddingBottom: "10px",
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/images/tabadol-logo-light.PNG"
            alt="تبادل"
            style={{ height: "34px", width: "auto", objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#ea580c",
              }}
            >
              پلتفرم آگهی تبادل
            </div>
            <div style={{ fontSize: "9px", color: "#666" }}>
              بازار آنلاین املاک و کالا
            </div>
          </div>
        </div>
        <div style={{ textAlign: "left", fontSize: "10px", color: "#444" }}>
          <div>تاریخ: {today}</div>
          <div>ساعت: {time}</div>
        </div>
      </div>

      {/* عنوان و قیمت */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h1
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              margin: "0 0 6px",
              lineHeight: 1.5,
            }}
          >
            {adData?.title || "بدون عنوان"}
          </h1>
          <div style={{ color: "#4b5563", fontSize: "12px" }}>
            📍{" "}
            {adData?.province ? `${adData.province}، ` : ""}
            {adData?.city || "—"}
            {adData?.district ? `، ${adData.district}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#ea580c",
            }}
          >
            {formatPrice(adData?.price)}
          </div>
          {adData?.rentPrice ? (
            <div style={{ fontSize: "11px", color: "#666" }}>
              اجاره: {formatPrice(adData.rentPrice)}
            </div>
          ) : null}
          {adData?.mortgagePrice ? (
            <div style={{ fontSize: "11px", color: "#666" }}>
              رهن: {formatPrice(adData.mortgagePrice)}
            </div>
          ) : null}
        </div>
      </div>

      {/* تصاویر */}
      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          {images.map((src, i) => (
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

      {/* مشخصات */}
      <h2
        style={{
          fontSize: "13px",
          fontWeight: "bold",
          color: "#ea580c",
          borderRight: "3px solid #f97316",
          paddingRight: "6px",
          margin: "0 0 8px",
        }}
      >
        مشخصات ملک
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "14px",
          fontSize: "11px",
        }}
      >
        <tbody>
          {specs.map(([label, value], idx) => (
            <tr
              key={idx}
              style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff" }}
            >
              <td
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
                style={{
                  padding: "6px 8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {value ?? "—"}
              </td>
            </tr>
          ))}
          {Array.isArray(adData?.additionalProperties) &&
            adData.additionalProperties.map(
              (prop: { name: string; value: string }, idx: number) => (
                <tr
                  key={`extra-${idx}`}
                  style={{
                    background:
                      (specs.length + idx) % 2 === 0 ? "#f8fafc" : "#fff",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 8px",
                      border: "1px solid #e2e8f0",
                      fontWeight: 600,
                    }}
                  >
                    {prop.name}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {prop.value}
                  </td>
                </tr>
              )
            )}
        </tbody>
      </table>

      {/* امکانات */}
      {amenityList.length > 0 && (
        <>
          <h2
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#ea580c",
              borderRight: "3px solid #f97316",
              paddingRight: "6px",
              margin: "0 0 8px",
            }}
          >
            امکانات رفاهی
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
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
      {adData?.description ? (
        <>
          <h2
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#ea580c",
              borderRight: "3px solid #f97316",
              paddingRight: "6px",
              margin: "0 0 8px",
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
              marginBottom: "14px",
              fontSize: "11px",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              textAlign: "justify",
            }}
          >
            {adData.description}
          </div>
        </>
      ) : null}

      {/* فروشنده */}
      <div
        style={{
          marginTop: "8px",
          border: "1.5px solid #ea580c",
          borderRadius: "8px",
          padding: "10px 12px",
          background: "#fff7ed",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          fontSize: "11px",
        }}
      >
        <div>
          <div style={{ color: "#666", fontSize: "10px" }}>آگهی‌دهنده</div>
          <div style={{ fontWeight: "bold", fontSize: "13px" }}>
            {sellerName}
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#666", fontSize: "10px" }}>شماره تماس</div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "15px",
              color: "#ea580c",
              direction: "ltr",
            }}
          >
            {formatPhone(sellerPhone)}
          </div>
        </div>
      </div>
    </div>
  );
}