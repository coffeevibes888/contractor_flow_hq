"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PropertyManagement from "@/components/super-admin/property-management";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import UserManagement from "@/components/super-admin/user-management";
import LandlordDetailModal from "@/components/super-admin/landlord-detail-modal";
import TierManager from "@/components/super-admin/tier-manager";
import {
  LayoutDashboard,
  Activity,
  Globe,
  MousePointerClick,
  Users,
  Building2,
  Settings,
  Layers,
  Menu,
  X,
  HardHat,
  FileSearch,
  Mail,
  ShieldCheck,
  ExternalLink,
  Ban,
  CheckCircle,
  LogOut,
  AlertTriangle
} from "lucide-react";

const views = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "health", label: "System Health", icon: Activity },
  { id: "traffic", label: "Traffic", icon: Globe },
  { id: "engagement", label: "Engagement", icon: MousePointerClick },
  { id: "users", label: "Users & Sessions", icon: Users },
  { id: "portfolio", label: "Portfolio & Revenue", icon: Building2 },
  { id: "contractors", label: "Contractors", icon: HardHat },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "management", label: "User Management", icon: Settings },
  { id: "tiers", label: "Tier Testing", icon: Layers },
] as const;

const externalViews = [
  { id: "audit-logs", label: "Audit Logs", href: "/super-admin/audit-logs", icon: FileSearch },
  { id: "newsletter", label: "Newsletter", href: "/super-admin/newsletter", icon: Mail },
  { id: "security", label: "Security", href: "/super-admin/security", icon: ShieldCheck },
] as const;

type TopPage = { path: string; _count: { _all: number } };
type CountryStat = { country: string | null; _count: { _all: number } };
type AnalyticsEvent = {
  id: string;
  createdAt: Date | string;
  sessionCartId?: string | null;
  path: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
};
type DevicesBreakdown = { desktop?: number; mobile?: number; tablet?: number; other?: number };
type UserRow = { id: string; name: string | null; email: string; role: string | null; createdAt: string | Date };

type AnalyticsSummary = {
  totalEvents: number;
  visitorsCount: number;
  topPages: TopPage[];
  countries: CountryStat[];
  recentEvents: AnalyticsEvent[];
  eventsToday: number;
  eventsYesterday: number;
  eventsLast7Days: number;
  currentOnlineVisitors: number;
  devices?: DevicesBreakdown | null;
  averageSessionDurationMs: number;
} & Record<string, unknown>;

type LatestSale = { id: string; user: { name?: string | null } | null; createdAt: Date | string; totalPrice: number | string };
type OverviewSummary = {
  totalSales: { _sum: { totalPrice?: string | number | null } };
  ordersCount: number;
  usersCount: number;
  productsCount: number;
  salesData: { month: string; totalSales: number }[];
};
type StoreSummary = OverviewSummary & { latestSales: LatestSale[] };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RentTotals = { day: number; week: number; month: number; year: number };
type LandlordPortfolio = { id: string; name: string; subdomain: string; properties: number; units: number; tenants: number; rentCollected: number; subscriptionTier?: string };
type LocationBreakdown = { state?: string; city?: string; count: number };
type PlatformRevenue = {
  convenienceFees: RentTotals;
  cashoutFees: RentTotals;
  subscriptionRevenue: RentTotals;
  total: RentTotals;
};
type SubscriptionBreakdown = { starter: number; pro: number; enterprise: number };
type StripeConnectStatus = { completed: number; pendingVerification: number; pending: number; notStarted: number };
type MaintenanceSummary = { open: number; inProgress: number; resolved: number; closed: number; urgent: number; high: number; total: number };
type RecentSignups = { usersThisWeek: number; usersThisMonth: number; landlordsThisWeek: number; landlordsThisMonth: number };
type SystemHealth = { failedPaymentsLast30Days: number; overduePayments: number };
type RecentPayout = { id: string; amount: number; status: string; initiatedAt: string; paidAt: string | null; landlordName: string; landlordSubdomain: string };

type ContractorStats = {
  total: number;
  subscriptionBreakdown: { starter: number; pro: number; enterprise: number };
  totalJobs: number;
  newThisWeek: number;
  newThisMonth: number;
};

type SuperAdminInsights = {
  landlordsCount: number;
  propertyManagersCount: number;
  propertiesCount: number;
  unitsCount: number;
  activeLeases: number;
  tenantsCount: number;
  landlordsPortfolio: LandlordPortfolio[];
  rentTotals: RentTotals;
  revenueMTD: number;
  revenuePrevMonth: number;
  arpuPerLandlord: number;
  collectionRate: number;
  expectedThisMonth: number;
  paidThisMonth: number;
  delinquencyBuckets: { "0-30": number; "31-60": number; "61+": number };
  landlordCohorts: { month: string; count: number }[];
  funnel: { signedUpLandlords: number; onboardedProperties: number; activeLeases: number; propertyManagers: number };
  lateRate: number;
  revenueTimeline: { month: string; total: number }[];
  locations: { states: LocationBreakdown[]; cities: LocationBreakdown[] };
  platformRevenue?: PlatformRevenue;
  subscriptionBreakdown?: SubscriptionBreakdown;
  stripeConnectStatus?: StripeConnectStatus;
  maintenanceSummary?: MaintenanceSummary;
  mrr?: number;
  recentSignups?: RecentSignups;
  systemHealth?: SystemHealth;
  recentPayouts?: RecentPayout[];
  contractorStats?: ContractorStats;
};

type LandlordRow = { id: string; name: string; ownerUserId: string };

interface SuperAdminDashboardProps {
  userEmail: string;
  summary?: StoreSummary;
  analytics: AnalyticsSummary;
  insights?: SuperAdminInsights;
  users?: UserRow[];
  landlords?: LandlordRow[];
  currentUser?: Session["user"];
}

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return "0m";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

function parseOS(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows nt")) return "Windows";
  if (ua.includes("mac os x") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("linux")) return "Linux";
  return "Other";
}

function parseDevice(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("android") || ua.includes("mobile")) return "Mobile";
  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
  return "Desktop";
}

function parseBrowser(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  return "Other";
}

// Stat card component
function StatCard({ label, value, subtext, variant = "default" }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  variant?: "default" | "gradient" | "success" | "warning" | "danger";
}) {
  const baseClasses = "rounded-xl border p-4";
  const variantClasses = {
    default: "bg-slate-900/60 border-white/10",
    gradient: "bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 border-transparent",
    success: "bg-emerald-950/50 border-emerald-800/50",
    warning: "bg-amber-950/50 border-amber-800/50",
    danger: "bg-red-950/50 border-red-800/50",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <p className={`text-xs mb-1 ${variant === "gradient" ? "text-white/80" : "text-slate-400"}`}>{label}</p>
      <p className={`text-2xl font-bold ${variant === "gradient" ? "text-white" : "text-white"}`}>{value}</p>
      {subtext && <p className={`text-xs mt-1 ${variant === "gradient" ? "text-white/70" : "text-slate-500"}`}>{subtext}</p>}
    </div>
  );
}


const SuperAdminDashboard = ({
  userEmail,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  summary: _summary,
  analytics,
  insights,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  users: _users,
  landlords,
  currentUser,
}: SuperAdminDashboardProps) => {
  const [activeView, setActiveView] = useState<(typeof views)[number]["id"]>("overview");
  const [isClearingStats, startClearingStats] = useTransition();
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(null);
  const [activeTrafficDetail, setActiveTrafficDetail] = useState<"today" | "yesterday" | "last7" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentLimit = parseInt(searchParams.get("recentLimit") || "50", 10);

  const handleLimitChange = useCallback((limit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("recentLimit", String(limit));
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  const {
    totalEvents,
    visitorsCount,
    topPages,
    countries,
    recentEvents,
    eventsToday,
    eventsYesterday,
    eventsLast7Days,
    currentOnlineVisitors,
    devices,
    averageSessionDurationMs,
  } = analytics;

  const osBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of recentEvents as AnalyticsEvent[]) {
      const os = parseOS(ev.userAgent);
      counts[os] = (counts[os] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [recentEvents]);

  const trafficDetailEvents = useMemo(() => {
    if (!activeTrafficDetail) return [] as AnalyticsEvent[];
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);

    return recentEvents.filter((ev) => {
      const created = new Date(ev.createdAt);
      if (activeTrafficDetail === "today") return created >= startOfToday;
      if (activeTrafficDetail === "yesterday") return created >= startOfYesterday && created < startOfToday;
      if (activeTrafficDetail === "last7") return created >= startOf7DaysAgo;
      return false;
    });
  }, [activeTrafficDetail, recentEvents]);

  const handleClearStatistics = () => {
    if (!window.confirm("This will clear all tracked analytics statistics. Continue?")) return;
    startClearingStats(async () => {
      try {
        const res = await fetch("/api/analytics/reset", { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          console.error("Failed to clear analytics statistics", data?.message);
          return;
        }
        window.location.reload();
      } catch (err) {
        console.error("Error clearing analytics statistics", err);
      }
    });
  };

  // Overview Content
  const overviewContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-400">Platform overview for {userEmail}</p>
      </div>

      {/* Current User Card */}
      {currentUser && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-600 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Session</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-white/70">Name</p>
              <p className="font-medium text-white">{currentUser.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Email</p>
              <p className="font-medium text-white truncate">{currentUser.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Role</p>
              <p className="font-medium text-white">{currentUser.role || "user"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Phone</p>
              <p className="font-medium text-white">{currentUser.phoneNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Verified</p>
              <p className="font-medium text-white">{currentUser.phoneVerified ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">User ID</p>
              <p className="font-mono text-xs text-white truncate">{currentUser.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Snapshot */}
      {insights && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Portfolio Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Landlords" value={formatNumber(insights.landlordsCount)} variant="gradient" />
            <StatCard label="Property Managers" value={formatNumber(insights.propertyManagersCount)} />
            <StatCard label="Properties" value={formatNumber(insights.propertiesCount)} />
            <StatCard label="Units" value={formatNumber(insights.unitsCount)} />
            <StatCard label="Active Leases" value={formatNumber(insights.activeLeases)} />
            <StatCard label="Tenants" value={formatNumber(insights.tenantsCount)} />
          </div>
        </div>
      )}

      {/* Traffic Overview */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Traffic Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Page Views" value={formatNumber(totalEvents)} variant="gradient" />
          <StatCard label="Unique Visitors" value={formatNumber(visitorsCount)} />
          <StatCard label="Avg Views / Visitor" value={visitorsCount > 0 ? (totalEvents / visitorsCount).toFixed(2) : "0.00"} />
        </div>
      </div>

      {/* Contractor Snapshot */}
      {insights?.contractorStats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Contractors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Contractors" value={formatNumber(insights.contractorStats.total)} variant="gradient" />
            <StatCard label="Total Jobs Processed" value={formatNumber(insights.contractorStats.totalJobs)} />
            <StatCard label="New (7 days)" value={formatNumber(insights.contractorStats.newThisWeek)} />
            <StatCard label="New (30 days)" value={formatNumber(insights.contractorStats.newThisMonth)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-950/50 border border-slate-800/50 p-4">
              <p className="text-xs text-slate-400 mb-1">Starter</p>
              <p className="text-2xl font-bold text-slate-300">{formatNumber(insights.contractorStats.subscriptionBreakdown.starter)}</p>
            </div>
            <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-4">
              <p className="text-xs text-violet-400 mb-1">Pro</p>
              <p className="text-2xl font-bold text-violet-300">{formatNumber(insights.contractorStats.subscriptionBreakdown.pro)}</p>
            </div>
            <div className="rounded-xl bg-amber-950/50 border border-amber-800/50 p-4">
              <p className="text-xs text-amber-400 mb-1">Enterprise</p>
              <p className="text-2xl font-bold text-amber-300">{formatNumber(insights.contractorStats.subscriptionBreakdown.enterprise)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Pages & Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top Pages</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">Page</TableHead>
                  <TableHead className="text-right text-slate-400">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No traffic data yet.</TableCell></TableRow>
                ) : topPages.map((p) => (
                  <TableRow key={p.path} className="border-white/5">
                    <TableCell className="text-white">{p.path}</TableCell>
                    <TableCell className="text-right text-slate-300">{p._count._all}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top Countries</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">Country</TableHead>
                  <TableHead className="text-right text-slate-400">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No geo data yet.</TableCell></TableRow>
                ) : countries.map((c, idx) => (
                  <TableRow key={`${c.country ?? "Unknown"}-${idx}`} className="border-white/5">
                    <TableCell className="text-white">{c.country ?? "Unknown"}</TableCell>
                    <TableCell className="text-right text-slate-300">{c._count._all}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

    </div>
  );


  // Traffic Content
  const trafficContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Traffic Analytics</h1>
        <p className="text-sm text-slate-400">Monitor visitor activity and page views</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Online Now" value={formatNumber(currentOnlineVisitors)} variant="gradient" />
        <div onClick={() => setActiveTrafficDetail(prev => prev === "today" ? null : "today")} className="cursor-pointer">
          <StatCard label="Views Today" value={formatNumber(eventsToday)} />
        </div>
        <div onClick={() => setActiveTrafficDetail(prev => prev === "yesterday" ? null : "yesterday")} className="cursor-pointer">
          <StatCard label="Views Yesterday" value={formatNumber(eventsYesterday)} />
        </div>
        <div onClick={() => setActiveTrafficDetail(prev => prev === "last7" ? null : "last7")} className="cursor-pointer">
          <StatCard label="Last 7 Days" value={formatNumber(eventsLast7Days)} />
        </div>
      </div>

      {activeTrafficDetail && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            {activeTrafficDetail === "today" && "Today's Page Views"}
            {activeTrafficDetail === "yesterday" && "Yesterday's Page Views"}
            {activeTrafficDetail === "last7" && "Last 7 Days Page Views"}
          </h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">When</TableHead>
                  <TableHead className="text-slate-400">Session</TableHead>
                  <TableHead className="text-slate-400">Path</TableHead>
                  <TableHead className="text-slate-400">Location</TableHead>
                  <TableHead className="text-slate-400">OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trafficDetailEvents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-slate-500">No events found.</TableCell></TableRow>
                ) : trafficDetailEvents.map((ev) => (
                  <TableRow key={ev.id} className="border-white/5">
                    <TableCell className="text-slate-300 text-sm">{formatDateTime(new Date(ev.createdAt)).dateTime}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-400 truncate max-w-[100px]">{ev.sessionCartId}</TableCell>
                    <TableCell className="text-white">{ev.path}</TableCell>
                    <TableCell className="text-slate-300">{[ev.city, ev.region, ev.country].filter(Boolean).join(", ") || "Unknown"}</TableCell>
                    <TableCell className="text-slate-300">{parseOS(ev.userAgent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top Pages</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">Page</TableHead>
                  <TableHead className="text-right text-slate-400">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
                ) : topPages.map((p) => (
                  <TableRow key={p.path} className="border-white/5">
                    <TableCell className="text-white">{p.path}</TableCell>
                    <TableCell className="text-right text-slate-300">{p._count._all}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top Countries</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">Country</TableHead>
                  <TableHead className="text-right text-slate-400">Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
                ) : countries.map((c, idx) => (
                  <TableRow key={`${c.country}-${idx}`} className="border-white/5">
                    <TableCell className="text-white">{c.country ?? "Unknown"}</TableCell>
                    <TableCell className="text-right text-slate-300">{c._count._all}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );

  // Security actions
  const [blockingIP, setBlockingIP] = useState<string | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set());

  const handleBlockIP = async (ipAddress: string) => {
    if (!ipAddress || ipAddress === "—") return;
    
    if (!confirm(`Block IP address ${ipAddress}? This will prevent all access from this IP.`)) return;

    setBlockingIP(ipAddress);
    try {
      const res = await fetch('/api/super-admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress,
          reason: 'Blocked from Engagement page',
          notes: 'Suspicious activity detected'
        })
      });

      if (res.ok) {
        setBlockedIPs(prev => new Set([...prev, ipAddress]));
        alert(`IP ${ipAddress} has been blocked successfully`);
      } else {
        alert('Failed to block IP address');
      }
    } catch (error) {
      alert('Error blocking IP address');
    } finally {
      setBlockingIP(null);
    }
  };

  const handleUnblockIP = async (ipAddress: string) => {
    if (!ipAddress || ipAddress === "—") return;
    
    if (!confirm(`Unblock IP address ${ipAddress}?`)) return;

    try {
      const res = await fetch('/api/super-admin/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress })
      });

      if (res.ok) {
        setBlockedIPs(prev => {
          const newSet = new Set(prev);
          newSet.delete(ipAddress);
          return newSet;
        });
        alert(`IP ${ipAddress} has been unblocked successfully`);
      } else {
        alert('Failed to unblock IP address');
      }
    } catch (error) {
      alert('Error unblocking IP address');
    }
  };

  const handleForceLogoutAll = async () => {
    if (!confirm('Force logout ALL active sessions? This will log out everyone except you. They will need to sign in again.')) return;

    try {
      const res = await fetch('/api/super-admin/security/force-logout-all', {
        method: 'POST'
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Successfully logged out ${data.sessionsTerminated} active sessions`);
      } else {
        alert('Failed to force logout sessions');
      }
    } catch (error) {
      alert('Error forcing logout');
    }
  };

  // Engagement Content
  const engagementContent = (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Engagement</h1>
          <p className="text-sm text-slate-400">User engagement and session metrics</p>
        </div>
        <button
          onClick={handleForceLogoutAll}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Force Logout All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Average Session Length" value={formatDuration(averageSessionDurationMs)} variant="gradient" />
        <StatCard label="Avg Views / Visitor" value={visitorsCount > 0 ? (totalEvents / visitorsCount).toFixed(2) : "0.00"} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Show:</span>
            {[25, 50, 100, 250].map((limit) => (
              <button
                key={limit}
                onClick={() => handleLimitChange(limit)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  currentLimit === limit
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {limit}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-x-auto max-h-[32rem] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">When</TableHead>
                <TableHead className="text-slate-400">Path</TableHead>
                <TableHead className="text-slate-400">Device</TableHead>
                <TableHead className="text-slate-400">Browser</TableHead>
                <TableHead className="text-slate-400">OS</TableHead>
                <TableHead className="text-slate-400">IP Address</TableHead>
                <TableHead className="text-slate-400">Location</TableHead>
                <TableHead className="text-slate-400 text-right">Screen</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEvents.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-slate-500">No activity.</TableCell></TableRow>
              ) : recentEvents.map((ev) => (
                <TableRow key={ev.id} className="border-white/5">
                  <TableCell className="text-slate-300 text-sm whitespace-nowrap">{formatDateTime(new Date(ev.createdAt)).dateTime}</TableCell>
                  <TableCell className="text-white font-mono text-xs max-w-[200px] truncate" title={ev.path}>{ev.path}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      parseDevice(ev.userAgent) === "Mobile" ? "bg-blue-500/20 text-blue-300" :
                      parseDevice(ev.userAgent) === "Tablet" ? "bg-amber-500/20 text-amber-300" :
                      "bg-slate-500/20 text-slate-300"
                    }`}>
                      {parseDevice(ev.userAgent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300 text-xs">{parseBrowser(ev.userAgent)}</TableCell>
                  <TableCell className="text-slate-300 text-xs">{parseOS(ev.userAgent)}</TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">{ev.ipAddress || "—"}</TableCell>
                  <TableCell className="text-slate-300 text-xs">{[ev.city, ev.region, ev.country].filter(Boolean).join(", ") || "Unknown"}</TableCell>
                  <TableCell className="text-slate-500 text-xs text-right">{ev.screenWidth && ev.screenHeight ? `${ev.screenWidth}×${ev.screenHeight}` : "—"}</TableCell>
                  <TableCell className="text-right">
                    {ev.ipAddress && ev.ipAddress !== "—" && (
                      <div className="flex items-center justify-end gap-1">
                        {blockedIPs.has(ev.ipAddress) ? (
                          <button
                            onClick={() => handleUnblockIP(ev.ipAddress!)}
                            className="p-1 hover:bg-green-500/20 rounded text-green-400 hover:text-green-300 transition-colors"
                            title="Unblock IP"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockIP(ev.ipAddress!)}
                            disabled={blockingIP === ev.ipAddress}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Block IP"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  // Users Content
  const usersContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Users & Sessions</h1>
        <p className="text-sm text-slate-400">User statistics and device breakdown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Online Now" value={formatNumber(currentOnlineVisitors)} variant="gradient" />
        <StatCard label="Unique Visitors" value={formatNumber(visitorsCount)} />
        <StatCard label="Avg Session" value={formatDuration(averageSessionDurationMs)} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Devices</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Desktop" value={formatNumber(devices?.desktop ?? 0)} />
          <StatCard label="Mobile" value={formatNumber(devices?.mobile ?? 0)} />
          <StatCard label="Tablet" value={formatNumber(devices?.tablet ?? 0)} />
          <StatCard label="Other" value={formatNumber(devices?.other ?? 0)} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Operating Systems</h2>
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden max-w-md">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">OS</TableHead>
                <TableHead className="text-right text-slate-400">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {osBreakdown.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
              ) : osBreakdown.map(([os, count]) => (
                <TableRow key={os} className="border-white/5">
                  <TableCell className="text-white">{os}</TableCell>
                  <TableCell className="text-right text-slate-300">{formatNumber(count)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );


  // Portfolio Content
  const portfolioContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Portfolio & Revenue</h1>
        <p className="text-sm text-slate-400">Platform revenue and landlord portfolios</p>
      </div>

      {/* Platform Revenue */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-emerald-400">Platform Revenue (Your Earnings)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today" value={formatCurrency(insights?.platformRevenue?.total.day ?? 0)} variant="success" />
          <StatCard label="This Week" value={formatCurrency(insights?.platformRevenue?.total.week ?? 0)} variant="success" />
          <StatCard label="This Month" value={formatCurrency(insights?.platformRevenue?.total.month ?? 0)} variant="success" />
          <StatCard label="This Year" value={formatCurrency(insights?.platformRevenue?.total.year ?? 0)} variant="success" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Convenience Fees (Month)" value={formatCurrency(insights?.platformRevenue?.convenienceFees.month ?? 0)} />
          <StatCard label="Cashout Fees (Month)" value={formatCurrency(insights?.platformRevenue?.cashoutFees.month ?? 0)} />
          <StatCard label="Subscription Revenue (Month)" value={formatCurrency(insights?.platformRevenue?.subscriptionRevenue.month ?? 0)} />
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Subscription Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-950/50 border border-slate-800/50 p-4">
            <p className="text-xs text-slate-400 mb-1">Starter ($39/mo)</p>
            <p className="text-2xl font-bold text-slate-300">
              {formatNumber(insights?.subscriptionBreakdown?.starter ?? 0)}
            </p>
          </div>
          <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-4">
            <p className="text-xs text-violet-400 mb-1">Pro ($99/mo)</p>
            <p className="text-2xl font-bold text-violet-300">
              {formatNumber(insights?.subscriptionBreakdown?.pro ?? 0)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-950/50 border border-amber-800/50 p-4">
            <p className="text-xs text-amber-400 mb-1">Enterprise ($199/mo)</p>
            <p className="text-2xl font-bold text-amber-300">{formatNumber(insights?.subscriptionBreakdown?.enterprise ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Landlords & Managers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Landlords & Managers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Landlords" value={formatNumber(insights?.landlordsCount ?? 0)} variant="gradient" />
          <StatCard label="Property Managers" value={formatNumber(insights?.propertyManagersCount ?? 0)} />
          <StatCard label="Properties" value={formatNumber(insights?.propertiesCount ?? 0)} />
          <StatCard label="Units" value={formatNumber(insights?.unitsCount ?? 0)} />
        </div>
      </div>

      {/* Rent Intake */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Rent Intake (All Landlords)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today" value={formatCurrency(insights?.rentTotals.day ?? 0)} />
          <StatCard label="This Week" value={formatCurrency(insights?.rentTotals.week ?? 0)} />
          <StatCard label="This Month" value={formatCurrency(insights?.rentTotals.month ?? 0)} variant="gradient" />
          <StatCard label="This Year" value={formatCurrency(insights?.rentTotals.year ?? 0)} />
        </div>
      </div>

      {/* Top Landlords */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Top Landlords by Portfolio</h2>
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">Landlord</TableHead>
                <TableHead className="text-slate-400">Tier</TableHead>
                <TableHead className="text-slate-400 text-center">Properties</TableHead>
                <TableHead className="text-slate-400 text-center">Units</TableHead>
                <TableHead className="text-slate-400 text-center">Tenants</TableHead>
                <TableHead className="text-right text-slate-400">Rent Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(insights?.landlordsPortfolio || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-slate-500">No landlord data.</TableCell></TableRow>
              ) : (insights?.landlordsPortfolio || [])
                .slice()
                .sort((a, b) => b.rentCollected - a.rentCollected)
                .slice(0, 10)
                .map((ll) => (
                  <TableRow
                    key={ll.id}
                    className="border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setSelectedLandlordId(ll.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{ll.name}</p>
                        <p className="text-xs text-slate-400">{ll.subdomain}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ll.subscriptionTier === 'enterprise' ? 'bg-amber-500/20 text-amber-400' :
                        ll.subscriptionTier === 'pro' ? 'bg-violet-500/20 text-violet-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {ll.subscriptionTier || 'free'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-300">{ll.properties}</TableCell>
                    <TableCell className="text-center text-slate-300">{ll.units}</TableCell>
                    <TableCell className="text-center text-slate-300">{ll.tenants}</TableCell>
                    <TableCell className="text-right text-white font-medium">{formatCurrency(ll.rentCollected)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top States</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">State</TableHead>
                  <TableHead className="text-right text-slate-400">Properties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(insights?.locations.states || []).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
                ) : (insights?.locations.states || []).map((loc) => (
                  <TableRow key={`${loc.state}-${loc.count}`} className="border-white/5">
                    <TableCell className="text-white">{loc.state || "Unknown"}</TableCell>
                    <TableCell className="text-right text-slate-300">{loc.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Top Cities</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">City</TableHead>
                  <TableHead className="text-right text-slate-400">Properties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(insights?.locations.cities || []).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
                ) : (insights?.locations.cities || []).map((loc) => (
                  <TableRow key={`${loc.city}-${loc.count}`} className="border-white/5">
                    <TableCell className="text-white">{loc.city || "Unknown"}</TableCell>
                    <TableCell className="text-right text-slate-300">{loc.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Revenue Timeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Revenue Timeline</h2>
        <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden max-w-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">Month</TableHead>
                <TableHead className="text-right text-slate-400">Total Rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(insights?.revenueTimeline || []).length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-slate-500">No data.</TableCell></TableRow>
              ) : (insights?.revenueTimeline || []).map((item) => (
                <TableRow key={item.month} className="border-white/5">
                  <TableCell className="font-mono text-xs text-white">{item.month}</TableCell>
                  <TableCell className="text-right text-white font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );


  // Health Content
  const healthContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">System Health</h1>
        <p className="text-sm text-slate-400">Monitor platform health, Stripe Connect, and maintenance</p>
      </div>

      {/* MRR & Revenue */}
      {insights && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Revenue Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Monthly Recurring Revenue" value={formatCurrency(insights.mrr || 0)} variant="success" />
            <StatCard label="Platform Revenue (Month)" value={formatCurrency(insights.platformRevenue?.total.month || 0)} />
            <StatCard label="Convenience Fees (Month)" value={formatCurrency(insights.platformRevenue?.convenienceFees.month || 0)} />
            <StatCard label="Cashout Fees (Month)" value={formatCurrency(insights.platformRevenue?.cashoutFees.month || 0)} />
          </div>
        </div>
      )}

      {/* Recent Signups */}
      {insights?.recentSignups && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="New Users (7 days)" value={formatNumber(insights.recentSignups.usersThisWeek)} />
            <StatCard label="New Users (30 days)" value={formatNumber(insights.recentSignups.usersThisMonth)} />
            <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-4">
              <p className="text-xs text-violet-400 mb-1">New Landlords (7 days)</p>
              <p className="text-2xl font-bold text-violet-300">{formatNumber(insights.recentSignups.landlordsThisWeek)}</p>
            </div>
            <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-4">
              <p className="text-xs text-violet-400 mb-1">New Landlords (30 days)</p>
              <p className="text-2xl font-bold text-violet-300">{formatNumber(insights.recentSignups.landlordsThisMonth)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect Status */}
      {insights?.stripeConnectStatus && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Stripe Connect Onboarding</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Completed" value={formatNumber(insights.stripeConnectStatus.completed)} variant="success" />
            <StatCard label="Pending Verification" value={formatNumber(insights.stripeConnectStatus.pendingVerification)} variant="warning" />
            <div className="rounded-xl bg-blue-950/50 border border-blue-800/50 p-4">
              <p className="text-xs text-blue-400 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-300">{formatNumber(insights.stripeConnectStatus.pending)}</p>
            </div>
            <StatCard label="Not Started" value={formatNumber(insights.stripeConnectStatus.notStarted)} />
          </div>
        </div>
      )}

      {/* Payment Health */}
      {insights?.systemHealth && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Payment Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              label="Failed Payments (30 days)" 
              value={formatNumber(insights.systemHealth.failedPaymentsLast30Days)} 
              variant={insights.systemHealth.failedPaymentsLast30Days > 0 ? "danger" : "default"} 
            />
            <StatCard 
              label="Overdue Payments" 
              value={formatNumber(insights.systemHealth.overduePayments)} 
              variant={insights.systemHealth.overduePayments > 0 ? "warning" : "default"} 
            />
            <StatCard label="Collection Rate" value={`${(insights.collectionRate * 100).toFixed(1)}%`} />
          </div>
        </div>
      )}

      {/* Maintenance Tickets */}
      {insights?.maintenanceSummary && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Maintenance Tickets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard 
              label="Urgent" 
              value={formatNumber(insights.maintenanceSummary.urgent)} 
              variant={insights.maintenanceSummary.urgent > 0 ? "danger" : "default"} 
            />
            <StatCard 
              label="High Priority" 
              value={formatNumber(insights.maintenanceSummary.high)} 
              variant={insights.maintenanceSummary.high > 0 ? "warning" : "default"} 
            />
            <StatCard label="Open" value={formatNumber(insights.maintenanceSummary.open)} />
            <StatCard label="In Progress" value={formatNumber(insights.maintenanceSummary.inProgress)} />
            <StatCard label="Resolved" value={formatNumber(insights.maintenanceSummary.resolved)} />
            <StatCard label="Closed" value={formatNumber(insights.maintenanceSummary.closed)} />
            <StatCard label="Total" value={formatNumber(insights.maintenanceSummary.total)} />
          </div>
        </div>
      )}

      {/* Recent Payouts */}
      {insights?.recentPayouts && insights.recentPayouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Recent Payouts</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-400">Landlord</TableHead>
                  <TableHead className="text-slate-400">Amount</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Initiated</TableHead>
                  <TableHead className="text-slate-400">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.recentPayouts.map((payout) => (
                  <TableRow key={payout.id} className="border-white/5">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{payout.landlordName}</p>
                        <p className="text-xs text-slate-400">{payout.landlordSubdomain}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-medium">{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        payout.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        payout.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        payout.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {payout.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{formatDateTime(new Date(payout.initiatedAt)).dateTime}</TableCell>
                    <TableCell className="text-slate-300 text-sm">{payout.paidAt ? formatDateTime(new Date(payout.paidAt)).dateTime : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Subscription Tiers */}
      {insights?.subscriptionBreakdown && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Subscription Tiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-950/50 border border-slate-800/50 p-4">
              <p className="text-xs text-slate-400 mb-1">Starter ($39/mo)</p>
              <p className="text-2xl font-bold text-slate-300">{formatNumber(insights.subscriptionBreakdown.starter ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-4">
              <p className="text-xs text-violet-400 mb-1">Pro ($99/mo)</p>
              <p className="text-2xl font-bold text-violet-300">{formatNumber(insights.subscriptionBreakdown.pro)}</p>
            </div>
            <div className="rounded-xl bg-amber-950/50 border border-amber-800/50 p-4">
              <p className="text-xs text-amber-400 mb-1">Enterprise ($199/mo)</p>
              <p className="text-2xl font-bold text-amber-300">{formatNumber(insights.subscriptionBreakdown.enterprise)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Management Content
  const managementContent = (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-sm text-slate-400">Manage users, landlords, and tenants</p>
      </div>
      <UserManagement landlords={landlords || []} />
    </div>
  );

  // Tiers Content
  const tiersContent = (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Tier Testing</h1>
        <p className="text-sm text-slate-400">Manually set subscription tiers for testing</p>
      </div>
      <TierManager />
    </div>
  );

  // Properties Content
  const propertiesContent = <PropertyManagement />;

  // Contractors Content
  const contractorsContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Contractors</h1>
        <p className="text-sm text-slate-400">Platform-wide contractor overview</p>
      </div>

      {/* Summary Stats */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Contractors" value={formatNumber(insights?.contractorStats?.total ?? 0)} variant="gradient" />
          <StatCard label="Total Jobs Processed" value={formatNumber(insights?.contractorStats?.totalJobs ?? 0)} />
          <StatCard label="New This Week" value={formatNumber(insights?.contractorStats?.newThisWeek ?? 0)} />
          <StatCard label="New This Month" value={formatNumber(insights?.contractorStats?.newThisMonth ?? 0)} />
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Subscription Tiers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-950/50 border border-slate-800/50 p-5">
            <p className="text-xs text-slate-400 mb-1">Starter</p>
            <p className="text-3xl font-bold text-slate-300">{formatNumber(insights?.contractorStats?.subscriptionBreakdown.starter ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Free tier</p>
          </div>
          <div className="rounded-xl bg-violet-950/50 border border-violet-800/50 p-5">
            <p className="text-xs text-violet-400 mb-1">Pro</p>
            <p className="text-3xl font-bold text-violet-300">{formatNumber(insights?.contractorStats?.subscriptionBreakdown.pro ?? 0)}</p>
            <p className="text-xs text-violet-500/70 mt-1">Paid plan</p>
          </div>
          <div className="rounded-xl bg-amber-950/50 border border-amber-800/50 p-5">
            <p className="text-xs text-amber-400 mb-1">Enterprise</p>
            <p className="text-3xl font-bold text-amber-300">{formatNumber(insights?.contractorStats?.subscriptionBreakdown.enterprise ?? 0)}</p>
            <p className="text-xs text-amber-500/70 mt-1">Top tier</p>
          </div>
        </div>
      </div>

      {/* MRR Attribution */}
      {insights?.contractorStats && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Growth Trend</h2>
          <div className="rounded-xl bg-slate-900/60 border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">New contractors this week</span>
              <span className="text-sm font-bold text-white">{insights.contractorStats.newThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">New contractors this month</span>
              <span className="text-sm font-bold text-white">{insights.contractorStats.newThisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total jobs on platform</span>
              <span className="text-sm font-bold text-white">{formatNumber(insights.contractorStats.totalJobs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Avg jobs per contractor</span>
              <span className="text-sm font-bold text-white">
                {insights.contractorStats.total > 0
                  ? (insights.contractorStats.totalJobs / insights.contractorStats.total).toFixed(1)
                  : '0.0'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  let content = overviewContent;
  if (activeView === "health") content = healthContent;
  else if (activeView === "traffic") content = trafficContent;
  else if (activeView === "engagement") content = engagementContent;
  else if (activeView === "users") content = usersContent;
  else if (activeView === "portfolio") content = portfolioContent;
  else if (activeView === "contractors") content = contractorsContent;
  else if (activeView === "properties") content = propertiesContent;
  else if (activeView === "management") content = managementContent;
  else if (activeView === "tiers") content = tiersContent;


  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-blue-700 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Super Admin</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/10 text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-0 left-0 right-0 bg-blue-700 border-b border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h1 className="text-lg font-semibold text-white">Super Admin</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-white/10 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-1">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => { setActiveView(view.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                      activeView === view.id
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {view.label}
                  </button>
                );
              })}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <p className="text-[10px] text-white/40 px-3 pt-1 uppercase tracking-widest font-semibold">External Pages</p>
                {externalViews.map((ev) => {
                  const Icon = ev.icon;
                  return (
                    <Link
                      key={ev.id}
                      href={ev.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      <Icon className="h-4 w-4" />
                      {ev.label}
                      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                    </Link>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={handleClearStatistics}
                  disabled={isClearingStats}
                  className="w-full px-3 py-2.5 rounded-lg bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
                >
                  {isClearingStats ? "Clearing..." : "Clear All Statistics"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-blue-700 border-r border-white/10 p-4 sticky top-0">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Super Admin</h1>
            <p className="text-xs text-white/60 mt-1">Platform Management</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    activeView === view.id
                      ? "bg-white/20 text-white font-medium"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {view.label}
                </button>
              );
            })}

            <div className="pt-3 border-t border-white/10 space-y-1 mt-2">
              <p className="text-[10px] text-white/40 px-3 pt-1 pb-0.5 uppercase tracking-widest font-semibold">External Pages</p>
              {externalViews.map((ev) => {
                const Icon = ev.icon;
                return (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                  >
                    <Icon className="h-4 w-4" />
                    {ev.label}
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <button
              onClick={handleClearStatistics}
              disabled={isClearingStats}
              className="w-full px-3 py-2.5 rounded-lg bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition"
            >
              {isClearingStats ? "Clearing..." : "Clear All Statistics"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-blue-700 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {content}
          </div>
        </main>
      </div>

      {/* Landlord Detail Modal */}
      <LandlordDetailModal
        landlordId={selectedLandlordId}
        isOpen={!!selectedLandlordId}
        onClose={() => setSelectedLandlordId(null)}
      />
    </div>
  );
};

export default SuperAdminDashboard;
