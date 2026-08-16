import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function CampaignsListPage() {
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

  const campaigns = await prisma.contractorMarketingCampaign.findMany({
    where: { contractorId: contractorProfile.id },
    orderBy: { createdAt: 'desc' },
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/30 text-gray-200',
    scheduled: 'bg-blue-500/30 text-blue-200',
    sending: 'bg-violet-100 text-violet-700',
    sent: 'bg-emerald-500/30 text-emerald-200',
    paused: 'bg-amber-500/30 text-amber-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractor-dashboard/marketing">
          <Button variant="outline" size="icon" className="border-gray-300 text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-blue-600">All Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your marketing campaigns</p>
        </div>
        <Link href="/contractor-dashboard/marketing/campaigns/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-gray-900">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-16 w-16 mx-auto text-gray-900/30 mb-4" />
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <Link href="/contractor-dashboard/marketing/campaigns/new">
                <Button className="bg-violet-600 hover:bg-violet-700 text-gray-900">
                  Create First Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/contractor-dashboard/marketing/campaigns/${campaign.id}`}
                  className="block p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                        <Badge className={statusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.type === 'email' && <Mail className="h-3 w-3 text-gray-500" />}
                        {campaign.type === 'sms' && <MessageSquare className="h-3 w-3 text-gray-500" />}
                        <span className="text-sm text-gray-500">{campaign.type.toUpperCase()}</span>
                        {campaign.scheduledFor && (
                          <>
                            <span className="text-gray-900/40">•</span>
                            <span className="text-sm text-gray-500">
                              Scheduled: {new Date(campaign.scheduledFor).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {campaign.status === 'sent' && (
                    <div className="flex gap-4 text-sm text-gray-500 mt-2">
                      <span>Sent: {campaign.sent}</span>
                      <span>Opened: {campaign.opened}</span>
                      <span>Clicked: {campaign.clicked}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
