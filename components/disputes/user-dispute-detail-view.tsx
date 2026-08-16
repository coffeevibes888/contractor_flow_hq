"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDisputeMessage } from "@/lib/actions/dispute.actions";
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
  CheckCircle,
  Calendar,
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
  createdAt: string;
  resolvedAt: string | null;
  landlord: { id: string; name: string; subdomain: string } | null;
  filedBy: { id: string; name: string; email: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
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

interface UserDisputeDetailViewProps {
  dispute: DisputeDetail;
  backUrl: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  mediation: "bg-purple-100 text-purple-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

const typeLabels: Record<string, string> = {
  payment: "💰 Payment",
  quality: "⭐ Quality",
  timeline: "⏰ Timeline",
  scope: "📋 Scope",
  communication: "💬 Communication",
  other: "📌 Other",
};

export default function UserDisputeDetailView({ dispute, backUrl }: UserDisputeDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [newMessage, setNewMessage] = useState("");

  const isResolved = dispute.status === "resolved" || dispute.status === "closed";

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    startTransition(async () => {
      const result = await addDisputeMessage({
        disputeId: dispute.id,
        message: newMessage,
        isInternal: false,
      });
      if (result.success) {
        toast({ description: "Message sent" });
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
      <div className="flex items-start gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-lg text-amber-600">{dispute.caseNumber}</span>
            <Badge className={statusColors[dispute.status]}>
              {dispute.status.replace("_", " ")}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{dispute.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {typeLabels[dispute.type]} • Filed {formatDateTime(new Date(dispute.createdAt)).dateOnly}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{dispute.description}</p>
              
              {dispute.desiredResolution && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Desired Resolution</h4>
                  <p className="text-slate-700">{dispute.desiredResolution}</p>
                </div>
              )}

              {dispute.resolution && (
                <div className="mt-4 pt-4 border-t bg-emerald-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                  <h4 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolution
                  </h4>
                  <p className="text-slate-700">{dispute.resolution}</p>
                  {dispute.resolvedAmount && (
                    <p className="text-sm text-slate-500 mt-2">
                      Resolved Amount: {formatCurrency(dispute.resolvedAmount)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                Messages ({dispute.messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {dispute.messages.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No messages yet</p>
                ) : (
                  dispute.messages.filter(m => !m.isInternal).map((msg) => (
                    <div key={msg.id} className="p-4 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{msg.sender.name}</span>
                          <span className="text-xs text-slate-500 capitalize">({msg.senderRole})</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(new Date(msg.createdAt)).dateTime}
                        </span>
                      </div>
                      <p className="text-slate-700">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* New Message */}
              {!isResolved && (
                <div className="border-t pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={2}
                      className="flex-1"
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
            </CardContent>
          </Card>

          {/* Evidence */}
          {dispute.evidence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  Evidence ({dispute.evidence.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {dispute.evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 truncate">{ev.fileName || ev.type}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(new Date(ev.createdAt)).dateOnly}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dispute.landlord && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Property Manager</p>
                    <p className="font-medium text-slate-900">{dispute.landlord.name}</p>
                  </div>
                </div>
              )}

              {dispute.assignedTo && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Case Handler</p>
                    <p className="font-medium text-slate-900">{dispute.assignedTo.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial */}
          {dispute.disputedAmount && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                  Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(dispute.disputedAmount)}
                </p>
                {dispute.resolvedAmount && (
                  <p className="text-sm text-emerald-600 mt-1">
                    Resolved: {formatCurrency(dispute.resolvedAmount)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {dispute.timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      {idx < dispute.timeline.length - 1 && (
                        <div className="w-px h-full bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm text-slate-700">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDateTime(new Date(event.createdAt)).dateTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
