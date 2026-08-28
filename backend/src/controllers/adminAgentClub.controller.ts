import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as adminService from "../services/adminAgentClub.service";

export const getAllClubs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data = await adminService.getAllClubs({
      page: Number(page),
      limit: Number(limit),
      search: String(search),
    });
    res.json({
      success: true,
      data: data.clubs,
      pagination: { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil(data.total / data.limit) },
    });
  } catch (error) {
    console.error("Admin get clubs error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت باشگاه‌ها" });
  }
};

export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminService.getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Admin system stats error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
  }
};

export const getClubDetails = async (req: AuthRequest, res: Response) => {
  try {
    const data = await adminService.getClubDetails(String(req.params.id));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در دریافت جزئیات" });
  }
};

export const getClubMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data = await adminService.getClubMembers(String(req.params.id), {
      page: Number(page),
      limit: Number(limit),
      search: String(search),
    });
    res.json({
      success: true,
      data: data.members,
      pagination: { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil(data.total / data.limit) },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در دریافت اعضا" });
  }
};

export const getClubCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const data = await adminService.getClubCampaigns(String(req.params.id), {
      page: Number(page),
      limit: Number(limit),
      status: String(status),
    });
    res.json({
      success: true,
      data: data.campaigns,
      pagination: { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil(data.total / data.limit) },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در دریافت کمپین‌ها" });
  }
};

export const getClubActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await adminService.getClubActivities(String(req.params.id), {
      page: Number(page),
      limit: Number(limit),
    });
    res.json({
      success: true,
      data: data.activities,
      pagination: { page: data.page, limit: data.limit, total: data.total, pages: Math.ceil(data.total / data.limit) },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در دریافت فعالیت‌ها" });
  }
};