"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Scale,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  MessageSquare,
  FileText,
  Users,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Shield,
} from "lucide-react";

type DisputeRow = {
  id: string;
  caseNumber: string;
  title: string;
  type: string;
  category: string;
  status: string;
  priority: string;
  disputedAmount: number | null;
  createdAt: string;
  responseDeadline: string | null;
  landlord: { id: string; name: string; subdomain: string } | null;
  filedBy: { id: string; name: string; email: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { messages: number; evidence: number };
};

type DisputeStats = {
  totalDisputes: number;
  openDisputes: number;
  resolvedThisMonth: number;
  resolutionRate: number;
  avgResolutionDays: number;
  overdueDisputes: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  recentDisputes: any[];
};

interface DisputeCenterDashboardProps {
  disputes: DisputeRow[];
  stats: DisputeStats | null;
  currentUser?: Session["user"];
}

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  under_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  mediation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  escalated: "bg-red-500/20 text-red-400 border-red-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-amber-500/20 text-amber-400",
  urgent: "bg-red-500/20 text-red-400",
};

const typeLabels: Record<string, string> = {
  payment: "💰 Payment",
  quality: "⭐ Quality",
  timeline: "⏰ Timeline",
  scope: "📋 Scope",
  communication: "💬 Communication",
  other: "📌 Other",
};

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  variant = "default" 
}: { 
  label: string; 
  value: string | number; 
  icon: any;
  trend?: string;
  variant?: "default" | "gradient" | "success" | "warning" | "danger";
}) {
  const variantClasses = {
    default: "bg-slate-800/50 border-slate-700/50",
    gradient: "bg-gradient-to-br from-amber-600/20 via-orange-600/20 to-red-600/20 border-amber-500/30",
    success: "bg-emerald-950/50 border-emerald-800/50",
    warning: "bg-amber-950/50 border-amber-800/50",
    danger: "bg-red-950/50 border-red-800/50",
  };

  return (
    <div className={`rounded-xl border p-5 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${variant === "gradient" ? "bg-amber-500/20" : "bg-slate-700/50"}`}>
          <Icon className={`h-5 w-5 ${variant === "gradient" ? "text-amber-400" : "text-slate-400"}`} />
        </div>
        {trend && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}


export default function DisputeCenterDashboard({
  disputes,
  stats,
  currentUser,
}: DisputeCenterDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const matchesSearch = !searchQuery || 
        d.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.landlord?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || d.priority === priorityFilter;
      const matchesType = typeFilter === "all" || d.type === typeFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [disputes, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const openCases = disputes.filter(d => ["open", "under_review", "mediation", "escalated"].includes(d.status));
  const urgentCases = disputes.filter(d => d.priority === "urgent" && d.status !== "resolved" && d.status !== "closed");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scale className="h-8 w-8 text-amber-400" />
            Dispute Resolution Center
          </h1>
          <p className="text-slate-400 mt-1">Manage and resolve contractor marketplace disputes</p>
        </div>
        <Link href="/dispute-center/new">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Dispute
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard 
            label="Total Disputes" 
            value={stats.totalDisputes} 
            icon={Scale}
            variant="gradient"
          />
          <StatCard 
            label="Open Cases" 
            value={stats.openDisputes} 
            icon={AlertTriangle}
            variant={stats.openDisputes > 10 ? "warning" : "default"}
          />
          <StatCard 
            label="Resolved This Month" 
            value={stats.resolvedThisMonth} 
            icon={CheckCircle}
            variant="success"
          />
          <StatCard 
            label="Resolution Rate" 
            value={`${stats.resolutionRate}%`} 
            icon={TrendingUp}
          />
          <StatCard 
            label="Avg Resolution" 
            value={`${stats.avgResolutionDays} days`} 
            icon={Clock}
          />
          <StatCard 
            label="Overdue" 
            value={stats.overdueDisputes} 
            icon={AlertTriangle}
            variant={stats.overdueDisputes > 0 ? "danger" : "default"}
          />
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Urgent Cases */}
        <div className="rounded-xl bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Urgent Cases
            </h3>
            <span className="text-2xl font-bold text-white">{urgentCases.length}</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {urgentCases.slice(0, 3).map((d) => (
              <Link key={d.id} href={`/dispute-center/${d.id}`} className="block">
                <div className="text-sm text-slate-300 hover:text-white transition-colors truncate">
                  {d.caseNumber} - {d.title}
                </div>
              </Link>
            ))}
            {urgentCases.length === 0 && (
              <p className="text-sm text-slate-500">No urgent cases</p>
            )}
          </div>
        </div>

        {/* By Status */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            By Status
          </h3>
          <div className="space-y-2">
            {stats && Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs capitalize ${statusColors[status] || "bg-slate-700"}`}>
                  {status.replace("_", " ")}
                </span>
                <span className="text-sm text-slate-300">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            By Type
          </h3>
          <div className="space-y-2">
            {stats && Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{typeLabels[type] || type}</span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Filters */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by case number, title, or landlord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-900/50 border-slate-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="mediation">Mediation</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-900/50 border-slate-700 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-900/50 border-slate-700 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="scope">Scope</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">
            All Disputes ({filteredDisputes.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-transparent">
                <TableHead className="text-slate-400">Case #</TableHead>
                <TableHead className="text-slate-400">Title</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Priority</TableHead>
                <TableHead className="text-slate-400">Amount</TableHead>
                <TableHead className="text-slate-400">Landlord</TableHead>
                <TableHead className="text-slate-400">Filed</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                    No disputes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisputes.map((dispute) => (
                  <TableRow key={dispute.id} className="border-slate-700/50 hover:bg-slate-700/20">
                    <TableCell className="font-mono text-sm text-amber-400">
                      {dispute.caseNumber}
                    </TableCell>
                    <TableCell className="text-white max-w-[200px] truncate">
                      {dispute.title}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {typeLabels[dispute.type] || dispute.type}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs border capitalize ${statusColors[dispute.status]}`}>
                        {dispute.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${priorityColors[dispute.priority]}`}>
                        {dispute.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-white">
                      {dispute.disputedAmount ? formatCurrency(dispute.disputedAmount) : "-"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {dispute.landlord?.name || "-"}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {formatDateTime(new Date(dispute.createdAt)).dateOnly}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dispute-center/${dispute.id}`}>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {dispute._count.messages}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {dispute._count.evidence}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
