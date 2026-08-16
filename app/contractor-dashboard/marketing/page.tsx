import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MessageSquare, Users, TrendingUp, Send, Lock, Zap, ChevronRight } from 'lucide-react';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function MarketingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    subscriptionTier: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  const featureAccess = await canAccessFeature(contractorProfile.id, 'marketing');

  if (!featureAccess.allowed) {
    return (
      <div className='w-full space-y-5'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Marketing Hub</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Grow your business with campaigns and referrals</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-pink-400' />
          </div>
          <h2 className='text-lg font-bold text-gray-800 mb-2'>Marketing Tools</h2>
          <p className='text-sm text-gray-500 mb-6 max-w-md mx-auto'>
            Marketing features are available on the Pro plan. Upgrade to run campaigns,
            manage referrals, and grow your business.
          </p>
          <div className='flex flex-wrap gap-3 justify-center mb-6'>
            {[
              { icon: Mail, label: 'Email Campaigns' },
              { icon: MessageSquare, label: 'SMS Marketing' },
              { icon: Users, label: 'Referral Program' },
              { icon: TrendingUp, label: 'Review Management' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700'>
                <Icon className='h-3.5 w-3.5 text-pink-500' />
                {label}
              </div>
            ))}
          </div>
          <Link
            href='/contractor-dashboard/settings/subscription'
            className='inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm'
          >
            <Zap className='h-4 w-4' />
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const [campaigns, referrals] = await Promise.all([
    prisma.contractorMarketingCampaign.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.contractorReferral.findMany({
      where: { contractorId: contractorProfile.id },
      include: { referrer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const stats = {
    totalCampaigns: campaigns.length,
    totalReferrals: referrals.length,
    convertedReferrals: referrals.filter((r) => r.status === 'converted').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sent, 0),
    totalOpened: campaigns.reduce((sum, c) => sum + c.opened, 0),
  };
  const openRate = stats.totalSent > 0 ? ((stats.totalOpened / stats.totalSent) * 100).toFixed(1) : '0';

  const statusConfig: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-500' },
    scheduled: { bg: 'bg-blue-50', text: 'text-blue-600' },
    sending: { bg: 'bg-violet-50', text: 'text-violet-600' },
    sent: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    paused: { bg: 'bg-amber-50', text: 'text-amber-600' },
  };

  const referralStatusConfig: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600' },
    contacted: { bg: 'bg-blue-50', text: 'text-blue-600' },
    converted: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    lost: { bg: 'bg-red-50', text: 'text-red-600' },
  };

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Marketing Hub</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Grow your business with campaigns and referrals</p>
        </div>
        <Link href='/contractor-dashboard/marketing/campaigns/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Total Campaigns', value: String(stats.totalCampaigns), icon: Send, gradient: 'from-violet-400 to-purple-400' },
          { label: 'Open Rate', value: `${openRate}%`, icon: Mail, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Total Referrals', value: String(stats.totalReferrals), icon: Users, gradient: 'from-blue-400 to-indigo-400' },
          { label: 'Converted', value: String(stats.convertedReferrals), icon: TrendingUp, gradient: 'from-amber-400 to-orange-400' },
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

      <div className='grid lg:grid-cols-2 gap-4'>
        {/* Campaigns */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Recent Campaigns</h3>
            <Link href='/contractor-dashboard/marketing/campaigns' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <div className='p-8 text-center'>
              <Mail className='h-10 w-10 mx-auto text-gray-300 mb-3' />
              <p className='text-sm text-gray-500 mb-3'>No campaigns yet</p>
              <Link href='/contractor-dashboard/marketing/campaigns/new'>
                <Button size='sm' className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs'>
                  Create First Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {campaigns.map((campaign) => {
                const sc = statusConfig[campaign.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
                return (
                  <Link key={campaign.id} href={`/contractor-dashboard/marketing/campaigns/${campaign.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                    <div className='h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0'>
                      {campaign.type === 'sms' ? <MessageSquare className='h-4 w-4 text-violet-500' /> : <Mail className='h-4 w-4 text-violet-500' />}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>{campaign.name}</p>
                      <p className='text-[10px] text-gray-500 uppercase'>{campaign.type}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} capitalize shrink-0`}>{campaign.status}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Referrals */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>Recent Referrals</h3>
            <Link href='/contractor-dashboard/marketing/referrals' className='text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1'>
              View All <ChevronRight className='h-3 w-3' />
            </Link>
          </div>
          {referrals.length === 0 ? (
            <div className='p-8 text-center'>
              <Users className='h-10 w-10 mx-auto text-gray-300 mb-3' />
              <p className='text-sm text-gray-500'>No referrals yet</p>
              <p className='text-xs text-gray-400 mt-1'>Encourage customers to refer friends and family</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {referrals.map((referral) => {
                const sc = referralStatusConfig[referral.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
                return (
                  <div key={referral.id} className='flex items-center gap-3 px-4 py-3'>
                    <div className='h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0'>
                      <Users className='h-4 w-4 text-blue-500' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>{referral.referredName}</p>
                      <p className='text-[10px] text-gray-500'>Referred by {referral.referrer.name}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} capitalize shrink-0`}>{referral.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Marketing Tools */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm p-4'>
        <h3 className='text-sm font-bold text-gray-800 mb-3'>Marketing Tools</h3>
        <div className='grid sm:grid-cols-3 gap-3'>
          {[
            { href: '/contractor-dashboard/marketing/campaigns/new', icon: Mail, label: 'Email Campaign', desc: 'Send emails to your customers', color: 'text-violet-500' },
            { href: '/contractor-dashboard/marketing/campaigns/new?type=sms', icon: MessageSquare, label: 'SMS Campaign', desc: 'Send text messages to customers', color: 'text-emerald-500' },
            { href: '/contractor-dashboard/marketing/referrals', icon: Users, label: 'Referral Program', desc: 'Track customer referrals', color: 'text-blue-500' },
          ].map(({ href, icon: Icon, label, desc, color }) => (
            <Link key={href} href={href}>
              <div className='flex flex-col items-center gap-2 p-5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-all text-center cursor-pointer'>
                <Icon className={`h-8 w-8 ${color}`} />
                <p className='text-sm font-semibold text-gray-800'>{label}</p>
                <p className='text-xs text-gray-500'>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
