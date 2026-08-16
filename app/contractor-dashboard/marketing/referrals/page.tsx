import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function ReferralsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  const referrals = await prisma.contractorReferral.findMany({
    where: { contractorId: contractorProfile.id },
    include: {
      referrer: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    contacted: referrals.filter(r => r.status === 'contacted').length,
    converted: referrals.filter(r => r.status === 'converted').length,
    lost: referrals.filter(r => r.status === 'lost').length,
    totalValue: referrals
      .filter(r => r.status === 'converted' && r.jobValue)
      .reduce((sum, r) => sum + Number(r.jobValue || 0), 0),
  };

  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : '0';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/30 text-amber-200',
    contacted: 'bg-blue-500/30 text-blue-200',
    converted: 'bg-emerald-500/30 text-emerald-200',
    lost: 'bg-red-500/30 text-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractor-dashboard/marketing">
          <Button variant="outline" size="icon" className="border-gray-300 text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-blue-600">Referral Management</h1>
          <p className="text-gray-600 mt-1">Track and manage customer referrals</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
                <p className="text-sm text-gray-600">Converted ({conversionRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <DollarSign className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals List */}
      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-900/30 mb-4" />
              <p className="text-gray-600 mb-2">No referrals yet</p>
              <p className="text-sm text-gray-400">
                Encourage your customers to refer friends and family
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{referral.referredName}</h4>
                        <Badge className={statusColors[referral.status]}>
                          {referral.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        Referred by {referral.referrer.name}
                      </p>
                    </div>
                    {referral.jobValue && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          ${Number(referral.jobValue).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Job Value</p>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    {referral.referredEmail && (
                      <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="text-gray-900">{referral.referredEmail}</span>
                      </div>
                    )}
                    {referral.referredPhone && (
                      <div>
                        <span className="text-gray-500">Phone: </span>
                        <span className="text-gray-900">{referral.referredPhone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Date: </span>
                      <span className="text-gray-900">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
