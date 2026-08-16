"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileWorkOrderDispute } from "@/lib/actions/dispute.actions";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Scale, ArrowLeft, AlertTriangle, Building2 } from "lucide-react";

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  agreedPrice: string | null;
  landlord: { id: string; name: string };
  property: { name: string };
};

interface FileDisputeFormProps {
  workOrders: WorkOrder[];
  userRole: "contractor" | "homeowner" | "landlord";
  backUrl: string;
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
  { value: "non_payment", label: "Non-Payment" },
  { value: "other", label: "Other" },
];

export default function FileDisputeForm({ workOrders, userRole, backUrl }: FileDisputeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    workOrderId: "",
    type: "",
    category: "",
    title: "",
    description: "",
    desiredResolution: "",
    disputedAmount: "",
  });

  const selectedWorkOrder = workOrders.find(wo => wo.id === formData.workOrderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.workOrderId || !formData.type || !formData.category || !formData.description) {
      toast({ variant: "destructive", description: "Please fill in all required fields" });
      return;
    }

    startTransition(async () => {
      const result = await fileWorkOrderDispute({
        workOrderId: formData.workOrderId,
        type: formData.type,
        category: formData.category,
        title: formData.title || `Dispute: ${selectedWorkOrder?.title}`,
        description: formData.description,
        desiredResolution: formData.desiredResolution || undefined,
        disputedAmount: formData.disputedAmount ? parseFloat(formData.disputedAmount) : undefined,
      });

      if (result.success) {
        toast({ description: `Dispute ${result.caseNumber} filed successfully` });
        router.push(backUrl);
      } else {
        toast({ variant: "destructive", description: result.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Scale className="h-7 w-7 text-amber-600" />
            File a Dispute
          </h1>
          <p className="text-slate-600 mt-1">Report an issue with a job</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Work Order Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                <p>No jobs available to dispute</p>
              </div>
            ) : (
              <Select value={formData.workOrderId} onValueChange={(v) => setFormData({ ...formData, workOrderId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((wo) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{wo.title}</span>
                        <span className="text-xs text-slate-500">
                          {wo.property.name} • {wo.agreedPrice ? formatCurrency(Number(wo.agreedPrice)) : 'TBD'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedWorkOrder && (
              <div className="p-3 rounded-lg bg-slate-50 text-sm">
                <p className="font-medium text-slate-900">{selectedWorkOrder.title}</p>
                <p className="text-slate-500">
                  {selectedWorkOrder.property.name} • {selectedWorkOrder.landlord.name}
                </p>
                {selectedWorkOrder.agreedPrice && (
                  <p className="text-emerald-600 font-medium mt-1">
                    {formatCurrency(Number(selectedWorkOrder.agreedPrice))}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Dispute Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dispute Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dispute Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disputeCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue..."
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail. Include dates, communications, and any relevant context..."
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Disputed Amount (if applicable)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.disputedAmount}
                  onChange={(e) => setFormData({ ...formData, disputedAmount: e.target.value })}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Desired Resolution</Label>
              <Textarea
                value={formData.desiredResolution}
                onChange={(e) => setFormData({ ...formData, desiredResolution: e.target.value })}
                placeholder="What outcome would resolve this issue for you?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Before filing:</p>
            <ul className="mt-1 text-amber-700 list-disc list-inside space-y-1">
              <li>Try to resolve the issue directly with the other party first</li>
              <li>Gather any evidence (photos, messages, contracts) to support your case</li>
              <li>Be specific and factual in your description</li>
            </ul>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link href={backUrl}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending || !formData.workOrderId || !formData.type || !formData.category || !formData.description}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
          >
            {isPending ? "Filing..." : "File Dispute"}
          </Button>
        </div>
      </form>
    </div>
  );
}
