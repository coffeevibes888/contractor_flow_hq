"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createDispute } from "@/lib/actions/dispute.actions";
import { useToast } from "@/hooks/use-toast";
import { Scale, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Landlord = {
  id: string;
  name: string;
  subdomain: string;
  companyEmail: string | null;
};

interface NewDisputeFormProps {
  landlords: Landlord[];
}

const disputeTypes = [
  { value: "payment", label: "💰 Payment Issue", description: "Non-payment, late payment, or payment disputes" },
  { value: "quality", label: "⭐ Quality of Work", description: "Work not meeting standards or expectations" },
  { value: "timeline", label: "⏰ Timeline Issue", description: "Delays, missed deadlines, or scheduling problems" },
  { value: "scope", label: "📋 Scope Dispute", description: "Disagreement about work scope or deliverables" },
  { value: "communication", label: "💬 Communication", description: "Lack of communication or responsiveness" },
  { value: "other", label: "📌 Other", description: "Other issues not covered above" },
];

const disputeCategories = [
  { value: "work_not_completed", label: "Work Not Completed" },
  { value: "poor_quality", label: "Poor Quality Work" },
  { value: "overcharge", label: "Overcharge / Billing Issue" },
  { value: "damage", label: "Property Damage" },
  { value: "no_show", label: "No Show / Abandonment" },
  { value: "contract_breach", label: "Contract Breach" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low", description: "Non-urgent, can wait", color: "text-slate-400" },
  { value: "medium", label: "Medium", description: "Standard priority", color: "text-blue-400" },
  { value: "high", label: "High", description: "Needs attention soon", color: "text-amber-400" },
  { value: "urgent", label: "Urgent", description: "Immediate attention required", color: "text-red-400" },
];

export default function NewDisputeForm({ landlords }: NewDisputeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    landlordId: "",
    type: "",
    category: "",
    priority: "medium",
    title: "",
    description: "",
    desiredResolution: "",
    disputedAmount: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.landlordId || !formData.type || !formData.category || !formData.title || !formData.description) {
      toast({ variant: "destructive", description: "Please fill in all required fields" });
      return;
    }

    startTransition(async () => {
      const result = await createDispute({
        landlordId: formData.landlordId,
        type: formData.type,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        desiredResolution: formData.desiredResolution || undefined,
        disputedAmount: formData.disputedAmount ? parseFloat(formData.disputedAmount) : undefined,
      });

      if (result.success) {
        toast({ description: `Dispute ${result.caseNumber} created successfully` });
        router.push(`/dispute-center/${result.disputeId}`);
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dispute-center">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scale className="h-7 w-7 text-amber-400" />
            File New Dispute
          </h1>
          <p className="text-slate-400 mt-1">Create a new dispute case for resolution</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Landlord Selection */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Parties Involved</h2>
          
          <div className="space-y-2">
            <Label className="text-slate-300">Landlord / Property Manager *</Label>
            <Select value={formData.landlordId} onValueChange={(v) => setFormData({ ...formData, landlordId: v })}>
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                <SelectValue placeholder="Select landlord..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                {landlords.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-white">
                    {l.name} ({l.subdomain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dispute Type & Category */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Dispute Classification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Dispute Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {disputeTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-white">
                      <div>
                        <div>{t.label}</div>
                        <div className="text-xs text-slate-400">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {disputeCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-white">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Priority</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p.value })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.priority === p.value
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
                  }`}
                >
                  <div className={`font-medium ${p.color}`}>{p.label}</div>
                  <div className="text-xs text-slate-500">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Dispute Details */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Dispute Details</h2>
          
          <div className="space-y-2">
            <Label className="text-slate-300">Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of the dispute..."
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about the dispute, including timeline of events, parties involved, and any relevant context..."
              rows={6}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Disputed Amount (if applicable)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.disputedAmount}
                onChange={(e) => setFormData({ ...formData, disputedAmount: e.target.value })}
                placeholder="0.00"
                className="pl-8 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Desired Resolution</Label>
            <Textarea
              value={formData.desiredResolution}
              onChange={(e) => setFormData({ ...formData, desiredResolution: e.target.value })}
              placeholder="What outcome would resolve this dispute? (e.g., full refund, partial refund, work completion, etc.)"
              rows={3}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl bg-amber-950/30 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-medium">Before filing a dispute:</p>
            <ul className="mt-1 text-amber-300/80 list-disc list-inside space-y-1">
              <li>Ensure you have attempted to resolve the issue directly with the other party</li>
              <li>Gather all relevant documentation, contracts, and communication records</li>
              <li>Be prepared to provide evidence supporting your claim</li>
            </ul>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dispute-center">
            <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {isPending ? "Creating..." : "Create Dispute"}
          </Button>
        </div>
      </form>
    </div>
  );
}
