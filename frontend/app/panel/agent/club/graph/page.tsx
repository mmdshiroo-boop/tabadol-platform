"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Network,
  RefreshCw,
  Users,
  MessageSquare,
  Eye,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
  Loader2,
  Search,
  Layers,
  Phone,
  Info,
  Filter,
  MousePointer,
  User,
  Building2,
  ExternalLink,
  Send,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { agentClubApi, GraphData } from "@/services/api/agentClub.api";
import { getImageUrl } from "@/lib/getImageUrl";
import { cn } from "@/lib/utils";

// جلوگیری از SSR
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/* ================= TYPES ================= */
interface GraphNode {
  id: string;
  name: string;
  type: "agent" | "member";
  avatar?: string | null;
  phone?: string;
  interactionCount?: number;
  userId?: string;
  [key: string]: any;
}

interface GraphEdge {
  source: string;
  target: string;
  value?: number;
  types?: {
    views?: number;
    sms?: number;
    chats?: number;
  };
}

/* ================= NODE TYPE MAP ================= */
const NODE_TYPE_MAP: Record<
  string,
  { label: string; bg: string; border: string; icon: any }
> = {
  agent: {
    label: "مشاور",
    bg: "hsl(22, 95%, 50%)",
    border: "hsl(22, 95%, 65%)",
    icon: Building2,
  },
  member: {
    label: "عضو",
    bg: "hsl(217, 91%, 60%)",
    border: "hsl(217, 91%, 75%)",
    icon: User,
  },
};

/* ================= THEME DETECTOR ================= */
function useThemeDetector() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();

    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => obs.disconnect();
  }, []);

  return isDark;
}

function getEChartsThemeConfig(isDark: boolean) {
  return {
    text: isDark ? "hsl(0, 0%, 95%)" : "hsl(240, 10%, 15%)",
    textSub: isDark ? "hsl(240, 5%, 65%)" : "hsl(240, 4%, 40%)",
    tooltipBg: isDark ? "rgba(18, 18, 20, 0.92)" : "rgba(255, 255, 255, 0.95)",
    tooltipBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
    tooltipText: isDark ? "hsl(0, 0%, 98%)" : "hsl(240, 10%, 10%)",
    lineColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
    activeLineColor: "hsl(var(--primary))",
  };
}

// تابع ساخت آدرس مطلق برای تصویر
function resolveAvatar(avatar?: string | null): string {
  if (!avatar) {
    return "/images/user.webp";
  }
  if (avatar.startsWith("/uploads")) {
    return getImageUrl(avatar);
  }
  return avatar;
}

function networkOption(
  isDark: boolean,
  nodes: GraphNode[],
  edges: GraphEdge[],
  categories: { name: string }[],
) {
  const tc = getEChartsThemeConfig(isDark);

  const formattedNodes = nodes.map((node) => {
    const config = NODE_TYPE_MAP[node.type] || NODE_TYPE_MAP.agent;
    const avatarUrl = resolveAvatar(node.avatar);

    return {
      ...node,
      category: node.type === "agent" ? 0 : 1,
      symbol: `image://${avatarUrl}`,
      symbolSize:
        node.symbolSize ||
        (node.type === "agent"
          ? 64
          : Math.max(36, 30 + (node.interactionCount || 0) * 0.5)),
      itemStyle: {
        borderColor: config.border,
        borderWidth: 3,
        borderRadius: "50%", // ⭕ دایره‌ای کردن تصویر آواتار
      },
    };
  });

  // رنگ و برچسب یال‌ها بر اساس نوع ارتباط
  const formattedEdges = edges.map((edge) => {
    const types = edge.types || {};
    const hasChat = (types.chats ?? 0) > 0;
    const hasSms = (types.sms ?? 0) > 0;
    const hasView = (types.views ?? 0) > 0;

    let color = "rgba(100,100,100,0.3)";
    if (hasChat) color = "rgba(34,197,94,0.85)";
    else if (hasSms) color = "rgba(249,115,22,0.85)";
    else if (hasView) color = "rgba(59,130,246,0.6)";

    const labelParts = [];
    if (hasChat) labelParts.push(`💬 ${types.chats}`);
    if (hasSms) labelParts.push(`📩 ${types.sms}`);
    if (hasView) labelParts.push(`👁 ${types.views}`);

    return {
      ...edge,
      lineStyle: {
        color,
        width: 2,
        curveness: 0.15,
        opacity: 0.9,
      },
      label: {
        show: labelParts.length > 0,
        formatter: labelParts.join("  "),
        position: "middle",
        fontSize: 10,
        color,
        fontWeight: "bold",
      },
      emphasis: {
        lineStyle: { color, width: 4, opacity: 1 },
        label: { show: true, fontSize: 11 },
      },
    };
  });

  return {
    backgroundColor: "transparent",
    textStyle: {
      fontFamily: "Vazirmatn, system-ui, sans-serif",
      color: tc.textSub,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: tc.tooltipBg,
      borderColor: tc.tooltipBorder,
      borderWidth: 1,
      padding: [12, 16],
      borderRadius: 14,
      shadowBlur: 20,
      shadowColor: "rgba(0, 0, 0, 0.2)",
      textStyle: {
        color: tc.tooltipText,
        fontSize: 12,
        fontFamily: "Vazirmatn, sans-serif",
      },
      formatter: (params: any) => {
        if (params.dataType === "node") {
          const node = params.data as GraphNode;
          const config = NODE_TYPE_MAP[node.type] || NODE_TYPE_MAP.agent;
          return `
            <div style="direction: rtl; font-family: Vazirmatn, sans-serif;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${config.bg}"></span>
                <strong style="font-size: 14px;">${node.name}</strong>
              </div>
              <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                نوع: <span style="font-weight: 600;">${config.label}</span>
              </div>
              ${node.phone ? `<div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">شماره: <span dir="ltr">${node.phone}</span></div>` : ""}
              ${node.interactionCount !== undefined ? `<div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">تعاملات: ${node.interactionCount}</div>` : ""}
              <div style="font-size: 10px; margin-top: 8px; color: hsl(var(--primary));">برای مشاهده جزئیات کلیک کنید</div>
            </div>
          `;
        }
        if (params.dataType === "edge") {
          const edge = params.data as GraphEdge;
          const types = edge.types || {};
          return `
            <div style="direction: rtl; font-family: Vazirmatn, sans-serif; font-size: 12px;">
              ارتباط بین: <strong>${edge.source}</strong> ↔ <strong>${edge.target}</strong><br/>
              ${types.views ? `بازدید: ${types.views}<br/>` : ""}
              ${types.sms ? `پیامک: ${types.sms}<br/>` : ""}
              ${types.chats ? `گفتگو: ${types.chats}` : ""}
            </div>
          `;
        }
        return "";
      },
    },
    animationDuration: 1200,
    animationEasingUpdate: "quinticInOut",
    legend: {
      data: categories.map((cat) => cat.name),
      bottom: 12,
      textStyle: { color: tc.textSub, fontSize: 12 },
      itemGap: 20,
      icon: "circle",
    },
    series: [
      {
        type: "graph",
        layout: "force",
        animation: true,
        draggable: true,
        roam: true,
        categories: categories,
        data: formattedNodes,
        links: formattedEdges,
        label: {
          show: true,
          position: "bottom",
          formatter: (p: any) => p.data?.name || "",
          fontSize: 11,
          color: tc.text,
          distance: 8,
          fontWeight: "bold",
        },
        force: {
          repulsion: 380,
          edgeLength: [80, 220],
          gravity: 0.08,
          friction: 0.5,
        },
        lineStyle: {
          width: 1.5,
          curveness: 0.15,
          color: tc.lineColor,
          opacity: 0.7,
        },
        emphasis: {
          focus: "adjacency",
          lineStyle: { width: 4, color: tc.activeLineColor, opacity: 1 },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: "bold",
            color: tc.text,
          },
        },
      },
    ],
  };
}

/* ================= COMPONENTS ================= */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  accentBg,
}: {
  icon: any;
  label: string;
  value: number;
  color?: string;
  accentBg?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-md text-card-foreground p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 group">
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-25 blur-2xl transition-opacity pointer-events-none"
        style={{ backgroundColor: color || "hsl(var(--primary))" }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className="text-2xl font-black text-card-foreground tracking-tight"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value !== undefined ? value.toLocaleString("fa-IR") : "۰"}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-inner"
          style={{
            backgroundColor: accentBg || "hsl(var(--primary) / 0.12)",
            color: color || "hsl(var(--primary))",
          }}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function NodeDetailPanel({
  node,
  edgeStats,
  onClose,
}: {
  node: GraphNode | null;
  edgeStats: { views: number; sms: number; chats: number } | null;
  onClose: () => void;
}) {
  if (!node) return null;
  const config = NODE_TYPE_MAP[node.type] || NODE_TYPE_MAP.agent;
  const IconComponent = config.icon;

  return (
    <div className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] bg-card/90 backdrop-blur-xl text-card-foreground rounded-2xl border border-border shadow-2xl p-5 animate-in fade-in slide-in-from-right-4 transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm overflow-hidden">
            {node.avatar ? (
              <img
                src={resolveAvatar(node.avatar)}
                alt={node.name}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${window.location.origin}/images/user.webp`;
                }}
              />
            ) : (
              <IconComponent size={18} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{node.name}</h3>
            <p className="text-[10px] text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors shrink-0"
          title="بستن"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Layers size={14} className="text-primary" /> نوع موجودیت
          </span>
          <span className="font-semibold text-foreground">{config.label}</span>
        </div>

        {node.phone && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone size={14} className="text-primary" /> شماره تماس
            </span>
            <span className="font-mono font-medium text-foreground" dir="ltr">
              {node.phone}
            </span>
          </div>
        )}

        {node.interactionCount !== undefined && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/30">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Activity size={14} className="text-primary" /> تعاملات کل
            </span>
            <span className="font-semibold">{node.interactionCount}</span>
          </div>
        )}
      </div>

      {edgeStats && (
        <div className="mt-4">
          <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
            <Network size={14} className="text-primary" /> ارتباطات این گره
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-center">
              <p className="text-lg font-extrabold">{edgeStats.views}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Eye size={12} /> بازدید
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-center">
              <p className="text-lg font-extrabold">{edgeStats.sms}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Send size={12} /> پیامک
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-500/10 text-center">
              <p className="text-lg font-extrabold">{edgeStats.chats}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <MessageSquare size={12} /> گفتگو
              </p>
            </div>
          </div>
        </div>
      )}

      {node.userId && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/panel/user/chat?userId=${node.userId}`}>
            <button className="w-full py-2 rounded-xl bg-muted/80 hover:bg-muted text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
              <MessageSquare size={14} />
              گفتگو
            </button>
          </Link>
          <Link href={`/profile/${node.userId}`} target="_blank">
            <button className="w-full py-2 rounded-xl bg-muted/80 hover:bg-muted text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
              پروفایل
              <ExternalLink size={14} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN PAGE ================= */
export default function AgentClubGraphPage() {
  const isDark = useThemeDetector();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [relationFilter, setRelationFilter] = useState({
    view: true,
    sms: true,
    chat: true,
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [edgeStats, setEdgeStats] = useState<{
    views: number;
    sms: number;
    chats: number;
  } | null>(null);

  const categories = useMemo(
    () => [{ name: "مشاور" }, { name: "عضو" }],
    [],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rawData = await agentClubApi.getGraph();
      const formatted: GraphData = {
        nodes: rawData.nodes,
        edges: rawData.edges.map((edge: any) => ({
          source: edge.source,
          target: edge.target,
          value: edge.value,
          types: edge.types,
        })),
      };
      setData(formatted);
    } catch (err: any) {
      console.error("Club Graph Fetch Error:", err);
      setError(err.response?.data?.message || "خطا در دریافت داده‌های گراف");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (!data) return { filteredNodes: [], filteredEdges: [] };

    let nodes = data.nodes;
    if (typeFilter !== "all") {
      nodes = nodes.filter((n) => n.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      nodes = nodes.filter(
        (n) =>
          n.name?.toLowerCase().includes(q) ||
          n.phone?.toLowerCase().includes(q),
      );
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    let edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    edges = edges.filter((edge) => {
      const types = edge.types || {};
      if (!relationFilter.view && types.views > 0) return false;
      if (!relationFilter.sms && types.sms > 0) return false;
      if (!relationFilter.chat && types.chats > 0) return false;
      return true;
    });

    return { filteredNodes: nodes, filteredEdges: edges };
  }, [data, typeFilter, search, relationFilter]);

  const stats = useMemo(() => {
    if (!data) return { totalMembers: 0, totalEdges: 0, totalInteractions: 0 };
    return {
      totalMembers: data.nodes.filter((n) => n.type === "member").length,
      totalEdges: data.edges.length,
      totalInteractions: data.nodes.reduce(
        (sum, n) => sum + (n.interactionCount || 0),
        0,
      ),
    };
  }, [data]);

  useEffect(() => {
    if (!selectedNode || !data) {
      setEdgeStats(null);
      return;
    }
    const nodeId = selectedNode.id;
    const relatedEdges = data.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );
    const summary = { views: 0, sms: 0, chats: 0 };
    relatedEdges.forEach((edge) => {
      const types = edge.types || {};
      summary.views += types.views || 0;
      summary.sms += types.sms || 0;
      summary.chats += types.chats || 0;
    });
    setEdgeStats(summary);
  }, [selectedNode, data]);

  const wrapperClass = fullscreen
    ? "fixed inset-0 z-[100] bg-background text-foreground overflow-hidden flex flex-col p-4"
    : "min-h-screen bg-background text-foreground transition-colors duration-300 font-[Vazirmatn]";

  const containerClass = fullscreen
    ? "flex-1 w-full h-full flex flex-col gap-4"
    : "relative max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6";

  const graphBoxHeight = fullscreen
    ? "flex-1 w-full min-h-[500px]"
    : "h-[calc(100vh-340px)] min-h-[550px]";

  return (
    <div className={wrapperClass} dir="rtl">
      <div className={containerClass}>
        {/* هدر */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/25 shrink-0">
              <Network size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">
                  گراف شبکه ارتباطات باشگاه
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">
                  زنده
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحلیل ارتباط شما با اعضا بر اساس بازدید، پیامک و گفتگو
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground bg-muted/80 hover:bg-muted border border-border/50 rounded-xl transition-all disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
              <span>بروزرسانی</span>
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground bg-muted/80 hover:bg-muted border border-border/50 rounded-xl transition-all active:scale-95"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{fullscreen ? "خروج از تمام صفحه" : "تمام‌صفحه"}</span>
            </button>
          </div>
        </div>

        {/* کارت‌های آمار */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 shrink-0">
          <StatCard icon={Users} label="اعضای باشگاه" value={stats.totalMembers} color="hsl(217, 91%, 60%)" accentBg="hsl(217, 91%, 60%, 0.12)" />
          <StatCard icon={Network} label="ارتباطات" value={stats.totalEdges} color="hsl(22, 95%, 50%)" accentBg="hsl(22, 95%, 50%, 0.12)" />
          <StatCard icon={MessageSquare} label="مجموع تعاملات" value={stats.totalInteractions} color="hsl(142, 71%, 45%)" accentBg="hsl(142, 71%, 45%, 0.12)" />
        </div>

        {/* نوار فیلتر و ابزار */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="جستجوی نام یا شماره..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl bg-card border border-border text-foreground pr-10 pl-8 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/70"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-xl bg-card border border-border text-foreground pr-9 pl-4 text-xs focus:outline-none focus:border-primary cursor-pointer appearance-none transition-all font-medium"
              >
                <option value="all">همه</option>
                <option value="agent">فقط مشاور</option>
                <option value="member">فقط اعضا</option>
              </select>
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                <span className="text-[10px] text-muted-foreground font-medium">نوع ارتباط:</span>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={relationFilter.view} onChange={(e) => setRelationFilter((prev) => ({ ...prev, view: e.target.checked }))} className="accent-blue-500" />
                  <Eye size={14} className="text-blue-500" /> بازدید
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={relationFilter.sms} onChange={(e) => setRelationFilter((prev) => ({ ...prev, sms: e.target.checked }))} className="accent-orange-500" />
                  <Send size={14} className="text-orange-500" /> پیامک
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={relationFilter.chat} onChange={(e) => setRelationFilter((prev) => ({ ...prev, chat: e.target.checked }))} className="accent-green-500" />
                  <MessageSquare size={14} className="text-green-500" /> گفتگو
                </label>
              </div>
              <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/60 rounded-lg">
                {filteredNodes.length.toLocaleString("fa-IR")} گره
              </span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/40 px-3 py-2 rounded-xl">
            <MousePointer size={14} className="text-primary shrink-0" />
            <span>اسکرول: زوم | درگ: جابجایی | کلیک: انتخاب گره</span>
          </div>
        </div>

        {/* محیط گراف */}
        <div className={`relative rounded-2xl bg-card border border-border overflow-hidden shadow-sm transition-all ${graphBoxHeight}`}>
          <NodeDetailPanel node={selectedNode} edgeStats={edgeStats} onClose={() => setSelectedNode(null)} />

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-md z-30 animate-in fade-in">
              <div className="p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col items-center text-center max-w-xs">
                <Loader2 size={36} className="animate-spin text-primary mb-3" />
                <p className="text-sm font-bold text-foreground">در حال بارگذاری گراف...</p>
                <p className="text-xs text-muted-foreground mt-1">پردازش ارتباطات باشگاه</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-30 p-4">
              <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex flex-col items-center max-w-sm text-center">
                <AlertTriangle size={42} className="text-destructive mb-3" />
                <h3 className="text-base font-bold text-destructive mb-1">خطا در بارگذاری داده‌ها</h3>
                <p className="text-xs text-destructive/80 mb-5">{error}</p>
                <button onClick={fetchData} className="px-5 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95">
                  تلاش مجدد
                </button>
              </div>
            </div>
          )}

          {data && !loading && !error && filteredNodes.length > 0 && (
            <ReactECharts
              option={networkOption(isDark, filteredNodes, filteredEdges, categories)}
              style={{ height: "100%", width: "100%" }}
              notMerge
              lazyUpdate
              onEvents={{
                click: (params: any) => {
                  if (params?.dataType === "node" && params?.data) {
                    setSelectedNode(params.data as GraphNode);
                  }
                },
              }}
            />
          )}

          {data && !loading && !error && filteredNodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-3">
                <Search size={28} />
              </div>
              <p className="text-sm font-bold text-foreground">هیچ گرهی یافت نشد!</p>
              <p className="text-xs text-muted-foreground mt-1">عبارت جستجو یا فیلتر انتخابی خود را تغییر دهید.</p>
            </div>
          )}
        </div>

        {/* لِجند رنگ یال‌ها */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground justify-end">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> بازدید</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500" /> پیامک</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> گفتگو</span>
        </div>
      </div>
    </div>
  );
}