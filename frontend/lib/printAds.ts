// lib/printAds.ts — نسخه pdfmake با فونت پیش‌فرض

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// اتصال فونت‌ها به pdfmake (الزامی برای تولید PDF)
// برای رفع خطای TypeScript از any استفاده می‌کنیم
(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
(pdfMake as any).fonts = pdfFonts.pdfMake.fonts;

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface PrintAd {
  _id: string;
  title: string;
  price: number;
  priceString?: string;
  isPriceNegotiable?: boolean;
  province?: string;
  city: string;
  district?: string;
  neighborhood?: string;
  address?: string;
  fullAddress?: string;
  propertyType?: string;
  adType?: string;
  area?: number;
  buildingArea?: number;
  rooms?: number;
  floor?: number;
  floorCount?: number;
  yearBuilt?: number;
  buildingAge?: number;
  parkingCount?: number;
  unitsPerFloor?: number;
  rentPrice?: number;
  mortgagePrice?: number;
  depositPrice?: number;
  rentalPricePerNight?: number;
  documentType?: string;
  usage?: string;
  landWidth?: number;
  landLength?: number;
  landUsage?: string;
  officeType?: string;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasStorage?: boolean;
  hasBalcony?: boolean;
  hasYard?: boolean;
  hasPool?: boolean;
  hasSauna?: boolean;
  hasFireplace?: boolean;
  hasGym?: boolean;
  hasWifi?: boolean;
  hasKitchen?: boolean;
  hasJacuzzi?: boolean;
  hasTv?: boolean;
  heatingSystem?: string;
  coolingSystem?: string;
  flooring?: string;
  buildingFacade?: string;
  buildingOrientation?: string;
  unitOrientation?: string;
  isUrgent?: boolean;
  isVerified?: boolean;
  status?: string;
  furnishingStatus?: string;
  renovationStatus?: string;
  description?: string;
  images?: string[];
  phone?: string;
  contactName?: string;
  agentName?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  sellerName?: string;
  views?: number;
  createdAt?: string;
  additionalProperties?: { name: string; value: string }[];
}

export interface PrintOptions {
  agencyName?: string;
  agentName?: string;
  baseUrl?: string;
  watermarkImageUrl?: string;
  onProgress?: (msg: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════
   MAPPER
   ═══════════════════════════════════════════════════════════════════ */

export function mapBackendAdToPrintAd(raw: any): PrintAd {
  if (!raw) return raw;
  const amenities = raw.amenities || {};
  return {
    _id: raw._id,
    title: raw.title || "",
    price: raw.price ?? 0,
    priceString: raw.priceString,
    isPriceNegotiable: raw.isPriceNegotiable,
    province: raw.province,
    city: raw.city || "",
    district: raw.district,
    neighborhood: raw.neighborhood,
    address: raw.address || raw.fullAddress,
    fullAddress: raw.fullAddress,
    propertyType: raw.propertyType,
    adType: raw.adType,
    area: raw.area,
    buildingArea: raw.buildingArea,
    rooms: raw.rooms,
    floor: raw.floor,
    floorCount: raw.floorCount,
    yearBuilt: raw.yearBuilt,
    buildingAge: raw.buildingAge,
    parkingCount: raw.parkingCount,
    unitsPerFloor: raw.unitsPerFloor,
    rentPrice: raw.rentPrice,
    mortgagePrice: raw.mortgagePrice,
    depositPrice: raw.depositPrice,
    rentalPricePerNight: raw.rentalPricePerNight,
    documentType: raw.documentType,
    usage: raw.usage,
    landWidth: raw.landWidth,
    landLength: raw.landLength,
    landUsage: raw.landUsage,
    officeType: raw.officeType,
    hasElevator: !!amenities.elevator,
    hasParking: !!amenities.parking,
    hasStorage: !!amenities.storage,
    hasBalcony: !!amenities.balcony,
    hasYard: !!amenities.yard,
    hasPool: !!amenities.pool,
    hasSauna: !!amenities.sauna,
    hasFireplace: !!amenities.fireplace,
    hasGym: !!amenities.gym,
    hasWifi: !!amenities.wifi,
    hasKitchen: !!amenities.kitchen,
    hasJacuzzi: !!amenities.jacuzzi,
    hasTv: !!amenities.tv,
    heatingSystem: raw.heatingSystem,
    coolingSystem: raw.coolingSystem,
    flooring: raw.flooring,
    buildingFacade: raw.buildingFacade,
    buildingOrientation: raw.buildingOrientation,
    unitOrientation: raw.unitOrientation,
    isUrgent: raw.isUrgent,
    isVerified: raw.isVerified,
    status: raw.status,
    furnishingStatus: raw.furnishingStatus,
    renovationStatus: raw.renovationStatus,
    description: raw.description,
    images: raw.images,
    phone: raw.contactPhone || raw.phone,
    contactName: raw.contactName,
    agentName: raw.agentName || raw.contactName || raw.sellerName,
    agencyName: raw.agencyName,
    agencyPhone: raw.agencyPhone,
    agencyAddress: raw.agencyAddress,
    sellerName: raw.sellerName,
    views: raw.views,
    createdAt: raw.createdAt,
    additionalProperties: raw.additionalProperties,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   LABELS & FORMATTERS
   ═══════════════════════════════════════════════════════════════════ */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (num: number | string | null | undefined): string => {
  if (num == null) return "";
  return num.toString().replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d)]);
};

const formatPrice = (
  price?: number,
  priceString?: string,
  negotiable?: boolean,
): string => {
  if (negotiable) return "توافقی";
  if (priceString) return priceString;
  if (price) return toFa(price.toLocaleString()) + " تومان";
  return "نامشخص";
};

const PROPERTY_LABELS: Record<string, string> = {
  apartment: "آپارتمان",
  villa: "ویلایی",
  house: "خانه حیاط‌دار",
  land: "زمین",
  suite: "سوئیت",
  office: "دفتر اداری",
  commercial: "مغازه تجاری",
  bare_land: "کلنگی",
  penthouse: "پنت‌هاوس",
  duplex: "دوبلکس",
  garden: "باغ",
  hotel: "مهمان‌پذیر",
};

const AD_TYPE_LABELS: Record<string, string> = {
  sale: "فروش",
  rent: "اجاره",
  daily_rent: "اجاره روزانه",
  exchange: "معاوضه",
  mortgage: "رهن و اجاره",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  personal: "شخصی",
  cooperative: "تعاونی",
  official: "رسمی",
  condominium: "آپارتمانی",
  agricultural: "زراعی",
  garden_doc: "باغی",
  other: "سایر",
};

const HEATING_LABELS: Record<string, string> = {
  shoofazh: "شوفاژ",
  pakage: "پکیج",
  package: "پکیج",
  dastgah_markazi: "دستگاه مرکزی",
  central: "شوفاژ مرکزی",
  heater: "بخاری",
  adeghi: "ادگهی",
  radiator: "رادیاتور",
  fireplace: "شومینه",
  floor_heating: "گرمایش از کف",
  other: "سایر",
};

const COOLING_LABELS: Record<string, string> = {
  kooler_aby: "کولر آبی",
  kooler_gazi: "کولر گازی",
  split: "اسپلیت",
  chiller: "چیلر",
  fancoil: "فن‌کوئل",
  fan_coil: "فن‌کوئل",
  other: "سایر",
};

const FLOORING_LABELS: Record<string, string> = {
  ceramic: "سرامیک",
  parket: "پارکت",
  parquet: "پارکت",
  moquet: "موکت",
  mosaic: "موزاییک",
  sang: "سنگ",
  stone: "سنگ",
  laminet: "لمینت",
  laminate: "لمینت",
  epoxy: "اپوکسی",
  pvc: "پی‌وی‌سی",
  cement: "سیمان",
  other: "سایر",
};

const FACADE_LABELS: Record<string, string> = {
  brick: "آجری",
  stone: "سنگی",
  composite: "کامپوزیت",
  ceramic: "سرامیک",
  wooden: "چوبی",
  cement: "سیمانی",
  modern: "نمای مدرن",
  other: "سایر",
};

const USAGE_LABELS: Record<string, string> = {
  maskani: "مسکونی",
  residential: "مسکونی",
  tejarati: "تجاری",
  commercial: "تجاری",
  edari: "اداری",
  office: "اداری",
  sanati: "صنعتی",
  industrial: "صنعتی",
  amozeshi: "آموزشی",
  behdashti: "بهداشتی",
  vardaneshi: "ورزشی",
  agricultural: "کشاورزی",
  mixed: "مختلط",
  other: "سایر",
};

const FURNISHING_LABELS: Record<string, string> = {
  furnished: "مبله",
  semi_furnished: "نیمه مبله",
  empty: "بدون مبله",
};

const RENOVATION_LABELS: Record<string, string> = {
  fully_renovated: "کاملاً بازسازی شده",
  partially_renovated: "بازسازی جزئی",
  needs_renovation: "نیاز به بازسازی",
};

const OFFICE_LABELS: Record<string, string> = {
  mustaqel: "مستقل",
  tabaghei: "طبقه‌ای",
  majmooe_edari: "مجتمع اداری",
  pasaazh: "پاساژ",
  bazar_sanati: "بازار صنعتی",
  other: "سایر",
};

const LAND_USAGE_LABELS: Record<string, string> = {
  maskani: "مسکونی",
  keshavarzi: "کشاورزی",
  sanati: "صنعتی",
  tejarati: "تجاری",
  bagh: "باغ",
  other: "سایر",
};

const L = (map: Record<string, string>, val: string | undefined): string =>
  val ? map[val] || val : "";

const formatFloor = (floor?: number | string): string => {
  if (floor === undefined || floor === null) return "نامشخص";
  if (floor === 0 || floor === "0") return "همکف";
  return toFa(floor);
};

/* ═══════════════════════════════════════════════════════════════════
   بارگذاری تصاویر
   ═══════════════════════════════════════════════════════════════════ */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function loadImagesAsBase64(
  images: string[],
  baseUrl: string,
): Promise<string[]> {
  const resolved = images
    .map((img) => {
      if (!img) return "";
      if (img.startsWith("data:")) return img;
      if (img.startsWith("http")) return img;
      return `${baseUrl}${img.startsWith("/") ? "" : "/"}${img.replace(/^\//, "")}`;
    })
    .filter(Boolean);

  const results = await Promise.allSettled(
    resolved.map(async (url) => {
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error("fetch failed");
        const blob = await resp.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return url;
      }
    }),
  );

  return results.map((r) => (r.status === "fulfilled" ? r.value : ""));
}

/* ═══════════════════════════════════════════════════════════════════
   ساخت سند PDF برای یک آگهی
   ═══════════════════════════════════════════════════════════════════ */

async function buildSingleAdDocument(ad: PrintAd, options?: PrintOptions) {
  const baseUrl =
    options?.baseUrl ||
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
    "http://localhost:5001";

  const imageBase64List = await loadImagesAsBase64(ad.images || [], baseUrl);

  const features: string[] = [];
  if (ad.hasElevator) features.push("آسانسور");
  if (ad.hasParking)
    features.push(`پارکینگ${ad.parkingCount ? ` (${toFa(ad.parkingCount)})` : ""}`);
  if (ad.hasStorage) features.push("انباری");
  if (ad.hasBalcony) features.push("بالکن");
  if (ad.hasYard) features.push("حیاط / باغچه");
  if (ad.hasPool) features.push("استخر");
  if (ad.hasSauna) features.push("سونا");
  if (ad.hasFireplace) features.push("شومینه");
  if (ad.hasGym) features.push("باشگاه");
  if (ad.hasWifi) features.push("وای‌فای");
  if (ad.hasKitchen) features.push("آشپزخانه");
  if (ad.hasJacuzzi) features.push("جکوزی");

  const specRows: any[] = [
    [{ text: "نوع ملک", style: "label" }, L(PROPERTY_LABELS, ad.propertyType)],
    [{ text: "نوع معامله", style: "label" }, L(AD_TYPE_LABELS, ad.adType)],
    [{ text: "متراژ", style: "label" }, ad.area ? `${toFa(ad.area)} متر مربع` : "—"],
    [{ text: "اتاق", style: "label" }, ad.rooms ? toFa(ad.rooms) : "—"],
    [{ text: "طبقه", style: "label" }, formatFloor(ad.floor)],
    [{ text: "کل طبقات", style: "label" }, ad.floorCount ? toFa(ad.floorCount) : "—"],
    [{ text: "سال ساخت", style: "label" }, ad.yearBuilt ? toFa(ad.yearBuilt) : "—"],
    [{ text: "سن بنا", style: "label" }, ad.buildingAge ? `${toFa(ad.buildingAge)} سال` : "—"],
    [{ text: "سند", style: "label" }, L(DOC_TYPE_LABELS, ad.documentType)],
    [{ text: "کاربری", style: "label" }, L(USAGE_LABELS, ad.usage)],
    [{ text: "گرمایش", style: "label" }, L(HEATING_LABELS, ad.heatingSystem)],
    [{ text: "سرمایش", style: "label" }, L(COOLING_LABELS, ad.coolingSystem)],
    [{ text: "کف‌پوش", style: "label" }, L(FLOORING_LABELS, ad.flooring)],
    [{ text: "نما", style: "label" }, L(FACADE_LABELS, ad.buildingFacade)],
  ];

  const filteredSpecRows = specRows.filter((row) => row[1] && row[1] !== "—");

  const images = imageBase64List.slice(0, 4).map((img) => ({
    image: img,
    width: 150,
    margin: [0, 5],
  }));

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        columns: [
          {
            width: "65%",
            stack: [
              { text: ad.title, style: "title" },
              {
                text: `${ad.province ? ad.province + "، " : ""}${ad.city}${ad.district ? "، " + ad.district : ""}`,
                style: "location",
              },
            ],
          },
          {
            width: "35%",
            stack: [
              {
                text: formatPrice(ad.price, ad.priceString, ad.isPriceNegotiable),
                style: "price",
              },
              ad.rentPrice ? { text: `اجاره: ${formatPrice(ad.rentPrice)}`, style: "subPrice" } : {},
              ad.mortgagePrice ? { text: `رهن: ${formatPrice(ad.mortgagePrice)}`, style: "subPrice" } : {},
              ad.depositPrice ? { text: `ودیعه: ${formatPrice(ad.depositPrice)}`, style: "subPrice" } : {},
            ],
            alignment: "left",
          },
        ],
        margin: [0, 0, 0, 20],
      },
      images.length > 0
        ? {
            table: {
              widths: ["*", "*"],
              body: [
                images.map((img) => ({
                  image: img.image,
                  width: 150,
                  margin: [0, 2],
                })),
              ],
            },
            layout: "noBorders",
          }
        : {},
      { text: "مشخصات ملک", style: "sectionTitle", margin: [0, 20, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ["30%", "70%"],
          body: [
            [{ text: "شاخص", style: "tableHeader" }, { text: "مقدار", style: "tableHeader" }],
            ...filteredSpecRows.map((row) => [
              { text: row[0].text, style: "label" },
              { text: row[1], style: "value" },
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff"),
          hLineColor: "#e2e8f0",
          vLineColor: "#e2e8f0",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      features.length > 0
        ? { text: "امکانات رفاهی", style: "sectionTitle", margin: [0, 20, 0, 10] }
        : {},
      features.length > 0
        ? {
            table: {
              widths: features.map(() => "*"),
              body: [features.map((f) => ({ text: f, style: "feature" }))],
            },
            layout: "noBorders",
          }
        : {},
      ad.description
        ? { text: "توضیحات تکمیلی", style: "sectionTitle", margin: [0, 20, 0, 10] }
        : {},
      ad.description ? { text: ad.description, style: "description" } : {},
    ],
    styles: {
      headerTitle: { fontSize: 14, bold: true, color: "#ea580c" },
      title: { fontSize: 18, bold: true, color: "#0f172a" },
      location: { fontSize: 11, color: "#4b5563", margin: [0, 4, 0, 0] },
      price: { fontSize: 20, bold: true, color: "#ea580c" },
      subPrice: { fontSize: 10, color: "#6b7280" },
      sectionTitle: { fontSize: 14, bold: true, color: "#ea580c", margin: [0, 20, 0, 10] },
      label: { fontSize: 9, color: "#475569", bold: true },
      value: { fontSize: 10, color: "#0f172a" },
      tableHeader: { fontSize: 10, bold: true, color: "#ffffff", fillColor: "#f97316", alignment: "center" },
      feature: { fontSize: 9, color: "#0f172a", fillColor: "#f1f5f9", margin: [2, 2] },
      description: { fontSize: 10, color: "#334155", lineHeight: 1.6 },
      footer: { fontSize: 8, color: "#64748b" },
    },
  };

  return docDefinition;
}

/* ═══════════════════════════════════════════════════════════════════
   ساخت سند PDF برای لیست آگهی‌ها
   ═══════════════════════════════════════════════════════════════════ */

async function buildBulkAdsDocument(ads: PrintAd[], options?: PrintOptions) {
  const baseUrl =
    options?.baseUrl ||
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
    "http://localhost:5001";

  const allImages = await Promise.all(
    ads.map((ad) => loadImagesAsBase64(ad.images || [], baseUrl)),
  );

  const cards = ads.map((ad, i) => {
    const img = allImages[i]?.[0] || "";
    return [
      {
        columns: [
          img
            ? { image: img, width: 100, margin: [0, 0, 10, 0] }
            : { text: "بدون تصویر", width: 100, alignment: "center", margin: [0, 0, 10, 0] },
          {
            width: "*",
            stack: [
              { text: ad.title, style: "cardTitle" },
              { text: formatPrice(ad.price, ad.priceString, ad.isPriceNegotiable), style: "cardPrice" },
              {
                text: `${ad.city}${ad.district ? "، " + ad.district : ""}`,
                style: "cardLocation",
              },
              {
                text: `${toFa(ad.area || "")} م² | ${ad.rooms ? toFa(ad.rooms) + " خوابه" : ""} | ${formatFloor(ad.floor)}`,
                style: "cardMeta",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
    ];
  });

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    content: cards.flat(),
    styles: {
      headerTitle: { fontSize: 14, bold: true, color: "#ea580c" },
      cardTitle: { fontSize: 12, bold: true, color: "#0f172a" },
      cardPrice: { fontSize: 14, bold: true, color: "#ea580c" },
      cardLocation: { fontSize: 9, color: "#4b5563" },
      cardMeta: { fontSize: 8, color: "#64748b" },
    },
  };

  return docDefinition;
}

/* ═══════════════════════════════════════════════════════════════════
   توابع عمومی
   ═══════════════════════════════════════════════════════════════════ */

export async function printSingleAd(ad: PrintAd, options?: PrintOptions) {
  const docDefinition = await buildSingleAdDocument(ad, options);
  pdfMake.createPdf(docDefinition).download(`آگهی-${ad.title.slice(0, 30)}.pdf`);
}

export async function printBulkAds(ads: PrintAd[], options?: PrintOptions) {
  if (ads.length === 0) return;
  const docDefinition = await buildBulkAdsDocument(ads, options);
  pdfMake.createPdf(docDefinition).download(`لیست-آگهی‌ها.pdf`);
}

export async function printSingleAdBrowser(ad: PrintAd, options?: PrintOptions) {
  const docDefinition = await buildSingleAdDocument(ad, options);
  pdfMake.createPdf(docDefinition).open();
}

export async function printBulkAdsBrowser(ads: PrintAd[], options?: PrintOptions) {
  if (ads.length === 0) return;
  const docDefinition = await buildBulkAdsDocument(ads, options);
  pdfMake.createPdf(docDefinition).open();
}