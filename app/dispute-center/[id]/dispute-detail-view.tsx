"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "next-auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateDisputeStatus,
  assignDispute,
  resolveDispute,
  escalateDispute,
  addDisputeMessage,
  addDisputeEvidence,
} from "@/lib/actions/dispute.actions";
import { useToast } from "@/hooks/use-toast";
import {
  Scale,
  ArrowLeft,
  Clock,
  User,
  Building2,
  DollarSign,
  MessageSquare,
  FileText,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Shield,
  Calendar,
  Eye,
  Lock,
} from "lucide-react";

type DisputeDetail = {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: string;
  priority: string;
  disputedAmount: number | null;
  resolvedAmount: number | null;
  desiredResolution: string | null;
  resolution: string | null;
  resolutionType: string | null;
  responseDeadline: string | null;
  resolutionDeadline: string | null;
  createdAt: string;
  resolvedAt: string | null;
  landlord: { id: string; name: string; subdomain: string; companyEmail: string | null; companyPhone: string | null } | null;
  filedBy: { id: string; name: string; email: string; phoneNumber: string | null } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  resolvedBy: { id: string; name: string; email: string } | null;
  messages: Array<{
    id: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
    sender: { id: string; name: string; email: string };
    senderRole: string;
  }>;
  evidence: Array<{
    id: string;
    type: string;
    url: string;
    fileName: string | null;
    description: string | null;
    category: string | null;
    createdAt: string;
    uploadedBy: { id: string; name: string };
  }>;
  timeline: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    performedBy: { id: string; name: string };
  }>;
};

type Admin = { id: string; name: string; email: string; role: string };

interface DisputeDetailViewProps {
  dispute: DisputeDetail;
  admins: Admin[];
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

const resolutionTypes = [
  { value: "refund_full", label: "Full Refund" },
  { value: "refund_partial", label: "Partial Refund" },
  { value: "work_redo", label: "Work to be Redone" },
  { value: "mediated_agreement", label: "Mediated Agreement" },
  { value: "dismissed", label: "Dismissed" },
  { value: "other", label: "Other" },
];


export default function DisputeDetailView({
  dispute,
  admins,
  currentUser,
}: DisputeDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const [resolveData, setResolveData] = useState({
    resolution: "",
    resolutionType: "",
    resolvedAmount: "",
  });
  const [escalateReason, setEscalateReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const isResolved = dispute.status === "resolved" || dispute.status === "closed";
  const isOverdue = dispute.responseDeadline && new Date(dispute.responseDeadline) < new Date() && !isResolved;

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateDisputeStatus({ id: dispute.id, status: newStatus });
      if (result.success) {
        toast({ description: "Status updated successfully" });
        router.refresh();
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  const handleAssign = () => {
    if (!assigneeId) return;
    startTransition(async () => {
      const result = await assignDispute({ id: dispute.id, assignedToId: assigneeId });
      if (result.success) {
        toast({ description: "Dispute assigned successfully" });
        setShowAssignDialog(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  const handleResolve = () => {
    if (!resolveData.resolution || !resolveData.resolutionType) {
      toast({ variant: "destructive", description: "Please fill in resolution details" });
      return;
    }
    startTransition(async () => {
      const result = await resolveDispute({
        id: dispute.id,
        resolution: resolveData.resolution,
        resolutionType: resolveData.resolutionType,
        resolvedAmount: resolveData.resolvedAmount ? parseFloat(resolveData.resolvedAmount) : undefined,
      });
      if (result.success) {
        toast({ description: "Dispute resolved successfully" });
        setShowResolveDialog(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  const handleEscalate = () => {
    if (!escalateReason) {
      toast({ variant: "destructive", description: "Please provide escalation reason" });
      return;
    }
    startTransition(async () => {
      const result = await escalateDispute({ id: dispute.id, reason: escalateReason });
      if (result.success) {
        toast({ description: "Dispute escalated successfully" });
        setShowEscalateDialog(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    startTransition(async () => {
      const result = await addDisputeMessage({
        disputeId: dispute.id,
        message: newMessage,
        isInternal: isInternalNote,
      });
      if (result.success) {
        toast({ description: isInternalNote ? "Internal note added" : "Message sent" });
        setNewMessage("");
        router.refresh();
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dispute-center">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{dispute.caseNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm border capitalize ${statusColors[dispute.status]}`}>
                {dispute.status.replace("_", " ")}
              </span>
              <span className={`px-2 py-1 rounded text-xs capitalize ${priorityColors[dispute.priority]}`}>
                {dispute.priority}
              </span>
              {isOverdue && (
                <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>
            <h2 className="text-lg text-slate-300">{dispute.title}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {typeLabels[dispute.type]} • Filed {formatDateTime(new Date(dispute.createdAt)).dateTime}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isResolved && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                  <User className="h-4 w-4 mr-2" />
                  {dispute.assignedTo ? "Reassign" : "Assign"}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Assign Dispute</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {admins.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-white">
                          {a.name} ({a.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={isPending || !assigneeId} className="w-full bg-amber-500 hover:bg-amber-600">
                    {isPending ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-red-700 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Escalate Dispute</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Textarea
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Reason for escalation..."
                    className="bg-slate-900 border-slate-700 text-white"
                    rows={4}
                  />
                  <Button onClick={handleEscalate} disabled={isPending} className="w-full bg-red-500 hover:bg-red-600">
                    {isPending ? "Escalating..." : "Escalate to Urgent"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Resolve Dispute</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Resolution Type</Label>
                    <Select value={resolveData.resolutionType} onValueChange={(v) => setResolveData({ ...resolveData, resolutionType: v })}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select resolution type..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {resolutionTypes.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-white">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {dispute.disputedAmount && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Resolved Amount</Label>
                      <Input
                        type="number"
                        value={resolveData.resolvedAmount}
                        onChange={(e) => setResolveData({ ...resolveData, resolvedAmount: e.target.value })}
                        placeholder="0.00"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Resolution Details</Label>
                    <Textarea
                      value={resolveData.resolution}
                      onChange={(e) => setResolveData({ ...resolveData, resolution: e.target.value })}
                      placeholder="Describe the resolution..."
                      className="bg-slate-900 border-slate-700 text-white"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleResolve} disabled={isPending} className="w-full bg-emerald-500 hover:bg-emerald-600">
                    {isPending ? "Resolving..." : "Mark as Resolved"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details & Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
            <p className="text-slate-300 whitespace-pre-wrap">{dispute.description}</p>
            
            {dispute.desiredResolution && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Desired Resolution</h4>
                <p className="text-slate-300">{dispute.desiredResolution}</p>
              </div>
            )}

            {dispute.resolution && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 bg-emerald-950/30 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
                <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resolution
                </h4>
                <p className="text-slate-300">{dispute.resolution}</p>
                {dispute.resolvedAmount && (
                  <p className="text-sm text-slate-400 mt-2">
                    Resolved Amount: {formatCurrency(dispute.resolvedAmount)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              Messages ({dispute.messages.length})
            </h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {dispute.messages.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No messages yet</p>
              ) : (
                dispute.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.isInternal
                        ? "bg-amber-950/30 border border-amber-500/30"
                        : "bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{msg.sender.name}</span>
                        <span className="text-xs text-slate-500 capitalize">({msg.senderRole})</span>
                        {msg.isInternal && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(new Date(msg.createdAt)).dateTime}
                      </span>
                    </div>
                    <p className="text-slate-300">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* New Message */}
            {!isResolved && (
              <div className="border-t border-slate-700/50 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    Internal note (not visible to parties)
                  </label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternalNote ? "Add internal note..." : "Type your message..."}
                    className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isPending || !newMessage.trim()}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Evidence */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Evidence ({dispute.evidence.length})
            </h3>
            
            {dispute.evidence.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No evidence uploaded</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dispute.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                  >
                    <div className="p-2 rounded bg-slate-800">
                      {ev.type === "image" ? (
                        <Eye className="h-4 w-4 text-slate-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ev.fileName || ev.type}</p>
                      <p className="text-xs text-slate-500">
                        {ev.uploadedBy.name} • {formatDateTime(new Date(ev.createdAt)).dateOnly}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Right Column - Info & Timeline */}
        <div className="space-y-6">
          {/* Parties */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Parties Involved</h3>
            
            <div className="space-y-4">
              {dispute.landlord && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-700/50">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Landlord</p>
                    <p className="text-white font-medium">{dispute.landlord.name}</p>
                    <p className="text-sm text-slate-400">{dispute.landlord.subdomain}</p>
                    {dispute.landlord.companyEmail && (
                      <p className="text-xs text-slate-500">{dispute.landlord.companyEmail}</p>
                    )}
                  </div>
                </div>
              )}

              {dispute.filedBy && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-700/50">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Filed By</p>
                    <p className="text-white font-medium">{dispute.filedBy.name}</p>
                    <p className="text-sm text-slate-400">{dispute.filedBy.email}</p>
                  </div>
                </div>
              )}

              {dispute.assignedTo && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-amber-500/20">
                    <Shield className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned To</p>
                    <p className="text-white font-medium">{dispute.assignedTo.name}</p>
                    <p className="text-sm text-slate-400">{dispute.assignedTo.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial */}
          {dispute.disputedAmount && (
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-400" />
                Financial Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Disputed Amount</span>
                  <span className="text-white font-medium">{formatCurrency(dispute.disputedAmount)}</span>
                </div>
                {dispute.resolvedAmount && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolved Amount</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(dispute.resolvedAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deadlines */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              Deadlines
            </h3>
            
            <div className="space-y-3">
              {dispute.responseDeadline && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Response Due</span>
                  <span className={`text-sm ${isOverdue ? "text-red-400" : "text-white"}`}>
                    {formatDateTime(new Date(dispute.responseDeadline)).dateOnly}
                  </span>
                </div>
              )}
              {dispute.resolutionDeadline && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resolution Due</span>
                  <span className="text-sm text-white">
                    {formatDateTime(new Date(dispute.resolutionDeadline)).dateOnly}
                  </span>
                </div>
              )}
              {dispute.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resolved On</span>
                  <span className="text-sm text-emerald-400">
                    {formatDateTime(new Date(dispute.resolvedAt)).dateOnly}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Activity Timeline
            </h3>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {dispute.timeline.map((event, idx) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    {idx < dispute.timeline.length - 1 && (
                      <div className="w-px h-full bg-slate-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm text-white">{event.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {event.performedBy.name} • {formatDateTime(new Date(event.createdAt)).dateTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
