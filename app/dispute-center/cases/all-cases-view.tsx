"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  Scale,
  Search,
  Eye,
  MessageSquare,
  FileText,
  Download,
  Filter,
  ArrowUpDown,
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

interface AllCasesViewProps {
  disputes: DisputeRow[];
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

export default function AllCasesView({ disputes }: AllCasesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const filteredDisputes = useMemo(() => {
    let result = disputes.filter((d) => {
      const matchesSearch = !searchQuery || 
        d.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.landlord?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.filedBy?.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || d.priority === priorityFilter;
      const matchesType = typeFilter === "all" || d.type === typeFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
        case "amount":
          return (b.disputedAmount || 0) - (a.disputedAmount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [disputes, searchQuery, statusFilter, priorityFilter, typeFilter, sortBy]);

  const exportToCSV = () => {
    const headers = ["Case #", "Title", "Type", "Status", "Priority", "Amount", "Landlord", "Filed By", "Date"];
    const rows = filteredDisputes.map(d => [
      d.caseNumber,
      d.title,
      d.type,
      d.status,
      d.priority,
      d.disputedAmount || "",
      d.landlord?.name || "",
      d.filedBy?.email || "",
      new Date(d.createdAt).toLocaleDateString(),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disputes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scale className="h-7 w-7 text-amber-400" />
            All Dispute Cases
          </h1>
          <p className="text-slate-400 mt-1">{filteredDisputes.length} cases found</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="border-slate-700 text-slate-300">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by case #, title, landlord, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-slate-900/50 border-slate-700 text-white">
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
              <SelectTrigger className="w-36 bg-slate-900/50 border-slate-700 text-white">
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
              <SelectTrigger className="w-36 bg-slate-900/50 border-slate-700 text-white">
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 bg-slate-900/50 border-slate-700 text-white">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
                <SelectItem value="amount">By Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
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
                <TableHead className="text-slate-400">Assigned To</TableHead>
                <TableHead className="text-slate-400">Filed</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-slate-500 py-12">
                    No disputes found matching your criteria
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
                    <TableCell className="text-slate-300 text-sm">
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
                    <TableCell className="text-slate-300 text-sm">
                      {dispute.landlord?.name || "-"}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {dispute.assignedTo?.name || <span className="text-slate-500">Unassigned</span>}
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
