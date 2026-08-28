import { Router } from "express";
import mongoose from "mongoose";
import {
  getMarketAnalysis,
  getMapAds,
  getRegions,
  getNeshanLocations,
  getNeshanCitiesList,
  getNeshanDistrictsList,
  getNeshanProvinces,
  getNominatimSearch,
  getLocationAnalysis,
} from "../controllers/marketAnalysis.controller";

const router = Router();

router.get("/analysis", getMarketAnalysis);
router.get("/map-ads", getMapAds);
router.get("/regions", getRegions);
router.get("/neshan-search", getNeshanLocations);
router.get("/neshan-cities-list", getNeshanCitiesList);
router.get("/neshan-districts-list", getNeshanDistrictsList);
router.get("/neshan-provinces", getNeshanProvinces);
router.get("/nominatim-search", getNominatimSearch);
router.get("/location-analysis", getLocationAnalysis);

router.get("/all-map-ads", async (req, res) => {
  try {
    const Ad = mongoose.model("Ad");
    const Property = mongoose.model("Property");
    const [ads, properties] = await Promise.all([
      Ad.find({ status: "active" }).select("title price area city district latitude longitude images views adType").lean(),
      Property.find({ status: "active" }).select("title price area city district location images views propertyType").lean(),
    ]);
    const markers = [
      ...ads.map((ad: any) => ({ id: ad._id, title: ad.title, price: ad.price, area: ad.area, city: ad.city, district: ad.district, lat: ad.latitude, lng: ad.longitude, image: ad.images?.[0] || null, views: ad.views, type: "ad" })),
      ...properties.map((prop: any) => ({ id: prop._id, title: prop.title, price: prop.price, area: prop.area, city: prop.city, district: prop.district, lat: prop.location?.coordinates?.[1], lng: prop.location?.coordinates?.[0], image: prop.images?.[0] || null, views: prop.views, type: "property" })),
    ].filter((m: any) => m.lat && m.lng && !isNaN(m.lat) && !isNaN(m.lng));
    res.json({ success: true, data: { markers, total: markers.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
});

export default router;