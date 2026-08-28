// backend/src/controllers/market.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import { ALL_PROVINCES_DATA } from "../data/iranDivisions";
import { AuthRequest } from "../middleware/auth.middleware";
import { Province } from "../models/Province.model";
import { Property } from "../models/Property.model";
import { Ad } from "../models/Ad.model";
import { MarketAnalysis } from "../models/MarketAnalysis.model";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { getQueryStr } from "../utils/queryHelpers";
const getAd = () => mongoose.model("Ad");

// ======================== HELPERS ========================
function getCitiesForProvince(provinceName: string): string[] {
  const province = ALL_PROVINCES_DATA.find((p) => p.name === provinceName);
  if (province) return province.cities.map((c) => c.name);
  for (const p of ALL_PROVINCES_DATA) {
    if (p.name.includes(provinceName) || provinceName.includes(p.name)) {
      return p.cities.map((c) => c.name);
    }
  }
  return [provinceName];
}

type PropertyUnion = {
  price?: number;
  title?: string;
  propertyType?: string;
  createdAt: Date | string;
};

const hotZonesMap: Record<string, string[]> = {
  tehran: ["تهرانپارس", "اکباتان", "سعادت‌آباد", "پونک", "ونک", "زعفرانیه"],
  mashhad: ["الهیه", "سجاد", "وکیل‌آباد", "مهرآباد", "آرامگاه", "چمن"],
  isfahan: ["شیخ بهایی", "چهارباغ", "جی", "خواجو", "نقش جهان", "درچه"],
  shiraz: ["معالی‌آباد", "گلدشت", "موسوی", "فرشته", "قصردشت", "زرهی"],
  tabriz: ["ولنجک", "روشنایی", "خاقانی", "ایل گلی", "فجر", "میدان ساعت"],
  karaj: ["مهرشهر", "گوهردشت", "هفت‌تیر", "رجایی‌شهر", "کیانمهر"],
  ahvaz: ["کیانپارس", "پادادشهر", "زرگان", "لشکرآباد", "امیرالمؤمنین"],
  qom: ["صفائیه", "قدس", "شهرک قدس", "پردیسان", "جمهوری"],
  rasht: ["گلسار", "میرزاکوچک", "پارک شهر", "کمیل", "مطهری"],
  kerman: ["شهرک بهشتی", "خواجو", "پارک", "مطهری", "صاحب‌الزمان"],
};

// ======================== به‌روزرسانی آمار یک استان ========================
export const updateProvinceStats = async (provinceId: string) => {
  try {
    const province = await Province.findOne({ slug: provinceId });
    if (!province) return null;

    const [properties, ads, soldAds, soldProperties] = await Promise.all([
      Property.find({
        city: { $regex: new RegExp(province.name, "i") },
        status: "active",
      }),
      Ad.find({
        city: { $regex: new RegExp(province.name, "i") },
        status: "active",
      }),
      Ad.countDocuments({
        city: { $regex: new RegExp(province.name, "i") },
        status: "sold",
      }),
      Property.countDocuments({
        city: { $regex: new RegExp(province.name, "i") },
        status: "sold",
      }),
    ]);

    const allProperties = [...properties, ...ads] as PropertyUnion[];
    const totalDeals = allProperties.length;
    const totalPrice = allProperties.reduce(
      (sum, item) => sum + (item.price || 0),
      0,
    );
    const avgPrice = totalDeals > 0 ? Math.round(totalPrice / totalDeals) : 0;

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthDeals = allProperties.filter(
      (p) => new Date(p.createdAt) >= lastMonth,
    ).length;
    const growth =
      totalDeals > 0
        ? parseFloat(((lastMonthDeals / totalDeals) * 100).toFixed(1))
        : 0;

    const apartments = allProperties.filter(
      (p) =>
        p.title?.includes("آپارتمان") ||
        p.title?.includes("ساختمان") ||
        p.propertyType === "apartment",
    ).length;
    const villas = allProperties.filter(
      (p) =>
        p.title?.includes("ویلا") ||
        p.title?.includes("باغ") ||
        p.propertyType === "villa",
    ).length;
    const commercials = allProperties.filter(
      (p) =>
        p.title?.includes("تجاری") ||
        p.title?.includes("مغازه") ||
        p.propertyType === "commercial",
    ).length;
    const offices = allProperties.filter(
      (p) =>
        p.title?.includes("دفتر") ||
        p.title?.includes("اداری") ||
        p.propertyType === "office",
    ).length;

    const total = allProperties.length || 1;
    const totalSoldDeals = soldAds + soldProperties;

    const statsData = {
      provinceId: province.slug,
      provinceName: province.name,
      provinceCode: province.code,
      totalDeals,
      avgPrice,
      growth,
      soldDeals: totalSoldDeals,
      hotZones: hotZonesMap[province.slug] || [
        "منطقه مرکزی",
        "منطقه شمال",
        "منطقه جنوب",
      ],
      propertyTypes: {
        apartment: Math.round((apartments / total) * 100),
        villa: Math.round((villas / total) * 100),
        commercial: Math.round((commercials / total) * 100),
        office: Math.round((offices / total) * 100),
      },
      lastUpdated: new Date(),
    };

    const updated = await MarketAnalysis.findOneAndUpdate(
      { provinceId: province.slug },
      statsData,
      { upsert: true, returnDocument: "after" },
    );
    return updated;
  } catch (error) {
    console.error(`Error updating stats for ${provinceId}:`, error);
    return null;
  }
};

// ======================== PROVINCES (قدیمی) ========================
export const getProvinces = async (_req: any, res: any) => {
  try {
    const Ad = getAd();
    const cities = await Ad.distinct("city", { status: "active" });
    const defaultCities = [
      { _id: "tehran", name: "تهران" },
      { _id: "mashhad", name: "مشهد" },
      { _id: "isfahan", name: "اصفهان" },
      { _id: "shiraz", name: "شیراز" },
      { _id: "tabriz", name: "تبریز" },
      { _id: "karaj", name: "کرج" },
    ];
    const result =
      cities && cities.length > 0
        ? cities
            .filter(Boolean)
            .slice(0, 10)
            .map((c: any, i: number) => ({
              _id: String(i),
              name: String(c).trim(),
            }))
        : defaultCities;
    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error("❌ [market/provinces]", err.message);
    return res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

export const getDistrictsByCity = async (req: any, res: any) => {
  try {
    const { city } = req.query;
    if (!city)
      return res
        .status(400)
        .json({ success: false, message: "نام شهر الزامی است" });

    for (const p of ALL_PROVINCES_DATA) {
      const found = p.cities.find((c) => c.name === city);
      if (found) {
        const districts = found.districts.map((d, idx) => ({
          _id: `dist-${idx}`,
          name: d,
        }));
        return res.json({ success: true, data: districts });
      }
    }

    const Ad = mongoose.model("Ad");
    const rawDistricts = await Ad.distinct("district", {
      city: String(city).trim(),
      status: "active",
    });
    const filtered = rawDistricts
      .filter(
        (d: any) =>
          d && String(d).trim() !== "" && String(d).trim() !== "نامشخص",
      )
      .map((d: any) => String(d).trim());
    const result = filtered.map((name: string, i: number) => ({
      _id: `dist-${i}`,
      name,
    }));
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMapAds = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();

    // ✅ تبدیل تمام پارامترهای query به string امن
    const city = getQueryStr(req.query.city);
    const district = getQueryStr(req.query.district);
    const province = getQueryStr(req.query.province);
    const region = getQueryStr(req.query.region);
    const tradeType = getQueryStr(req.query.tradeType);
    const propertyType = getQueryStr(req.query.propertyType);
    const priceRange = getQueryStr(req.query.priceRange);
    const sizeRange = getQueryStr(req.query.sizeRange);
    const buildingAge = getQueryStr(req.query.buildingAge);
    const roomsCount = getQueryStr(req.query.roomsCount);

    const query: any = { status: "active" };
    const andConditions: any[] = [];

    if (
      province &&
      province !== "همه" &&
      province !== "" &&
      province !== "undefined"
    ) {
      const cities = getCitiesForProvince(province);
      andConditions.push({ city: { $in: cities } });
    }

    if (
      city &&
      city !== "همه" &&
      city !== "همه شهرها" &&
      city !== "undefined"
    ) {
      const cityRegex = new RegExp(city, "i");
      andConditions.push({ city: { $regex: cityRegex } });
    }

    if (district && district !== "همه" && district !== "undefined") {
      const districtRegex = new RegExp(district, "i");
      andConditions.push({
        $or: [
          { district: { $regex: districtRegex } },
          { title: { $regex: districtRegex } },
        ],
      });
    }

    if (region && region !== "همه" && region !== "undefined") {
      andConditions.push({ region: region });
    }

    if (tradeType && tradeType !== "none") {
      const adTypeMap: Record<string, string> = { buy: "sale", rent: "rent" };
      andConditions.push({
        adType: adTypeMap[tradeType] || tradeType,
      });
    }

    if (propertyType && propertyType !== "none") {
      let keywordPattern = "";
      switch (propertyType) {
        case "apartment":
          keywordPattern = "(آپارتمان|ساختمان|مجتمع|برج|اپارتمان|اپارتمانی)";
          break;
        case "villa":
          keywordPattern = "(ویلا|خانه|باغ|کلنگی|خونه|باغ ویلا)";
          break;
        case "land":
          keywordPattern = "(زمین|اراضی|قطعه|زمین کلنگی)";
          break;
        case "commercial":
          keywordPattern = "(تجاری|اداری|مغازه|دفتر|مدرن|تجاری-اداری|پاساژ)";
          break;
      }
      if (keywordPattern) {
        const regex = new RegExp(keywordPattern, "i");
        andConditions.push({
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
          ],
        });
      }
    }

    if (priceRange && priceRange !== "none") {
      const parts = priceRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]) * 1_000_000_000;
        if (parts[1] === "+") {
          andConditions.push({ price: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]) * 1_000_000_000;
          andConditions.push({ price: { $gte: min, $lte: max } });
        }
      }
    }

    if (sizeRange && sizeRange !== "none") {
      const parts = sizeRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") {
          andConditions.push({ area: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]);
          andConditions.push({ area: { $gte: min, $lte: max } });
        }
      }
    }

    if (buildingAge && buildingAge !== "none") {
      const parts = buildingAge.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") {
          andConditions.push({ buildingAge: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]);
          andConditions.push({ buildingAge: { $gte: min, $lte: max } });
        }
      }
    }

    if (roomsCount && roomsCount !== "none") {
      if (roomsCount === "3") {
        andConditions.push({ roomsCount: { $gte: 3 } });
      } else {
        andConditions.push({ roomsCount: parseInt(roomsCount) });
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const ads = await Ad.find(query)
      .select(
        "title description price area latitude longitude city district images views adType buildingAge roomsCount region regionName",
      )
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    // محاسبه مرکز پویا و مارکرها (بدون تغییر)
    let sumLat = 0,
      sumLng = 0,
      validCoordsCount = 0;
    ads.forEach((ad: any) => {
      const lat = Number(ad.latitude);
      const lng = Number(ad.longitude);
      if (lat && lng && !isNaN(lat) && lat !== 0 && !isNaN(lng) && lng !== 0) {
        sumLat += lat;
        sumLng += lng;
        validCoordsCount++;
      }
    });
    const dynamicCenter =
      validCoordsCount > 0
        ? { lat: sumLat / validCoordsCount, lng: sumLng / validCoordsCount }
        : { lat: 35.6892, lng: 51.389 };

    const markers = ads.map((ad: any, index: number) => {
      const hasValidCoords =
        ad.latitude &&
        ad.longitude &&
        !isNaN(Number(ad.latitude)) &&
        Number(ad.latitude) !== 0 &&
        !isNaN(Number(ad.longitude)) &&
        Number(ad.longitude) !== 0;

      let finalLat = hasValidCoords ? Number(ad.latitude) : dynamicCenter.lat;
      let finalLng = hasValidCoords ? Number(ad.longitude) : dynamicCenter.lng;

      if (!hasValidCoords) {
        const angle =
          index * (360 / Math.min(ads.length, 50)) * (Math.PI / 180);
        const radius = 0.002 + Math.floor(index / 12) * 0.0015;
        finalLat += Math.sin(angle) * radius;
        finalLng += Math.cos(angle) * radius;
      }

      let detectedDistrict = ad.district?.trim() || "";
      if (!detectedDistrict && ad.title) {
        if (ad.title.includes("سعادت آباد")) detectedDistrict = "سعادت آباد";
        else if (ad.title.includes("نیاوران")) detectedDistrict = "نیاوران";
        else if (ad.title.includes("تهرانپارس")) detectedDistrict = "تهرانپارس";
        else detectedDistrict = ad.city || "نامشخص";
      }

      return {
        id: ad._id.toString(),
        title: ad.title,
        price: ad.price || 0,
        area: ad.area || 0,
        adType: ad.adType || "sale",
        buildingAge: ad.buildingAge || 0,
        roomsCount: ad.roomsCount || 1,
        pricePerMeter:
          ad.area > 0 && ad.price > 0 ? Math.round(ad.price / ad.area) : 0,
        city: ad.city === "سعادت" ? "تهران" : ad.city || city,
        district: detectedDistrict,
        region: ad.region || "سایر",
        regionName: ad.regionName || "",
        lat: finalLat,
        lng: finalLng,
        image: ad.images?.[0] || null,
        views: ad.views || 0,
      };
    });

    return res.json({
      success: true,
      data: { markers, total: markers.length, center: dynamicCenter },
    });
  } catch (error: any) {
    console.error("❌ [market/map-ads]", error.message);
    return res.status(500).json({
      success: false,
      message: "خطا در پردازش نقشه",
      error: error.message,
    });
  }
};
// ======================== NESHAN / DIVISIONS APIs ========================
export const getNeshanGeo = async (req: any, res: any) => {
  try {
    const { term, city } = req.query;
    const searchTerm = city || term || "تهران";
    const NESHAN_API_KEY =
      process.env.NESHAN_API_KEY || "service.f3da8afc6b384ab5bda01e3375e1f3f5";

    const response = await axios.get(`https://api.neshan.org/v1/search`, {
      headers: { "Api-Key": NESHAN_API_KEY },
      params: { term: searchTerm, lat: 35.6892, lng: 51.389 },
      timeout: 5000,
    });

    if (response.data && response.data.items) {
      return res.json({ success: true, items: response.data.items });
    } else {
      return res.json({ success: true, items: [] });
    }
  } catch (error: any) {
    console.error("❌ Neshan Geo Error:", error.message);
    return res.json({ success: true, items: [], fallback: true });
  }
};

export const getNeshanProvinces = async (_req: any, res: any) => {
  try {
    const formatted = ALL_PROVINCES_DATA.map((p, idx) => ({
      id: String(idx + 1),
      name: p.name,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      data: [
        { id: "1", name: "تهران" },
        { id: "2", name: "مازندران" },
        { id: "3", name: "اصفهان" },
      ],
    });
  }
};

export const getNeshanCitiesList = async (req: any, res: any) => {
  try {
    const { province } = req.query;
    if (!province) return res.json({ success: true, data: [] });

    const provinceData = ALL_PROVINCES_DATA.find((p) => p.name === province);
    if (!provinceData) return res.json({ success: true, data: [] });

    const formatted = provinceData.cities.map((c, idx) => ({
      id: `${province}-${idx}`,
      name: c.name,
      province,
    }));
    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: "خطا در دریافت شهرها" });
  }
};

export const getNeshanCities = getNeshanCitiesList;

export const getNeshanDistrictsList = async (req: any, res: any) => {
  try {
    const { city } = req.query;
    if (!city) return res.json({ success: true, data: [] });

    for (const p of ALL_PROVINCES_DATA) {
      const found = p.cities.find((c) => c.name === city);
      if (found) {
        const districts = found.districts.map((d, idx) => ({
          _id: `dist-${idx}`,
          name: d,
        }));
        return res.json({
          success: true,
          data: [{ _id: "all", name: "همه محله‌ها" }, ...districts],
        });
      }
    }
    return res.json({
      success: true,
      data: [{ _id: "all", name: "همه محله‌ها" }],
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: "خطا در دریافت محله‌ها" });
  }
};

export const getNeshanDistricts = getNeshanDistrictsList;

export const getNeshanLocations = async (req: any, res: any) => {
  try {
    const { term, city } = req.query;
    let searchTerm = city || term || "تهران";
    const NESHAN_API_KEY =
      process.env.NESHAN_API_KEY || "service.f3da8afc6b384ab5bda01e3375e1f3f5";
    const response = await axios.get(`https://api.neshan.org/v1/search`, {
      headers: {
        "Api-Key": NESHAN_API_KEY,
        "Content-Type": "application/json",
      },
      params: { term: searchTerm, lat: 35.6892, lng: 51.389 },
      timeout: 10000,
    });
    if (response.data) {
      return res.status(200).json({
        success: true,
        items: response.data.items || [],
        total: response.data.items?.length || 0,
      });
    } else {
      return res.status(200).json({ success: true, items: [], total: 0 });
    }
  } catch (error: any) {
    console.error("❌ Neshan API Error:", error.message);
    return res
      .status(200)
      .json({ success: true, items: [], total: 0, error: error.message });
  }
};

export const getNominatimSearch = async (req: any, res: any) => {
  try {
    const { q } = req.query;
    if (!q)
      return res
        .status(400)
        .json({ success: false, message: "پارامتر q الزامی است" });
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: q,
          format: "json",
          limit: 1,
          addressdetails: 0,
          "accept-language": "fa",
        },
        headers: { "User-Agent": "DivarCloneApp/1.0" },
        timeout: 8000,
      },
    );
    return res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("❌ Nominatim API Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "خطا در دریافت اطلاعات" });
  }
};

// ======================== MARKET ANALYSIS ========================
export const getMarketAnalysis = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const city = getQueryStr(req.query.city);
    const district = getQueryStr(req.query.district);
    const region = getQueryStr(req.query.region);
    const province = getQueryStr(req.query.province);
    const tradeType = getQueryStr(req.query.tradeType);
    const propertyType = getQueryStr(req.query.propertyType);
    const priceRange = getQueryStr(req.query.priceRange);
    const sizeRange = getQueryStr(req.query.sizeRange);
    const buildingAge = getQueryStr(req.query.buildingAge);
    const roomsCount = getQueryStr(req.query.roomsCount);

    const matchConditions: any = { status: "active" };
    const andConditions: any[] = [];

    if (
      province &&
      province !== "همه" &&
      province !== "" &&
      province !== "undefined"
    ) {
      const cities = getCitiesForProvince(province as string);
      andConditions.push({ city: { $in: cities } });
    }

    if (city && city !== "همه" && city !== "undefined") {
      const cityRegex = new RegExp(city, "i");
      andConditions.push({ city: { $regex: cityRegex } });
    }

    if (district && district !== "همه" && district !== "undefined") {
      const districtRegex = new RegExp(district, "i");
      andConditions.push({
        $or: [
          { district: { $regex: districtRegex } },
          { title: { $regex: districtRegex } },
        ],
      });
    }

    if (tradeType && tradeType !== "none") {
      const adTypeMap: Record<string, string> = { buy: "sale", rent: "rent" };
      andConditions.push({
        adType: adTypeMap[tradeType as string] || tradeType,
      });
    }

    if (propertyType && propertyType !== "none") {
      let keywordPattern = "";
      switch (propertyType) {
        case "apartment":
          keywordPattern = "(آپارتمان|ساختمان|مجتمع|برج|اپارتمان|اپارتمانی)";
          break;
        case "villa":
          keywordPattern = "(ویلا|خانه|باغ|کلنگی|خونه|باغ ویلا)";
          break;
        case "land":
          keywordPattern = "(زمین|اراضی|قطعه|زمین کلنگی)";
          break;
        case "commercial":
          keywordPattern = "(تجاری|اداری|مغازه|دفتر|مدرن|تجاری-اداری|پاساژ)";
          break;
      }
      if (keywordPattern) {
        const regex = new RegExp(keywordPattern, "i");
        andConditions.push({
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
          ],
        });
      }
    }

    if (priceRange && priceRange !== "none") {
      const parts = (priceRange as string).split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]) * 1_000_000_000;
        if (parts[1] === "+") {
          andConditions.push({ price: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]) * 1_000_000_000;
          andConditions.push({ price: { $gte: min, $lte: max } });
        }
      }
    }

    if (sizeRange && sizeRange !== "none") {
      const parts = (sizeRange as string).split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") {
          andConditions.push({ area: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]);
          andConditions.push({ area: { $gte: min, $lte: max } });
        }
      }
    }

    if (buildingAge && buildingAge !== "none") {
      const parts = (buildingAge as string).split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") {
          andConditions.push({ buildingAge: { $gte: min } });
        } else {
          const max = parseFloat(parts[1]);
          andConditions.push({ buildingAge: { $gte: min, $lte: max } });
        }
      }
    }

    if (roomsCount && roomsCount !== "none") {
      if (roomsCount === "3") {
        andConditions.push({ roomsCount: { $gte: 3 } });
      } else {
        andConditions.push({ roomsCount: parseInt(roomsCount as string) });
      }
    }

    if (andConditions.length > 0) {
      matchConditions.$and = andConditions;
    }

    // ----- AGGREGATIONS -----
    const priceAnalysis = await Ad.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: { $ifNull: ["$district", "سایر مناطق"] },
          totalAds: { $sum: 1 },
          totalPrice: { $sum: { $ifNull: ["$price", 0] } },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          priceSumPerMeter: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] },
                { $divide: ["$price", "$area"] },
                0,
              ],
            },
          },
          areaCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          district: "$_id",
          totalAds: 1,
          avgPricePerMeter: {
            $cond: [
              { $gt: ["$areaCount", 0] },
              { $round: { $divide: ["$priceSumPerMeter", "$areaCount"] } },
              0,
            ],
          },
          avgTotalPrice: {
            $cond: [
              { $gt: ["$totalAds", 0] },
              { $round: { $divide: ["$totalPrice", "$totalAds"] } },
              0,
            ],
          },
          marketLiquidityScore: {
            $cond: [
              { $gt: ["$totalAds", 0] },
              { $round: [{ $divide: ["$totalViews", "$totalAds"] }, 1] },
              0,
            ],
          },
        },
      },
      { $sort: { totalAds: -1 } },
    ]);

    const topDistricts = priceAnalysis
      .filter((d) => d.district !== "سایر مناطق")
      .slice(0, 30);
    const totalAds = priceAnalysis.reduce(
      (sum, item) => sum + item.totalAds,
      0,
    );

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await Ad.aggregate([
      {
        $match: {
          ...matchConditions,
          price: { $gt: 0 },
          area: { $gt: 0 },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          avgPricePerMeter: { $avg: { $divide: ["$price", "$area"] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const MONTHS_PERSIAN: Record<number, string> = {
      1: "دی/بهمن",
      2: "بهمن/اسفند",
      3: "اسفند/فروردین",
      4: "فروردین/اردیبهشت",
      5: "اردیبهشت/خرداد",
      6: "خرداد/تیر",
      7: "تیر/مرداد",
      8: "مرداد/شهریور",
      9: "شهریور/مهر",
      10: "مهر/آبان",
      11: "آبان/آذر",
      12: "آذر/دی",
    };
    const marketTrends = monthly.map((r: any) => ({
      month: MONTHS_PERSIAN[r._id.month] || `ماه ${r._id.month}`,
      avgPricePerMeter: Math.round(r.avgPricePerMeter || 0),
    }));

    const totalStats = await Ad.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalPrice: { $sum: { $ifNull: ["$price", 0] } },
          totalArea: { $sum: { $ifNull: ["$area", 0] } },
        },
      },
    ]);
    let overallAvgPrice = 0;
    if (totalStats.length > 0 && totalStats[0].totalArea > 0) {
      overallAvgPrice = Math.round(
        totalStats[0].totalPrice / totalStats[0].totalArea,
      );
    }

    const statsAgg = await Ad.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          avgArea: { $avg: "$area" },
          maxPrice: { $max: "$price" },
          minPrice: { $min: "$price" },
          avgTotalPrice: { $avg: "$price" },
        },
      },
    ]);
    const avgArea =
      statsAgg.length > 0 ? Math.round(statsAgg[0].avgArea || 0) : 0;
    const maxPrice = statsAgg.length > 0 ? statsAgg[0].maxPrice || 0 : 0;
    const minPrice = statsAgg.length > 0 ? statsAgg[0].minPrice || 0 : 0;
    const avgTotalPrice =
      statsAgg.length > 0 ? Math.round(statsAgg[0].avgTotalPrice || 0) : 0;

    let growthRate = 0;
    if (marketTrends.length >= 2) {
      const latest =
        marketTrends[marketTrends.length - 1]?.avgPricePerMeter || 0;
      const previous =
        marketTrends[marketTrends.length - 2]?.avgPricePerMeter || 0;
      if (previous > 0)
        growthRate = parseFloat(
          (((latest - previous) / previous) * 100).toFixed(1),
        );
    }

    return res.json({
      success: true,
      data: {
        totalAds,
        priceAnalysis: topDistricts,
        marketTrends,
        city,
        overallAvgPrice,
        growthRate,
        avgArea,
        maxPrice,
        minPrice,
        avgTotalPrice,
      },
    });
  } catch (err: any) {
    console.error("❌ [market/analysis]", err.message);
    return res.status(500).json({
      success: false,
      message: "خطا در تحلیل بازار",
      error: err.message,
    });
  }
};

// ======================== REGIONS ========================
export const getRegions = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const regions = await Ad.distinct("region", {
      status: "active",
      region: { $exists: true, $nin: [null, "سایر"] },
    });
    const result = ["همه", ...regions.filter(Boolean)];
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ [getRegions]", error.message);
    return res
      .status(500)
      .json({ success: false, message: "خطا در دریافت مناطق" });
  }
};

// ======================== REFRESH MARKET STATS (با لاگ) ========================
export const refreshMarketStats = async (req: AuthRequest, res: Response) => {
  try {
    const provinces = await Province.find({ isActive: true });
    for (const province of provinces) {
      await updateProvinceStats(province.slug);
    }

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "MarketAnalysis",
      description: `ادمین ${req.user?.firstName || req.user?.phone || "ناشناس"} آمار بازار را به‌روزرسانی دستی کرد.`,
      req,
    });

    res.json({ success: true, message: "آمار بازار با موفقیت به‌روزرسانی شد" });
  } catch (error) {
    console.error("Refresh market stats error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در به‌روزرسانی آمار" });
  }
};
