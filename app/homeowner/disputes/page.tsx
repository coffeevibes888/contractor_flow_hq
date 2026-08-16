import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMyDisputes } from '@/lib/actions/dispute.actions';
import { convertToPlainObject } from '@/lib/utils';
import Link from 'next/link';
import { Scale, Plus, Clock, CheckCircle, MessageSquare, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const metadata = {
  title: 'Disputes | Homeowner',
};

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

export default async function HomeownerDisputesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  const disputesResult = await getMyDisputes();
  const disputes = disputesResult.success ? convertToPlainObject(disputesResult.disputes) as any[] : [];

  const openDisputes = disputes.filter((d: any) => !["resolved", "closed", "cancelled"].includes(d.status));
  const resolvedDisputes = disputes.filter((d: any) => ["resolved", "closed"].includes(d.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Scale className="h-8 w-8 text-amber-600" />
              Disputes
            </h1>
            <p className="text-slate-600 mt-1">File and track dispute cases</p>
          </div>
          <Link href="/homeowner/disputes/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              File a Dispute
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{openDisputes.length}</p>
                <p className="text-xs text-amber-700">Open Cases</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{resolvedDisputes.length}</p>
                <p className="text-xs text-emerald-700">Resolved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Scale className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{disputes.length}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disputes List */}
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-slate-900">Your Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            {disputes.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg">No disputes filed</p>
                <p className="text-sm text-slate-400 mt-1">
                  If you have an issue with a contractor or job, you can file a dispute here
                </p>
                <Link href="/homeowner/disputes/new">
                  <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                    <Plus className="h-4 w-4 mr-2" />
                    File Your First Dispute
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((dispute: any) => (
                  <Link
                    key={dispute.id}
                    href={`/homeowner/disputes/${dispute.id}`}
                    className="block p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-amber-600">{dispute.caseNumber}</span>
                          <Badge className={statusColors[dispute.status]}>
                            {dispute.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-slate-900 truncate">{dispute.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {typeLabels[dispute.type]} • {dispute.landlord?.name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {dispute._count?.messages || 0} messages
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {dispute._count?.evidence || 0} files
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {dispute.disputedAmount && (
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(dispute.disputedAmount)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDateTime(new Date(dispute.createdAt)).dateOnly}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
