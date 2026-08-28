import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as adminService from "../services/adminAgentClub.service";

export const deleteClub = async (req: AuthRequest, res: Response) => {
  try {
    await adminService.deleteClub(String(req.params.id));
    res.json({ success: true, message: "باشگاه با موفقیت حذف شد" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در حذف باشگاه" });
  }
};

export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    await adminService.deleteMember(String(req.params.id), String(req.params.memberId));
    res.json({ success: true, message: "عضو حذف شد" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در حذف عضو" });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const member = await adminService.updateMember(String(req.params.id), String(req.params.memberId), data);
    res.json({ success: true, data: member, message: "عضو ویرایش شد" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در ویرایش عضو" });
  }
};

export const updateClubSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await adminService.updateClubSettings(String(req.params.id), req.body);
    res.json({ success: true, data: settings, message: "تنظیمات بروزرسانی شد" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "خطا در بروزرسانی تنظیمات" });
  }
};