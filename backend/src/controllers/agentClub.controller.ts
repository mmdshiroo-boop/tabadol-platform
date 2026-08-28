// backend/src/controllers/agentClub.controller.ts
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as agentClubService from "../services/agentClub.service";
import { z } from "zod";
import { Agent } from "../models/Agent.model";


async function resolveAgentId(req: AuthRequest): Promise<string | null> {
  if (req.user?.agentId) return req.user.agentId.toString();

  const agent = await Agent.findOne({ userId: req.user?._id }).lean();
  return agent?._id.toString() || null;
}

const addMemberSchema = z.object({
  phone: z.string().regex(/^09[0-9]{9}$/, "شماره موبایل معتبر نیست"),
  name: z.string().optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
});

const updateMemberSchema = z.object({
  name: z.string().optional(),
  phone: z.string().regex(/^09[0-9]{9}$/, "شماره موبایل معتبر نیست").optional(),
  notes: z.string().optional(),
});

const sendSmsSchema = z.object({
  message: z.string().min(1, "متن پیام الزامی است").max(500),
  recipientIds: z.array(z.string()).optional(),
  sendAll: z.boolean().optional().default(false),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "حداقل یک عضو انتخاب کنید"),
});

export const getClubOverview = async (req: AuthRequest, res: Response) => {
  try {
   const agentId = await resolveAgentId(req);
if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });
    const data = await agentClubService.getClubOverview(agentId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get club overview error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار باشگاه" });
  }
};

export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const { page = 1, limit = 20, search = "", sortBy = "newest" } = req.query;
    const data = await agentClubService.getMembers(agentId, {
      page: Number(page),
      limit: Number(limit),
      search: String(search),
      sortBy: String(sortBy),
    });

    res.json({
      success: true,
      data: data.members,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        pages: Math.ceil(data.total / data.limit),
      },
    });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت لیست اعضا" });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }

    const member = await agentClubService.addMember(agentId, parsed.data);
    res.status(201).json({ success: true, data: member, message: "عضو با موفقیت اضافه شد" });
  } catch (error: any) {
    console.error("Add member error:", error);
    res.status(400).json({ success: false, message: error.message || "خطا در افزودن عضو" });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    await agentClubService.removeMember(agentId, String(req.params.id));
    res.json({ success: true, message: "عضو با موفقیت حذف شد" });
  } catch (error: any) {
    console.error("Remove member error:", error);
    res.status(400).json({ success: false, message: error.message || "خطا در حذف عضو" });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }

    const member = await agentClubService.updateMember(agentId, String(req.params.id), parsed.data);
    res.json({ success: true, data: member, message: "اطلاعات عضو به‌روزرسانی شد" });
  } catch (error: any) {
    console.error("Update member error:", error);
    res.status(400).json({ success: false, message: error.message || "خطا در ویرایش عضو" });
  }
};

export const bulkRemoveMembers = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }

    const deleted = await agentClubService.bulkRemoveMembers(agentId, parsed.data.ids);
    res.json({ success: true, message: `${deleted} عضو حذف شد` });
  } catch (error: any) {
    console.error("Bulk remove members error:", error);
    res.status(400).json({ success: false, message: error.message || "خطا در حذف گروهی" });
  }
};

export const exportMembers = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const buffer = await agentClubService.exportMembers(agentId);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=club-members.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("Export members error:", error);
    res.status(500).json({ success: false, message: "خطا در اکسپورت اعضا" });
  }
};

export const importMembers = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: "فایل ارسالی یافت نشد" });
    }

    const file = req.files.file as any;
    const added = await agentClubService.importMembers(agentId, file.data);
    res.json({ success: true, message: `${added} عضو اضافه شد` });
  } catch (error) {
    console.error("Import members error:", error);
    res.status(500).json({ success: false, message: "خطا در ایمپورت اعضا" });
  }
};

export const sendSms = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const parsed = sendSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
    }

    const { message, recipientIds, sendAll } = parsed.data;

    let targetPhones: string[] = [];
    if (sendAll || !recipientIds?.length) {
      const members = await agentClubService.getMembers(agentId, { limit: 1000, search: "" });
      targetPhones = members.members.map((m: any) => m.phone);
    } else {
      const members = await agentClubService.getMembers(agentId, { limit: 1000, search: "" });
      const idSet = new Set(recipientIds);
      targetPhones = members.members
        .filter((m: any) => idSet.has(m._id.toString()))
        .map((m: any) => m.phone);
    }

    if (!targetPhones.length) {
      return res.status(400).json({ success: false, message: "گیرنده‌ای انتخاب نشده است" });
    }

    const campaign = await agentClubService.sendSmsCampaign(agentId, message, targetPhones);
    res.json({
      success: true,
      data: campaign,
      message: `ارسال به ${campaign.sentCount} شماره با موفقیت انجام شد`,
    });
  } catch (error: any) {
    console.error("Send SMS error:", error);
    res.status(400).json({ success: false, message: error.message || "خطا در ارسال پیامک" });
  }
};

export const getSmsCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const { page = 1, limit = 10, status = "" } = req.query;
    const data = await agentClubService.getSmsCampaigns(agentId, {
      page: Number(page),
      limit: Number(limit),
      status: String(status),
    });

    res.json({
      success: true,
      data: data.campaigns,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        pages: Math.ceil(data.total / data.limit),
      },
    });
  } catch (error) {
    console.error("Get SMS campaigns error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت کمپین‌ها" });
  }
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const { days = 30 } = req.query;
    const data = await agentClubService.getDashboardAnalytics(agentId, Number(days));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار نمودار" });
  }
};

export const getClubReport = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const period = req.params.period as "daily" | "weekly" | "monthly";
    if (!["daily", "weekly", "monthly"].includes(period)) {
      return res.status(400).json({ success: false, message: "دوره نامعتبر است" });
    }

    const data = await agentClubService.getClubReport(agentId, period);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get club report error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت گزارش" });
  }
};

export const getRanking = async (req: AuthRequest, res: Response) => {
  try {
    const city = req.query.city ? String(req.query.city) : undefined;
    const ranking = await agentClubService.getAgentsRanking({ city });
    res.json({ success: true, data: ranking });
  } catch (error) {
    console.error("Get ranking error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت رتبه‌بندی" });
  }
};

export const getGraph = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const data = await agentClubService.getGraphData(agentId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get graph error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت داده‌های گراف" });
  }
};

export const getMemberDetail = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const data = await agentClubService.getMemberDetail(agentId, String(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get member detail error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت جزئیات عضو" });
  }
};

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.user.agentId?.toString();
    if (!agentId) return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });

    const { limit = 20 } = req.query;
    const data = await agentClubService.getRecentActivities(agentId, Number(limit));
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت فعالیت‌ها" });
  }
};