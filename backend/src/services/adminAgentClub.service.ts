import mongoose from "mongoose";
import { AgentClub } from "../models/AgentClub.model";
import { ClubMember } from "../models/ClubMember.model";
import { SmsCampaign } from "../models/SmsCampaign.model";
import { AgentActivity } from "../models/AgentActivity.model";
import { Agent } from "../models/Agent.model";
import { User } from "../models/User.model";

// دریافت لیست همه باشگاه‌ها با اطلاعات مشاور
export async function getAllClubs({
  page = 1,
  limit = 20,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const query: any = {};
  if (search) {
    query.$or = [
      { "agentInfo.name": { $regex: search, $options: "i" } },
      { "agentInfo.agencyName": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const pipeline: any[] = [
    {
      $lookup: {
        from: "agents",
        localField: "agentId",
        foreignField: "_id",
        as: "agentInfo",
      },
    },
    { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "agentInfo.userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "agentInfo.firstName": { $regex: search, $options: "i" } },
          { "agentInfo.lastName": { $regex: search, $options: "i" } },
          { "agentInfo.agencyName": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  pipeline.push({ $skip: skip }, { $limit: Number(limit) });

  const [clubs, totalResult] = await Promise.all([
    AgentClub.aggregate(pipeline),
    AgentClub.aggregate(countPipeline),
  ]);

  const total = totalResult[0]?.total || 0;

  return { clubs, total, page: Number(page), limit: Number(limit) };
}

// دریافت آمار کلی برای داشبورد ادمین
export async function getSystemStats() {
  const [totalClubs, totalMembers, totalCampaigns, totalActivities, totalSmsSent] =
    await Promise.all([
      AgentClub.countDocuments(),
      ClubMember.countDocuments(),
      SmsCampaign.countDocuments(),
      AgentActivity.countDocuments(),
      AgentClub.aggregate([{ $group: { _id: null, total: { $sum: "$totalSmsSent" } } }]),
    ]);

  return {
    totalClubs,
    totalMembers,
    totalCampaigns,
    totalActivities,
    totalSmsSent: totalSmsSent[0]?.total || 0,
  };
}

// دریافت جزئیات کامل یک باشگاه
export async function getClubDetails(clubId: string) {
  const club = await AgentClub.findById(clubId).lean();
  if (!club) throw new Error("باشگاه یافت نشد");

  const [agent, membersCount, campaignsCount, activitiesCount] = await Promise.all([
    Agent.findById(club.agentId)
      .select("firstName lastName agencyName phone userId isVerified")
      .lean(),
    ClubMember.countDocuments({ agentId: club.agentId }),
    SmsCampaign.countDocuments({ agentId: club.agentId }),
    AgentActivity.countDocuments({ agentId: club.agentId }),
  ]);

  return {
    club,
    agent,
    stats: {
      membersCount,
      campaignsCount,
      activitiesCount,
      totalViews: club.totalViews,
      totalSmsSent: club.totalSmsSent,
    },
  };
}

// دریافت اعضای یک باشگاه
export async function getClubMembers(
  clubId: string,
  { page = 1, limit = 20, search = "" }: { page?: number; limit?: number; search?: string }
) {
  const club = await AgentClub.findById(clubId).lean();
  if (!club) throw new Error("باشگاه یافت نشد");

  const query: any = { agentId: club.agentId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [members, total] = await Promise.all([
    ClubMember.find(query)
      .populate("userId", "firstName lastName avatar phone role")
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ClubMember.countDocuments(query),
  ]);

  return { members, total, page: Number(page), limit: Number(limit) };
}

// دریافت کمپین‌های یک باشگاه
export async function getClubCampaigns(
  clubId: string,
  { page = 1, limit = 10, status = "" }: { page?: number; limit?: number; status?: string }
) {
  const club = await AgentClub.findById(clubId).lean();
  if (!club) throw new Error("باشگاه یافت نشد");

  const query: any = { agentId: club.agentId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [campaigns, total] = await Promise.all([
    SmsCampaign.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    SmsCampaign.countDocuments(query),
  ]);

  return { campaigns, total, page: Number(page), limit: Number(limit) };
}

// دریافت فعالیت‌های یک باشگاه
export async function getClubActivities(
  clubId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number }
) {
  const club = await AgentClub.findById(clubId).lean();
  if (!club) throw new Error("باشگاه یافت نشد");

  const skip = (Number(page) - 1) * Number(limit);
  const [activities, total] = await Promise.all([
    AgentActivity.find({ agentId: club.agentId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AgentActivity.countDocuments({ agentId: club.agentId }),
  ]);

  return { activities, total, page: Number(page), limit: Number(limit) };
}

// حذف کامل باشگاه و داده‌های مرتبط (فقط سوپرادمین)
export async function deleteClub(clubId: string) {
  const club = await AgentClub.findById(clubId);
  if (!club) throw new Error("باشگاه یافت نشد");

  await Promise.all([
    ClubMember.deleteMany({ agentId: club.agentId }),
    SmsCampaign.deleteMany({ agentId: club.agentId }),
    AgentActivity.deleteMany({ agentId: club.agentId }),
  ]);

  await AgentClub.findByIdAndDelete(clubId);
  return true;
}

// حذف عضو از باشگاه (فقط سوپرادمین)
export async function deleteMember(clubId: string, memberId: string) {
  const club = await AgentClub.findById(clubId);
  if (!club) throw new Error("باشگاه یافت نشد");

  const result = await ClubMember.deleteOne({ _id: memberId, agentId: club.agentId });
  if (result.deletedCount === 0) throw new Error("عضو یافت نشد");

  await AgentClub.findByIdAndUpdate(clubId, { $inc: { membersCount: -1 } });
  return true;
}

// ویرایش عضو (فقط سوپرادمین)
export async function updateMember(
  clubId: string,
  memberId: string,
  data: { name?: string; phone?: string; notes?: string }
) {
  const club = await AgentClub.findById(clubId);
  if (!club) throw new Error("باشگاه یافت نشد");

  const member = await ClubMember.findOneAndUpdate(
    { _id: memberId, agentId: club.agentId },
    data,
    { new: true, runValidators: true }
  );
  if (!member) throw new Error("عضو یافت نشد");
  return member;
}

// تنظیمات باشگاه (مثلاً حداکثر اعضا) – فعلاً در متغیر محیطی است
export async function updateClubSettings(clubId: string, settings: { maxMembers?: number }) {
  // به دلیل اینکه maxMembers سراسری است، می‌توان در اینجا تغییر داد
  if (settings.maxMembers !== undefined) {
    process.env.MAX_CLUB_MEMBERS = String(settings.maxMembers);
  }
  return { maxMembers: Number(process.env.MAX_CLUB_MEMBERS) || 500 };
}