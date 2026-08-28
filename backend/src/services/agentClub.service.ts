// backend/src/services/agentClub.service.ts
import mongoose from "mongoose";
import { AgentClub } from "../models/AgentClub.model";
import { ClubMember } from "../models/ClubMember.model";
import { SmsCampaign } from "../models/SmsCampaign.model";
import { AgentActivity } from "../models/AgentActivity.model";
import { Agent } from "../models/Agent.model";
import { User } from "../models/User.model";
import { Conversation } from "../models/Conversation.model";
import { Message } from "../models/Message.model";
import { grantPoints } from "./loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
import { sendNotificationToUser } from "./notification.service";
import { getSmsService } from "./sms.service";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { Ad } from "../models/Ad.model";

const MAX_CLUB_MEMBERS = Number(process.env.MAX_CLUB_MEMBERS) || 500;

// ─── Helper: دریافت باشگاه یا ایجاد آن ───
export async function getOrCreateClub(agentId: string) {
  return AgentClub.findOneAndUpdate(
    { agentId },
    { $setOnInsert: { agentId, membersCount: 0, totalViews: 0, totalSmsSent: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ─── Helper: ارسال پیامک (واقعی یا Mock) ───
async function sendSms(phones: string[], message: string) {
  const useMock =
    !process.env.SMS_USERNAME || !process.env.SMS_PASSWORD || !process.env.SMS_FROM_NUMBER;

  if (useMock) {
    console.log(`📱 [MOCK] ارسال پیامک به ${phones.length} شماره`);
    return { sent: phones.length, failed: 0 };
  }

  try {
    const smsService = getSmsService({
      username: process.env.SMS_USERNAME!,
      password: process.env.SMS_PASSWORD!,
      fromNumber: process.env.SMS_FROM_NUMBER!,
    });
    const result = await smsService.sendBulkSMS(phones, message);
    return { sent: result.totalSent, failed: result.totalFailed };
  } catch (error) {
    console.error("❌ SMS service error:", error);
    return { sent: 0, failed: phones.length };
  }
}

// ─── ۱. افزودن عضو دستی (با اتصال به User) ───
export async function addMember(
  agentId: string,
  data: { phone: string; name?: string; userId?: string; notes?: string }
) {
  // بررسی تکراری بودن در باشگاه
  const existing = await ClubMember.findOne({ agentId, phone: data.phone });
  if (existing) {
    throw new Error("این شماره قبلاً در باشگاه شما عضویت دارد");
  }

  // بررسی محدودیت تعداد اعضا
  const membersCount = await ClubMember.countDocuments({ agentId });
  if (membersCount >= MAX_CLUB_MEMBERS) {
    throw new Error(`حداکثر تعداد اعضای باشگاه (${MAX_CLUB_MEMBERS} نفر) تکمیل شده است.`);
  }

  // یافتن یا ایجاد کاربر واقعی
  let userId = data.userId || null;
  if (!userId) {
    let user = await User.findOne({ phone: data.phone });
    if (!user) {
      // ایجاد کاربر جدید با رمز موقت
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      user = await User.create({
        phone: data.phone,
        password: hashedPassword,
        firstName: data.name?.split(" ")[0] || "",
        lastName: data.name?.split(" ").slice(1).join(" ") || "",
        role: "user",
        isActive: true,
        phoneVerified: false,
      });
      console.log(`👤 کاربر جدید با شماره ${data.phone} ایجاد شد`);
    }
    // اصلاح: تبدیل ObjectId به string
    userId = user._id.toString();
  }

  // ایجاد عضو در باشگاه
  const member = await ClubMember.create({
    agentId,
    phone: data.phone,
    name: data.name || "",
    userId: userId,
    notes: data.notes || "",
  });

  // افزایش شمارنده اعضا
  await AgentClub.findOneAndUpdate(
    { agentId },
    { $inc: { membersCount: 1 } },
    { upsert: true, new: true }
  );

  // ثبت فعالیت
  await AgentActivity.create({
    agentId,
    type: "member_added",
    metadata: { memberId: member._id, phone: data.phone, userId },
  });

  // امتیاز به مشاور
  const agent = await Agent.findById(agentId);
  if (agent?.userId) {
    await grantPoints(
      agent.userId.toString(),
      LOYALTY_RULES.AGENT_CLUB_MEMBER_ADDED,
      "agent_club_member_added",
      "افزودن عضو جدید به باشگاه",
      { memberId: member._id, phone: data.phone }
    );
  }

  // 🆕 اعلان بلادرنگ به مشاور
  if (agent?.userId) {
    try {
      await sendNotificationToUser(
        agent.userId.toString(),
        "👥 عضو جدید",
        `کاربر ${data.phone} به باشگاه شما اضافه شد.`,
        "member_added" as any, // اصلاح: cast نوع اعلان
        "/panel/agent/club/members",
        { memberId: member._id, phone: data.phone }
      );
    } catch (notifError) {
      console.error("Error sending add member notification:", notifError);
    }
  }

  return member;
}

// ─── ۲. افزودن خودکار عضو بر اساس کاربر ───
export async function addMemberByUserId(agentId: string, userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("کاربر یافت نشد");

  const memberData = {
    phone: user.phone,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    userId,
    notes: "عضویت از طریق کد معرف",
  };
  return addMember(agentId, memberData);
}

// ─── ۳. حذف عضو ───
export async function removeMember(agentId: string, memberId: string) {
  const member = await ClubMember.findOneAndDelete({ _id: memberId, agentId });
  if (!member) throw new Error("عضو یافت نشد");

  await AgentClub.findOneAndUpdate(
    { agentId },
    { $inc: { membersCount: -1 } }
  );

  await AgentActivity.create({
    agentId,
    type: "member_removed",
    metadata: { memberId, phone: member.phone },
  });

  // 🆕 اعلان بلادرنگ به مشاور
  try {
    const agent = await Agent.findById(agentId);
    if (agent?.userId) {
      await sendNotificationToUser(
        agent.userId.toString(),
        "🗑️ عضو حذف شد",
        `کاربر ${member.phone} از باشگاه شما حذف شد.`,
        "info",
        "/panel/agent/club/members"
      );
    }
  } catch (notifError) {
    console.error("Error sending remove member notification:", notifError);
  }

  return true;
}

// ─── ۴. ویرایش یادداشت/اطلاعات عضو ───
export async function updateMember(
  agentId: string,
  memberId: string,
  update: { name?: string; phone?: string; notes?: string }
) {
  const member = await ClubMember.findOneAndUpdate(
    { _id: memberId, agentId },
    update,
    { new: true, runValidators: true }
  );
  if (!member) throw new Error("عضو یافت نشد");
  return member;
}

// ─── ۵. دریافت لیست اعضا با صفحه‌بندی، جستجو و مرتب‌سازی ساده ───
export async function getMembers(
  agentId: string,
  {
    page = 1,
    limit = 20,
    search = "",
    sortBy = "newest",
  }: { page?: number; limit?: number; search?: string; sortBy?: string }
) {
  const query: any = { agentId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const sort: any = {};
  if (sortBy === "newest") sort.joinedAt = -1;
  else if (sortBy === "oldest") sort.joinedAt = 1;
  else if (sortBy === "interactions_desc") sort.interactionCount = -1;
  else if (sortBy === "interactions_asc") sort.interactionCount = 1;
  else if (sortBy === "name_asc") sort.name = 1;
  else if (sortBy === "name_desc") sort.name = -1;
  else sort.joinedAt = -1;

  const skip = (Number(page) - 1) * Number(limit);
  const [members, total] = await Promise.all([
    ClubMember.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ClubMember.countDocuments(query),
  ]);

  return { members, total, page: Number(page), limit: Number(limit) };
}

// ─── ۶. ارسال پیامک/پیام داخلی به اعضا و ثبت کمپین ───
export async function sendSmsCampaign(
  agentId: string,
  message: string,
  recipientPhones: string[]
) {
  if (!recipientPhones.length) throw new Error("گیرنده‌ای مشخص نشده است");

  const agent = await Agent.findById(agentId);
  if (!agent) throw new Error("مشاور یافت نشد");
  const senderUserId = agent.userId;
  const senderName = `${agent.firstName || ""} ${agent.lastName || ""}`.trim();

  const campaign = await SmsCampaign.create({
    agentId,
    message,
    recipients: recipientPhones,
    recipientsCount: recipientPhones.length,
    status: "pending",
  });

  let sent = 0;
  let failed = 0;

  for (const phone of recipientPhones) {
    const member = await ClubMember.findOne({ agentId, phone });
    if (!member || !member.userId) {
      failed++;
      continue;
    }

    try {
      await sendNotificationToUser(
        member.userId.toString(),
        `📩 پیام از ${senderName}`,
        message,
        "new_message",
        "/panel/user/chat",
        { campaignId: campaign._id, sender: senderUserId }
      );

      let conversation = await Conversation.findOne({
        participants: { $all: [senderUserId, member.userId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderUserId, member.userId],
        });
      }

      await Message.create({
        conversation: conversation._id,
        sender: senderUserId,
        content: message,
        createdAt: new Date(),
      });

      await AgentActivity.create({
        agentId,
        type: "sms_sent",
        metadata: {
          memberId: member._id,
          userId: member.userId,
          campaignId: campaign._id,
        },
      });

      await AgentActivity.create({
        agentId,
        type: "chat",
        metadata: {
          memberId: member._id,
          userId: member.userId,
          campaignId: campaign._id,
        },
      });

      sent++;
    } catch (error) {
      console.error(`❌ ارسال به ${phone} ناموفق:`, error);
      failed++;
    }
  }

  campaign.status = failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";
  campaign.sentCount = sent;
  campaign.failedCount = failed;
  campaign.sentAt = new Date();
  await campaign.save();

  await AgentClub.findOneAndUpdate({ agentId }, { $inc: { totalSmsSent: sent } });

  await AgentActivity.create({
    agentId,
    type: "sms_sent",
    metadata: { campaignId: campaign._id, sent, failed },
  });

  if (sent > 0) {
    await grantPoints(
      senderUserId.toString(),
      LOYALTY_RULES.AGENT_CLUB_SMS_SENT,
      "agent_club_sms_sent",
      "ارسال پیام به اعضای باشگاه",
      { campaignId: campaign._id, sent }
    );
  }

  // 🆕 اعلان بلادرنگ به مشاور
  try {
    await sendNotificationToUser(
      senderUserId.toString(),
      "📨 پیام ارسال شد",
      `پیام شما به ${sent} نفر از اعضا ارسال شد (${failed} ناموفق).`,
      "success",
      "/panel/agent/club/sms",
      { campaignId: campaign._id, sent, failed }
    );
  } catch (notifError) {
    console.error("Error sending sms campaign notification:", notifError);
  }

  return campaign;
}

// ─── ۷. ثبت بازدید توسط عضو باشگاه ───
export async function recordView(agentId: string, userId: string) {
  const member = await ClubMember.findOne({ agentId, userId });
  if (!member) return false;

  await ClubMember.findByIdAndUpdate(member._id, { $inc: { interactionCount: 1 } });
  await AgentClub.findOneAndUpdate({ agentId }, { $inc: { totalViews: 1 } });
  await AgentActivity.create({
    agentId,
    type: "view",
    metadata: { userId, memberId: member._id },
  });
  return true;
}

// ─── ۸. نمای کلی داشبورد ───
export async function getClubOverview(agentId: string) {
  const club = await getOrCreateClub(agentId);
  const [recentActivities, totalCampaigns] = await Promise.all([
    AgentActivity.find({ agentId }).sort({ createdAt: -1 }).limit(10).lean(),
    SmsCampaign.countDocuments({ agentId }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = await ClubMember.countDocuments({ agentId, joinedAt: { $gte: monthStart } });

  return {
    membersCount: club.membersCount,
    totalViews: club.totalViews,
    totalSmsSent: club.totalSmsSent,
    totalCampaigns,
    newThisMonth,
    recentActivities,
  };
}

// ─── ۹. دریافت کمپین‌های پیامکی ───
export async function getSmsCampaigns(
  agentId: string,
  { page = 1, limit = 10, status = "" }: { page?: number; limit?: number; status?: string }
) {
  const query: any = { agentId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [campaigns, total] = await Promise.all([
    SmsCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SmsCampaign.countDocuments(query),
  ]);

  return { campaigns, total, page: Number(page), limit: Number(limit) };
}

// ─── ۱۰. داده‌های نمودار داشبورد ───
export async function getDashboardAnalytics(agentId: string, days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const [memberGrowth, viewGrowth, smsGrowth] = await Promise.all([
    ClubMember.aggregate([
      {
        $match: {
          agentId: new mongoose.Types.ObjectId(agentId),
          joinedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$joinedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AgentActivity.aggregate([
      {
        $match: {
          agentId: new mongoose.Types.ObjectId(agentId),
          type: "view",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SmsCampaign.aggregate([
      {
        $match: {
          agentId: new mongoose.Types.ObjectId(agentId),
          sentAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["sent", "partial"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } },
          count: { $sum: "$sentCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
  };

  return {
    memberGrowth: memberGrowth.map((g: any) => ({ date: g._id, label: formatDate(g._id), count: g.count })),
    viewGrowth: viewGrowth.map((g: any) => ({ date: g._id, label: formatDate(g._id), count: g.count })),
    smsGrowth: smsGrowth.map((g: any) => ({ date: g._id, label: formatDate(g._id), count: g.count })),
  };
}

// ─── ۱۱. جزئیات عضو با تاریخچه تعاملات ───
export async function getMemberDetail(agentId: string, memberId: string) {
  const member = await ClubMember.findOne({ _id: memberId, agentId })
    .populate("userId", "firstName lastName avatar phone role isVerified")
    .lean();
  if (!member) throw new Error("عضو یافت نشد");

  const activities = await AgentActivity.find({
    agentId,
    $or: [{ "metadata.memberId": memberId }, { "metadata.userId": member.userId?.toString() }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const [views, sms, chats] = await Promise.all([
    AgentActivity.countDocuments({ agentId, type: "view", "metadata.memberId": memberId }),
    AgentActivity.countDocuments({ agentId, type: "sms_sent", "metadata.memberId": memberId }),
    AgentActivity.countDocuments({ agentId, type: "chat", "metadata.memberId": memberId }),
  ]);

  return { member, stats: { views, sms, chats }, activities };
}

// ─── ۱۲. حذف گروهی اعضا ───
export async function bulkRemoveMembers(agentId: string, memberIds: string[]) {
  const result = await ClubMember.deleteMany({ _id: { $in: memberIds }, agentId });
  const deletedCount = result.deletedCount || 0;

  if (deletedCount > 0) {
    await AgentClub.findOneAndUpdate(
      { agentId },
      { $inc: { membersCount: -deletedCount } }
    );

    // اصلاح: cast agentId به any برای جلوگیری از خطای تایپ
    await AgentActivity.create(
      memberIds.map((id) => ({
        agentId: agentId as any,
        type: "member_removed" as any,
        metadata: { memberId: id, bulk: true },
      })) as any
    );

    // 🆕 اعلان بلادرنگ به مشاور
    try {
      const agent = await Agent.findById(agentId);
      if (agent?.userId) {
        await sendNotificationToUser(
          agent.userId.toString(),
          "🗑️ حذف گروهی",
          `${deletedCount} عضو از باشگاه شما حذف شدند.`,
          "info",
          "/panel/agent/club/members"
        );
      }
    } catch (notifError) {
      console.error("Error sending bulk remove notification:", notifError);
    }
  }

  return deletedCount;
}

// ─── ۱۳. اکسپورت اعضا (Excel) ───
export async function exportMembers(agentId: string): Promise<Buffer> {
  const members = await ClubMember.find({ agentId })
    .populate("userId", "firstName lastName phone")
    .lean();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("اعضا");
  sheet.columns = [
    { header: "نام", key: "name", width: 20 },
    { header: "شماره موبایل", key: "phone", width: 15 },
    { header: "یادداشت", key: "notes", width: 30 },
    { header: "تعداد تعاملات", key: "interactionCount", width: 15 },
    { header: "تاریخ عضویت", key: "joinedAt", width: 20 },
  ];
  members.forEach((m: any) => {
    sheet.addRow({
      // اصلاح: تبدیل m.userId به any برای دسترسی به خواص
      name: m.name || (m.userId ? `${(m.userId as any)?.firstName || ""} ${(m.userId as any)?.lastName || ""}`.trim() : ""),
      phone: m.phone,
      notes: m.notes || "",
      interactionCount: m.interactionCount,
      joinedAt: new Date(m.joinedAt).toLocaleDateString("fa-IR"),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  // اصلاح: cast به unknown و سپس Buffer برای رفع خطا
  return buffer as unknown as Buffer;
}

// ─── ۱۴. ایمپورت اعضا (Excel) ───
export async function importMembers(agentId: string, fileBuffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  // اصلاح: cast fileBuffer به any
  await workbook.xlsx.load(fileBuffer as any);
  const sheet = workbook.worksheets[0];
  const rows: any[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const phone = String(row.getCell(2).text || "").trim();
    const name = String(row.getCell(1).text || "").trim();
    const notes = String(row.getCell(3).text || "").trim();
    if (phone) rows.push({ phone, name, notes });
  });

  let added = 0;
  for (const row of rows) {
    try {
      await addMember(agentId, row);
      added++;
    } catch (e) {
      // ignore duplicates
    }
  }
  return added;
}

// ─── ۱۵. رتبه‌بندی پویا با امتیاز مرکب ───
export async function getAgentsRanking(filters?: { city?: string }) {
  const clubs = await AgentClub.find().lean();
  const ranking = [];

  for (const club of clubs) {
    const agent = await Agent.findById(club.agentId)
      .select("firstName lastName agencyName phone userId isVerified")
      .lean();
    if (!agent) continue;

    const user = await User.findById(agent.userId)
      .select("city rating avatar firstName lastName phone")
      .lean();
    if (filters?.city && user?.city !== filters.city) continue;

    const adStats = await Ad.aggregate([
      { $match: { userId: agent.userId } },
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          activeAds: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          soldAds: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
          totalAdViews: { $sum: "$views" },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] },
          },
        },
      },
    ]);

    const performance = adStats[0] || {
      totalAds: 0,
      activeAds: 0,
      soldAds: 0,
      totalAdViews: 0,
      totalRevenue: 0,
    };

    const conversionRate =
      performance.totalAds > 0
        ? Math.round((performance.soldAds / performance.totalAds) * 100)
        : 0;

    const score =
      club.membersCount * 0.4 +
      (club.totalViews / 100) * 0.3 +
      club.totalSmsSent * 0.2 +
      (user?.rating || 0) * 2 * 0.1 +
      (agent.isVerified ? 5 : 0);

    ranking.push({
      agentId: club.agentId,
      userId: agent.userId,
      agentName: `${agent.firstName || ""} ${agent.lastName || ""}`.trim(),
      agencyName: agent.agencyName || "",
      city: user?.city || "",
      avatar: user?.avatar || "/uploads/avatar/user.webp",
      rating: user?.rating || 0,
      isVerified: agent.isVerified || false,
      phone: agent.phone || "",
      membersCount: club.membersCount,
      totalViews: club.totalViews,
      totalSmsSent: club.totalSmsSent,
      performance: {
        totalAds: performance.totalAds,
        activeAds: performance.activeAds,
        soldAds: performance.soldAds,
        totalAdViews: performance.totalAdViews,
        totalRevenue: performance.totalRevenue,
        conversionRate,
      },
      score: Math.round(score * 100) / 100,
    });
  }

  ranking.sort((a, b) => b.score - a.score);
  ranking.forEach((item, index) => (item.rank = index + 1));

  return ranking;
}

// ─── ۱۶. داده‌های گراف شبکه ───
export async function getGraphData(agentId: string) {
  const agent = await Agent.findById(agentId)
    .select("firstName lastName agencyName phone userId")
    .lean();

  const agentUser = agent?.userId
    ? await User.findById(agent.userId).select("avatar firstName lastName phone").lean()
    : null;

  const members = await ClubMember.find({ agentId })
    .populate("userId", "avatar firstName lastName phone")
    .limit(200)
    .lean();

  const nodes = [
    {
      id: `agent_${agentId}`,
      name: agent ? `${agent.firstName || ""} ${agent.lastName || ""}`.trim() : "مشاور",
      type: "agent",
      avatar: agentUser?.avatar || null,
      phone: agent?.phone || "",
      userId: agent?.userId?.toString() || "",
      interactionCount: 0,
    },
    ...members.map((m: any) => ({
      id: `member_${m._id}`,
      // اصلاح: cast m.userId to any
      name: m.name || (m.userId ? `${(m.userId as any)?.firstName || ""} ${(m.userId as any)?.lastName || ""}`.trim() : m.phone),
      type: "member",
      interactionCount: m.interactionCount || 0,
      phone: m.phone,
      avatar: (m.userId as any)?.avatar || null,
      userId: (m.userId as any)?._id?.toString() || "",
    })),
  ];

  const edges = [];
  for (const m of members) {
    const [views, sms, chats] = await Promise.all([
      AgentActivity.countDocuments({ agentId, type: "view", "metadata.memberId": m._id }),
      AgentActivity.countDocuments({ agentId, type: "sms_sent", "metadata.memberId": m._id }),
      AgentActivity.countDocuments({ agentId, type: "chat", "metadata.memberId": m._id }),
    ]);
    if (views > 0 || sms > 0 || chats > 0) {
      edges.push({
        source: `agent_${agentId}`,
        target: `member_${m._id}`,
        value: views + sms + chats,
        types: { views, sms, chats },
      });
    }
  }

  return { nodes, edges };
}

// ─── ۱۷. گزارش دوره‌ای باشگاه ───
export async function getClubReport(agentId: string, period: "daily" | "weekly" | "monthly") {
  const now = new Date();
  let startDate: Date;
  let groupFormat: string;

  if (period === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    groupFormat = "%H:00";
  } else if (period === "weekly") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    groupFormat = "%Y-%m-%d";
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    groupFormat = "%Y-%m-%d";
  }

  const [memberStats, viewStats, smsStats] = await Promise.all([
    ClubMember.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId), joinedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$joinedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AgentActivity.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId), type: "view", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SmsCampaign.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId), sentAt: { $gte: startDate }, status: { $in: ["sent", "partial"] } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$sentAt" } },
          count: { $sum: "$sentCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return { period, memberGrowth: memberStats, viewGrowth: viewStats, smsGrowth: smsStats };
}

// ─── ۱۸. فعالیت‌های اخیر ───
export async function getRecentActivities(agentId: string, limit = 20) {
  return AgentActivity.find({ agentId })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
}