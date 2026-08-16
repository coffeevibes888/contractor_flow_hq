import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, MessageSquare, Users, Eye, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
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

  const campaign = await prisma.contractorMarketingCampaign.findUnique({
    where: {
      id: params.id,
      contractorId: contractorProfile.id,
    },
  });

  if (!campaign) {
    return redirect('/contractor-dashboard/marketing');
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/30 text-gray-200',
    scheduled: 'bg-blue-500/30 text-blue-200',
    sending: 'bg-violet-100 text-violet-700',
    sent: 'bg-emerald-500/30 text-emerald-200',
    paused: 'bg-amber-500/30 text-amber-200',
  };

  const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : '0';
  const clickRate = campaign.sent > 0 ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contractor-dashboard/marketing">
          <Button variant="outline" size="icon" className="border-gray-300 text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-600">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status]}>
              {campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {campaign.type === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
            {campaign.type === 'sms' && <MessageSquare className="h-4 w-4 text-gray-500" />}
            <p className="text-gray-600">{campaign.type.toUpperCase()} Campaign</p>
          </div>
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
                <p className="text-2xl font-bold text-gray-900">{campaign.sent}</p>
                <p className="text-sm text-gray-600">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Eye className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.opened}</p>
                <p className="text-sm text-gray-600">Opened ({openRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <MousePointerClick className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.clicked}</p>
                <p className="text-sm text-gray-600">Clicked ({clickRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.bounced}</p>
                <p className="text-sm text-gray-600">Bounced</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Content */}
      <Card className="border-2 border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Campaign Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.subject && (
            <div>
              <Label className="text-gray-600 text-sm">Subject</Label>
              <p className="text-gray-900 mt-1">{campaign.subject}</p>
            </div>
          )}
          <div>
            <Label className="text-gray-600 text-sm">Message</Label>
            <div className="mt-1 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-gray-900 whitespace-pre-wrap">{campaign.message}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 text-sm">Target Audience</Label>
              <p className="text-gray-900 mt-1 capitalize">{campaign.targetAudience}</p>
            </div>
            {campaign.scheduledFor && (
              <div>
                <Label className="text-gray-600 text-sm">Scheduled For</Label>
                <p className="text-gray-900 mt-1">
                  {new Date(campaign.scheduledFor).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
