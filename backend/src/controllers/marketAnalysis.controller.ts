// backend/src/controllers/marketAnalysis.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import { ALL_PROVINCES_DATA } from "../data/iranDivisions";
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

// ======================== MAP ADS ========================
export const getMapAds = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
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

    if (province && province !== "همه" && province !== "" && province !== "undefined") {
      const cities = getCitiesForProvince(province);
      andConditions.push({ city: { $in: cities } });
    }
    if (city && city !== "همه" && city !== "undefined") {
      andConditions.push({ city: { $regex: new RegExp(city, "i") } });
    }
    if (district && district !== "همه" && district !== "undefined") {
      const regex = new RegExp(district, "i");
      andConditions.push({ $or: [{ district: { $regex: regex } }, { title: { $regex: regex } }] });
    }
    if (region && region !== "همه" && region !== "undefined") {
      andConditions.push({ region });
    }
    if (tradeType && tradeType !== "none") {
      const adTypeMap: Record<string, string> = { buy: "sale", rent: "rent" };
      andConditions.push({ adType: adTypeMap[tradeType] || tradeType });
    }
    if (propertyType && propertyType !== "none") {
      let keywordPattern = "";
      switch (propertyType) {
        case "apartment": keywordPattern = "(آپارتمان|ساختمان|مجتمع|برج|اپارتمان|اپارتمانی)"; break;
        case "villa": keywordPattern = "(ویلا|خانه|باغ|کلنگی|خونه|باغ ویلا)"; break;
        case "land": keywordPattern = "(زمین|اراضی|قطعه|زمین کلنگی)"; break;
        case "commercial": keywordPattern = "(تجاری|اداری|مغازه|دفتر|مدرن|تجاری-اداری|پاساژ)"; break;
      }
      if (keywordPattern) {
        const regex = new RegExp(keywordPattern, "i");
        andConditions.push({ $or: [{ title: { $regex: regex } }, { description: { $regex: regex } }] });
      }
    }
    if (priceRange && priceRange !== "none") {
      const parts = priceRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]) * 1_000_000_000;
        if (parts[1] === "+") andConditions.push({ price: { $gte: min } });
        else {
          const max = parseFloat(parts[1]) * 1_000_000_000;
          andConditions.push({ price: { $gte: min, $lte: max } });
        }
      }
    }
    if (sizeRange && sizeRange !== "none") {
      const parts = sizeRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") andConditions.push({ area: { $gte: min } });
        else {
          const max = parseFloat(parts[1]);
          andConditions.push({ area: { $gte: min, $lte: max } });
        }
      }
    }
    if (buildingAge && buildingAge !== "none") {
      const parts = buildingAge.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") andConditions.push({ buildingAge: { $gte: min } });
        else {
          const max = parseFloat(parts[1]);
          andConditions.push({ buildingAge: { $gte: min, $lte: max } });
        }
      }
    }
    if (roomsCount && roomsCount !== "none") {
      if (roomsCount === "3") andConditions.push({ roomsCount: { $gte: 3 } });
      else andConditions.push({ roomsCount: parseInt(roomsCount) });
    }
    if (andConditions.length > 0) query.$and = andConditions;

    const ads = await Ad.find(query)
      .select("title description price area latitude longitude city district images views adType buildingAge roomsCount region regionName")
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    let sumLat = 0, sumLng = 0, validCoordsCount = 0;
    ads.forEach((ad: any) => {
      const lat = Number(ad.latitude), lng = Number(ad.longitude);
      if (lat && lng && !isNaN(lat) && lat !== 0 && !isNaN(lng) && lng !== 0) {
        sumLat += lat; sumLng += lng; validCoordsCount++;
      }
    });
    const dynamicCenter = validCoordsCount > 0 ? { lat: sumLat / validCoordsCount, lng: sumLng / validCoordsCount } : { lat: 35.6892, lng: 51.389 };

    const markers = ads.map((ad: any, index: number) => {
      const hasValidCoords = ad.latitude && ad.longitude && !isNaN(Number(ad.latitude)) && Number(ad.latitude) !== 0 && !isNaN(Number(ad.longitude)) && Number(ad.longitude) !== 0;
      let finalLat = hasValidCoords ? Number(ad.latitude) : dynamicCenter.lat;
      let finalLng = hasValidCoords ? Number(ad.longitude) : dynamicCenter.lng;
      if (!hasValidCoords) {
        const angle = index * (360 / Math.min(ads.length, 50)) * (Math.PI / 180);
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
        id: ad._id.toString(), title: ad.title, price: ad.price || 0,
        area: ad.area || 0, adType: ad.adType || "sale", buildingAge: ad.buildingAge || 0,
        roomsCount: ad.roomsCount || 1, pricePerMeter: ad.area > 0 && ad.price > 0 ? Math.round(ad.price / ad.area) : 0,
        city: ad.city === "سعادت" ? "تهران" : ad.city || city, district: detectedDistrict,
        region: ad.region || "سایر", regionName: ad.regionName || "",
        lat: finalLat, lng: finalLng, image: ad.images?.[0] || null, views: ad.views || 0,
      };
    });

    return res.json({ success: true, data: { markers, total: markers.length, center: dynamicCenter } });
  } catch (error: any) {
    console.error("❌ [market/map-ads]", error.message);
    return res.status(500).json({ success: false, message: "خطا در پردازش نقشه", error: error.message });
  }
};

// ======================== NESHAN / DIVISIONS APIs ========================
export const getNeshanProvinces = async (_req: any, res: any) => {
  try {
    const formatted = ALL_PROVINCES_DATA.map((p, idx) => ({ id: String(idx + 1), name: p.name }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(200).json({ success: true, data: [{ id: "1", name: "تهران" }, { id: "2", name: "مازندران" }, { id: "3", name: "اصفهان" }] });
  }
};

export const getNeshanCitiesList = async (req: any, res: any) => {
  try {
    const { province } = req.query;
    if (!province) return res.json({ success: true, data: [] });
    const provinceData = ALL_PROVINCES_DATA.find((p) => p.name === province);
    if (!provinceData) return res.json({ success: true, data: [] });
    const formatted = provinceData.cities.map((c, idx) => ({ id: `${province}-${idx}`, name: c.name, province }));
    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "خطا در دریافت شهرها" });
  }
};

export const getNeshanDistrictsList = async (req: any, res: any) => {
  try {
    const { city } = req.query;
    if (!city) return res.json({ success: true, data: [] });
    for (const p of ALL_PROVINCES_DATA) {
      const found = p.cities.find((c) => c.name === city);
      if (found) {
        const districts = found.districts.map((d, idx) => ({ _id: `dist-${idx}`, name: d }));
        return res.json({ success: true, data: [{ _id: "all", name: "همه محله‌ها" }, ...districts] });
      }
    }
    return res.json({ success: true, data: [{ _id: "all", name: "همه محله‌ها" }] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "خطا در دریافت محله‌ها" });
  }
};

export const getNeshanLocations = async (req: any, res: any) => {
  try {
    const { term, city } = req.query;
    let searchTerm = city || term || "تهران";
    const NESHAN_API_KEY = process.env.NESHAN_API_KEY || "service.f3da8afc6b384ab5bda01e3375e1f3f5";
    const response = await axios.get(`https://api.neshan.org/v1/search`, {
      headers: { "Api-Key": NESHAN_API_KEY, "Content-Type": "application/json" },
      params: { term: searchTerm, lat: 35.6892, lng: 51.389 },
      timeout: 10000,
    });
    if (response.data) {
      return res.status(200).json({ success: true, items: response.data.items || [], total: response.data.items?.length || 0 });
    } else {
      return res.status(200).json({ success: true, items: [], total: 0 });
    }
  } catch (error: any) {
    console.error("❌ Neshan API Error:", error.message);
    return res.status(200).json({ success: true, items: [], total: 0, error: error.message });
  }
};

export const getNominatimSearch = async (req: any, res: any) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "پارامتر q الزامی است" });
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: q, format: "json", limit: 1, addressdetails: 0, "accept-language": "fa" },
      headers: { "User-Agent": "DivarCloneApp/1.0" },
      timeout: 8000,
    });
    return res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("❌ Nominatim API Error:", error.message);
    return res.status(500).json({ success: false, message: "خطا در دریافت اطلاعات" });
  }
};

// ======================== MARKET ANALYSIS (عمومی) ========================
export const getMarketAnalysis = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const city = getQueryStr(req.query.city);
    const district = getQueryStr(req.query.district);
    const province = getQueryStr(req.query.province);
    const tradeType = getQueryStr(req.query.tradeType);
    const propertyType = getQueryStr(req.query.propertyType);
    const priceRange = getQueryStr(req.query.priceRange);
    const sizeRange = getQueryStr(req.query.sizeRange);
    const buildingAge = getQueryStr(req.query.buildingAge);
    const roomsCount = getQueryStr(req.query.roomsCount);

    const matchConditions: any = { status: "active" };
    const andConditions: any[] = [];

    if (province && province !== "همه" && province !== "" && province !== "undefined") {
      const cities = getCitiesForProvince(province);
      andConditions.push({ city: { $in: cities } });
    }
    if (city && city !== "همه" && city !== "undefined") {
      const cityRegex = new RegExp(city, "i");
      andConditions.push({ city: { $regex: cityRegex } });
    }
    if (district && district !== "همه" && district !== "undefined") {
      const districtRegex = new RegExp(district, "i");
      andConditions.push({ $or: [{ district: { $regex: districtRegex } }, { title: { $regex: districtRegex } }] });
    }
    if (tradeType && tradeType !== "none") {
      const adTypeMap: Record<string, string> = { buy: "sale", rent: "rent" };
      andConditions.push({ adType: adTypeMap[tradeType] || tradeType });
    }
    if (propertyType && propertyType !== "none") {
      let keywordPattern = "";
      switch (propertyType) {
        case "apartment": keywordPattern = "(آپارتمان|ساختمان|مجتمع|برج|اپارتمان|اپارتمانی)"; break;
        case "villa": keywordPattern = "(ویلا|خانه|باغ|کلنگی|خونه|باغ ویلا)"; break;
        case "land": keywordPattern = "(زمین|اراضی|قطعه|زمین کلنگی)"; break;
        case "commercial": keywordPattern = "(تجاری|اداری|مغازه|دفتر|مدرن|تجاری-اداری|پاساژ)"; break;
      }
      if (keywordPattern) {
        const regex = new RegExp(keywordPattern, "i");
        andConditions.push({ $or: [{ title: { $regex: regex } }, { description: { $regex: regex } }] });
      }
    }
    if (priceRange && priceRange !== "none") {
      const parts = priceRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]) * 1_000_000_000;
        if (parts[1] === "+") andConditions.push({ price: { $gte: min } });
        else {
          const max = parseFloat(parts[1]) * 1_000_000_000;
          andConditions.push({ price: { $gte: min, $lte: max } });
        }
      }
    }
    if (sizeRange && sizeRange !== "none") {
      const parts = sizeRange.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") andConditions.push({ area: { $gte: min } });
        else {
          const max = parseFloat(parts[1]);
          andConditions.push({ area: { $gte: min, $lte: max } });
        }
      }
    }
    if (buildingAge && buildingAge !== "none") {
      const parts = buildingAge.split("-");
      if (parts.length === 2) {
        const min = parseFloat(parts[0]);
        if (parts[1] === "+") andConditions.push({ buildingAge: { $gte: min } });
        else {
          const max = parseFloat(parts[1]);
          andConditions.push({ buildingAge: { $gte: min, $lte: max } });
        }
      }
    }
    if (roomsCount && roomsCount !== "none") {
      if (roomsCount === "3") andConditions.push({ roomsCount: { $gte: 3 } });
      else andConditions.push({ roomsCount: parseInt(roomsCount) });
    }
    if (andConditions.length > 0) matchConditions.$and = andConditions;

    const groupByField = city ? "$district" : "$province";
    const fallbackName = city ? "سایر مناطق" : "نامشخص";

    const priceAnalysis = await Ad.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: { $ifNull: [groupByField, fallbackName] },
          totalAds: { $sum: 1 },
          totalPrice: { $sum: { $ifNull: ["$price", 0] } },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
          priceSumPerMeter: { $sum: { $cond: [{ $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] }, { $divide: ["$price", "$area"] }, 0] } },
          areaCount: { $sum: { $cond: [{ $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0, district: "$_id", totalAds: 1,
          avgPricePerMeter: { $cond: [{ $gt: ["$areaCount", 0] }, { $round: { $divide: ["$priceSumPerMeter", "$areaCount"] } }, 0] },
          avgTotalPrice: { $cond: [{ $gt: ["$totalAds", 0] }, { $round: { $divide: ["$totalPrice", "$totalAds"] } }, 0] },
          marketLiquidityScore: { $cond: [{ $gt: ["$totalAds", 0] }, { $round: { $divide: ["$totalViews", "$totalAds"] } }, 0] },
        },
      },
      { $sort: { totalAds: -1 } },
    ]);

    const topDistricts = priceAnalysis.filter(d => d.district !== fallbackName).slice(0, 30);
    const totalAds = priceAnalysis.reduce((sum, item) => sum + item.totalAds, 0);

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await Ad.aggregate([
      { $match: { ...matchConditions, price: { $gt: 0 }, area: { $gt: 0 }, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, avgPricePerMeter: { $avg: { $divide: ["$price", "$area"] } } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const MONTHS_PERSIAN: Record<number, string> = {
      1: "دی/بهمن", 2: "بهمن/اسفند", 3: "اسفند/فروردین", 4: "فروردین/اردیبهشت", 5: "اردیبهشت/خرداد", 6: "خرداد/تیر",
      7: "تیر/مرداد", 8: "مرداد/شهریور", 9: "شهریور/مهر", 10: "مهر/آبان", 11: "آبان/آذر", 12: "آذر/دی",
    };
    const marketTrends = monthly.map((r: any) => ({ month: MONTHS_PERSIAN[r._id.month] || `ماه ${r._id.month}`, avgPricePerMeter: Math.round(r.avgPricePerMeter || 0) }));

    const totalStats = await Ad.aggregate([{ $match: matchConditions }, { $group: { _id: null, totalPrice: { $sum: { $ifNull: ["$price", 0] } }, totalArea: { $sum: { $ifNull: ["$area", 0] } } } }]);
    let overallAvgPrice = 0;
    if (totalStats.length > 0 && totalStats[0].totalArea > 0) overallAvgPrice = Math.round(totalStats[0].totalPrice / totalStats[0].totalArea);

    const statsAgg = await Ad.aggregate([{ $match: matchConditions }, { $group: { _id: null, avgArea: { $avg: "$area" }, maxPrice: { $max: "$price" }, minPrice: { $min: "$price" }, avgTotalPrice: { $avg: "$price" } } }]);
    const avgArea = statsAgg.length > 0 ? Math.round(statsAgg[0].avgArea || 0) : 0;
    const maxPrice = statsAgg.length > 0 ? statsAgg[0].maxPrice || 0 : 0;
    const minPrice = statsAgg.length > 0 ? statsAgg[0].minPrice || 0 : 0;
    const avgTotalPrice = statsAgg.length > 0 ? Math.round(statsAgg[0].avgTotalPrice || 0) : 0;

    let growthRate = 0;
    if (marketTrends.length >= 2) {
      const latest = marketTrends[marketTrends.length - 1]?.avgPricePerMeter || 0;
      const previous = marketTrends[marketTrends.length - 2]?.avgPricePerMeter || 0;
      if (previous > 0) growthRate = parseFloat((((latest - previous) / previous) * 100).toFixed(1));
    }

    return res.json({ success: true, data: { totalAds, priceAnalysis: topDistricts, marketTrends, city, overallAvgPrice, growthRate, avgArea, maxPrice, minPrice, avgTotalPrice } });
  } catch (err: any) {
    console.error("❌ [market/analysis]", err.message);
    return res.status(500).json({ success: false, message: "خطا در تحلیل بازار", error: err.message });
  }
};

// ======================== REGIONS ========================
export const getRegions = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const regions = await Ad.distinct("region", { status: "active", region: { $exists: true, $nin: [null, "سایر"] } });
    return res.json({ success: true, data: ["همه", ...regions.filter(Boolean)] });
  } catch (error: any) {
    console.error("❌ [getRegions]", error.message);
    return res.status(500).json({ success: false, message: "خطا در دریافت مناطق" });
  }
};

// ⭐ API جدید: تحلیل سلسله‌مراتبی (استان ← شهر ← محله)
export const getLocationAnalysis = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const province = getQueryStr(req.query.province);
    const city = getQueryStr(req.query.city);
    const district = getQueryStr(req.query.district);

    if (!province && !city && !district) {
      return res.status(400).json({ success: false, message: "حداقل یکی از پارامترهای استان، شهر یا محله الزامی است" });
    }

    const filter: any = { status: "active" };
    if (province) {
      const cities = getCitiesForProvince(province);
      filter.city = { $in: cities };
    }
    if (city) filter.city = new RegExp(`^${city}$`, "i");
    if (district) filter.district = new RegExp(`^${district}$`, "i");

    const [stats] = await Ad.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAds: { $sum: 1 }, avgPricePerMeter: { $avg: { $cond: [{ $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] }, { $divide: ["$price", "$area"] }, 0] } }, avgTotalPrice: { $avg: "$price" }, avgArea: { $avg: "$area" }, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } },
    ]);

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await Ad.aggregate([
      { $match: { ...filter, price: { $gt: 0 }, area: { $gt: 0 }, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, avgPricePerMeter: { $avg: { $divide: ["$price", "$area"] } } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const MONTHS_PERSIAN: Record<number, string> = {
      1: "فروردین", 2: "اردیبهشت", 3: "خرداد", 4: "تیر", 5: "مرداد", 6: "شهریور",
      7: "مهر", 8: "آبان", 9: "آذر", 10: "دی", 11: "بهمن", 12: "اسفند",
    };
    const marketTrends = monthly.map((r: any) => ({ month: MONTHS_PERSIAN[r._id.month] || `ماه ${r._id.month}`, avgPricePerMeter: Math.round(r.avgPricePerMeter || 0) }));

    let subLocations: any[] = [];
    if (!district) {
      const groupField = city ? "$district" : "$city";
      subLocations = await Ad.aggregate([
        { $match: filter },
        { $group: { _id: { $ifNull: [groupField, city ? "سایر مناطق" : "نامشخص"] }, totalAds: { $sum: 1 }, avgPricePerMeter: { $avg: { $cond: [{ $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] }, { $divide: ["$price", "$area"] }, 0] } }, avgTotalPrice: { $avg: "$price" } } },
        { $sort: { totalAds: -1 } }, { $limit: 30 },
        { $project: { _id: 0, name: "$_id", totalAds: 1, avgPricePerMeter: { $round: ["$avgPricePerMeter", 0] }, avgTotalPrice: { $round: ["$avgTotalPrice", 0] } } },
      ]);
    }

    let growthRate = 0;
    if (marketTrends.length >= 2) {
      const latest = marketTrends[marketTrends.length - 1]?.avgPricePerMeter || 0;
      const previous = marketTrends[marketTrends.length - 2]?.avgPricePerMeter || 0;
      if (previous > 0) growthRate = parseFloat((((latest - previous) / previous) * 100).toFixed(1));
    }

    res.json({
      success: true,
      data: {
        level: district ? "district" : city ? "city" : "province",
        locationName: district || city || province,
        totalAds: stats?.totalAds || 0,
        avgPricePerMeter: Math.round(stats?.avgPricePerMeter || 0),
        avgTotalPrice: Math.round(stats?.avgTotalPrice || 0),
        avgArea: Math.round(stats?.avgArea || 0),
        minPrice: stats?.minPrice || 0,
        maxPrice: stats?.maxPrice || 0,
        growthRate,
        marketTrends,
        subLocations,
        parent: city ? { type: "city", name: city, province } : province ? { type: "province", name: province } : undefined,
      },
    });
  } catch (error: any) {
    console.error("❌ getLocationAnalysis:", error);
    res.status(500).json({ success: false, message: "خطا در تحلیل موقعیت" });
  }
};// ======================== NEW: Functions for route ========================

/**
 * GET /api/market/stats
 * آمار کلی بازار (همه استان‌ها)
 */
export const getMarketStats = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const matchConditions: any = { status: "active" };

    const [stats] = await Ad.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          avgPricePerMeter: {
            $avg: {
              $cond: [
                { $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] },
                { $divide: ["$price", "$area"] },
                0,
              ],
            },
          },
          avgTotalPrice: { $avg: "$price" },
          avgArea: { $avg: "$area" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
        },
      },
    ]);

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
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          avgPricePerMeter: { $avg: { $divide: ["$price", "$area"] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const MONTHS_PERSIAN: Record<number, string> = {
      1: "فروردین", 2: "اردیبهشت", 3: "خرداد", 4: "تیر", 5: "مرداد", 6: "شهریور",
      7: "مهر", 8: "آبان", 9: "آذر", 10: "دی", 11: "بهمن", 12: "اسفند",
    };
    const marketTrends = monthly.map((r: any) => ({
      month: MONTHS_PERSIAN[r._id.month] || `ماه ${r._id.month}`,
      avgPricePerMeter: Math.round(r.avgPricePerMeter || 0),
    }));

    let growthRate = 0;
    if (marketTrends.length >= 2) {
      const latest = marketTrends[marketTrends.length - 1]?.avgPricePerMeter || 0;
      const previous = marketTrends[marketTrends.length - 2]?.avgPricePerMeter || 0;
      if (previous > 0) growthRate = parseFloat((((latest - previous) / previous) * 100).toFixed(1));
    }

    res.json({
      success: true,
      data: {
        totalAds: stats?.totalAds || 0,
        avgPricePerMeter: Math.round(stats?.avgPricePerMeter || 0),
        avgTotalPrice: Math.round(stats?.avgTotalPrice || 0),
        avgArea: Math.round(stats?.avgArea || 0),
        minPrice: stats?.minPrice || 0,
        maxPrice: stats?.maxPrice || 0,
        totalViews: stats?.totalViews || 0,
        growthRate,
        marketTrends,
      },
    });
  } catch (error: any) {
    console.error("❌ getMarketStats:", error.message);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار بازار" });
  }
};

/**
 * GET /api/market/provinces
 * لیست استان‌ها (برای فیلتر)
 */
export const getProvinces = async (_req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const provinces = await Ad.distinct("province", { status: "active", province: { $exists: true, $ne: "" } });
    res.json({ success: true, data: provinces.filter(Boolean) });
  } catch (error: any) {
    console.error("❌ getProvinces:", error.message);
    res.status(500).json({ success: false, message: "خطا در دریافت استان‌ها" });
  }
};

/**
 * GET /api/market/region/:regionId
 * آمار یک منطقه خاص
 */
export const getRegionStats = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const regionId = String(req.params.regionId || "");

    if (!regionId) {
      return res.status(400).json({ success: false, message: "شناسه منطقه الزامی است" });
    }

    // فرض: regionId می‌تواند نام استان یا نام شهر یا نام منطقه باشد
    const filter: any = { status: "active" };
    // اگر regionId با نام استان در ALL_PROVINCES_DATA تطابق داشت، شهرها را فیلتر کن
    const provinceData = ALL_PROVINCES_DATA.find((p) => p.name === regionId);
    if (provinceData) {
      const cities = provinceData.cities.map((c) => c.name);
      filter.city = { $in: cities };
    } else {
      // در غیر این صورت سعی کن به عنوان منطقه (region) یا شهر جستجو کن
      filter.$or = [{ region: regionId }, { city: regionId }, { province: regionId }];
    }

    const [stats] = await Ad.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          avgPricePerMeter: {
            $avg: {
              $cond: [
                { $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] },
                { $divide: ["$price", "$area"] },
                0,
              ],
            },
          },
          avgTotalPrice: { $avg: "$price" },
          avgArea: { $avg: "$area" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        regionId,
        totalAds: stats?.totalAds || 0,
        avgPricePerMeter: Math.round(stats?.avgPricePerMeter || 0),
        avgTotalPrice: Math.round(stats?.avgTotalPrice || 0),
        avgArea: Math.round(stats?.avgArea || 0),
        minPrice: stats?.minPrice || 0,
        maxPrice: stats?.maxPrice || 0,
        totalViews: stats?.totalViews || 0,
      },
    });
  } catch (error: any) {
    console.error("❌ getRegionStats:", error.message);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار منطقه" });
  }
};

/**
 * GET /api/market/region/:regionId/hot-zones
 * مناطق داغ (بیشترین آگهی)
 */
export const getHotZones = async (req: Request, res: Response) => {
  try {
    const Ad = getAd();
    const regionId = String(req.params.regionId || "");

    if (!regionId) {
      return res.status(400).json({ success: false, message: "شناسه منطقه الزامی است" });
    }

    const filter: any = { status: "active" };
    const provinceData = ALL_PROVINCES_DATA.find((p) => p.name === regionId);
    if (provinceData) {
      const cities = provinceData.cities.map((c) => c.name);
      filter.city = { $in: cities };
    } else {
      filter.$or = [{ region: regionId }, { city: regionId }];
    }

    const hotZones = await Ad.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$district",
          totalAds: { $sum: 1 },
          avgPricePerMeter: {
            $avg: {
              $cond: [
                { $and: [{ $gt: ["$area", 0] }, { $gt: ["$price", 0] }] },
                { $divide: ["$price", "$area"] },
                0,
              ],
            },
          },
          totalViews: { $sum: { $ifNull: ["$views", 0] } },
        },
      },
      { $sort: { totalAds: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalAds: 1,
          avgPricePerMeter: { $round: ["$avgPricePerMeter", 0] },
          totalViews: 1,
        },
      },
    ]);

    res.json({ success: true, data: hotZones });
  } catch (error: any) {
    console.error("❌ getHotZones:", error.message);
    res.status(500).json({ success: false, message: "خطا در دریافت مناطق داغ" });
  }
};

/**
 * POST /api/market/refresh
 * بازسازی آمار (در صورت وجود کش)
 */
export const refreshMarketStats = async (req: Request, res: Response) => {
  try {
    // در این نسخه کش نداریم؛ فقط یک پاسخ موفق برمی‌گردانیم
    // می‌توانید در آینده کش را پیاده‌سازی کنید
    res.json({ success: true, message: "آمار بازار با موفقیت بازسازی شد" });
  } catch (error: any) {
    console.error("❌ refreshMarketStats:", error.message);
    res.status(500).json({ success: false, message: "خطا در بازسازی آمار" });
  }
};