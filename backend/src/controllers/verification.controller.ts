import { Request, Response } from "express";
import { VerificationRequest } from "../models/VerificationRequest";
import { Agent } from "../models/Agent.model";
import { User } from "../models/User.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { sendNotificationToUser } from "../services/notification.service";

export const requestVerification = async (req: AuthRequest, res: Response) => {
  try {
    let agent = await Agent.findOne({ userId: req.user._id });
    if (!agent && req.user.phone) {
      agent = await Agent.findOne({ phone: req.user.phone });
    }
    if (!agent) {
      return res.status(403).json({ success: false, message: "حساب مشاور یافت نشد" });
    }

    const agentId = agent._id;
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, message: "حداقل یک مدرک الزامی است" });
    }

    const existing = await VerificationRequest.findOne({ agent: agentId as any });
    if (existing && existing.status === "pending") {
      return res.status(400).json({ success: false, message: "درخواست قبلی شما در حال بررسی است" });
    }

    const verification = await VerificationRequest.create({
      agent: agentId as any,
      documents,
      status: "pending",
    } as any);

    if (!verification) {
      return res.status(500).json({ success: false, message: "خطا در ثبت درخواست" });
    }

    await Agent.findByIdAndUpdate(agentId, { verificationRequestId: verification._id });

    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "VerificationRequest",
      resourceId: verification._id.toString(),
      description: `مشاور ${req.user?.firstName || req.user?.phone} درخواست تیک آبی ثبت کرد.`,
      req,
    });

    res.status(201).json({ success: true, data: verification, message: "درخواست با موفقیت ثبت شد" });
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({ success: false, message: "خطا در ثبت درخواست" });
  }
};

export const getMyVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const agent = await Agent.findOne({ userId: req.user._id });
    if (!agent) {
      return res.json({ success: true, data: null });
    }
    const request = await VerificationRequest.findOne({ agent: agent._id as any })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Get verification status error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت وضعیت" });
  }
};

export const getAllVerificationRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query: any = {};
    if (status) query.status = String(status);

    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      VerificationRequest.find(query)
        .populate(
  "agent",
  "firstName lastName phone agencyName avatar email createdAt rating isVerified userId"
)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      VerificationRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all verification requests error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت درخواست‌ها" });
  }
};

export const reviewVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "وضعیت نامعتبر است" });
    }

    const verification = await VerificationRequest.findById(id);
    if (!verification) {
      return res.status(404).json({ success: false, message: "درخواست یافت نشد" });
    }

    if (verification.status !== "pending") {
      return res.status(400).json({ success: false, message: "این درخواست قبلاً بررسی شده است" });
    }

    verification.status = status;
    verification.reviewedBy = req.user?._id;
    verification.reviewNote = reviewNote || "";
    await verification.save();

    const isApproved = status === "approved";

    const agent = await Agent.findByIdAndUpdate(
      verification.agent,
      { isVerified: isApproved },
      { new: true }
    );

    if (agent) {
      await User.findByIdAndUpdate(agent.userId, { isVerified: isApproved });
    }

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "VerificationRequest",
      resourceId: verification._id.toString(),
      description: `درخواست تیک آبی مشاور ${agent?.firstName || agent?.phone || ""} ${isApproved ? "تأیید" : "رد"} شد.`,
      req,
    });

    if (agent) {
      await sendNotificationToUser(
        agent.userId.toString(),
        isApproved ? "✅ تیک آبی شما تأیید شد" : "❌ درخواست تیک آبی رد شد",
        isApproved
          ? "تبریک! حساب شما تأیید شد و نشان آبی دریافت کردید."
          : `متأسفانه درخواست شما رد شد. دلیل: ${reviewNote || "نامشخص"}`,
        "verification_status" as any,
        "/panel/agent/profile",
        { status, reviewNote }
      );
    }

    res.json({ success: true, data: verification, message: "بررسی انجام شد" });
  } catch (error) {
    console.error("Review verification error:", error);
    res.status(500).json({ success: false, message: "خطا در بررسی درخواست" });
  }
};