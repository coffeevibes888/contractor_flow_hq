"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  Eye,
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
  landlord: { id: string; name: string; subdomain: string } | null;
  _count: { messages: number; evidence: number };
};

interface ContractorDisputesViewProps {
  disputes: DisputeRow[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-50', text: 'text-blue-600' },
  under_review: { bg: 'bg-amber-50', text: 'text-amber-600' },
  mediation: { bg: 'bg-violet-50', text: 'text-violet-600' },
  escalated: { bg: 'bg-red-50', text: 'text-red-600' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const typeLabels: Record<string, string> = {
  payment: "💰 Payment",
  quality: "⭐ Quality",
  timeline: "⏰ Timeline",
  scope: "📋 Scope",
  communication: "💬 Communication",
  other: "📌 Other",
};

export default function ContractorDisputesView({ disputes }: ContractorDisputesViewProps) {
  const openDisputes = disputes.filter(d => !["resolved", "closed", "cancelled"].includes(d.status));
  const resolvedDisputes = disputes.filter(d => ["resolved", "closed"].includes(d.status));

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Disputes</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>File and track dispute cases</p>
        </div>
        <Link href='/contractor-dashboard/disputes/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' /> File a Dispute
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-3 gap-3'>
        {[
          { label: 'Open Cases', value: String(openDisputes.length), icon: Clock, gradient: 'from-amber-400 to-orange-400' },
          { label: 'Resolved', value: String(resolvedDisputes.length), icon: CheckCircle, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Total', value: String(disputes.length), icon: Scale, gradient: 'from-gray-400 to-slate-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
                <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disputes List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Your Disputes</h3>
          <span className='text-xs text-gray-400'>{disputes.length} total</span>
        </div>
        {disputes.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <Scale className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No disputes filed</h3>
            <p className='text-sm text-gray-500 mb-4'>If you have an issue with a job or payment, you can file a dispute here.</p>
            <Link href='/contractor-dashboard/disputes/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' /> File Your First Dispute
              </Button>
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {disputes.map((dispute) => {
              const sc = statusColors[dispute.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
              return (
                <Link key={dispute.id} href={`/contractor-dashboard/disputes/${dispute.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                  <div className='h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0'>
                    <Scale className='h-4 w-4 text-amber-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-[10px] font-mono text-amber-600'>{dispute.caseNumber}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} capitalize`}>
                        {dispute.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className='text-xs font-semibold text-gray-800 truncate mt-0.5'>{dispute.title}</p>
                    <p className='text-[10px] text-gray-500'>{typeLabels[dispute.type]} · {dispute.landlord?.name || 'Unknown'}</p>
                    <div className='flex items-center gap-3 mt-0.5'>
                      <span className='flex items-center gap-1 text-[10px] text-gray-400'><MessageSquare className='h-3 w-3' />{dispute._count.messages}</span>
                      <span className='flex items-center gap-1 text-[10px] text-gray-400'><FileText className='h-3 w-3' />{dispute._count.evidence} files</span>
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    {dispute.disputedAmount && (
                      <p className='text-xs font-bold text-gray-800'>{formatCurrency(dispute.disputedAmount)}</p>
                    )}
                    <p className='text-[10px] text-gray-400'>{formatDateTime(new Date(dispute.createdAt)).dateOnly}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
