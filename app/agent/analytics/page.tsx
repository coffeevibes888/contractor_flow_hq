import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { TrendingUp, Building2, Users, Eye, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AgentAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'agent') {
    return redirect('/');
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: {
          listings: true,
          leads: true,
          openHouses: true,
        },
      },
    },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  // Get listing stats
  const activeListings = await prisma.agentListing.count({
    where: { agentId: agent.id, status: 'active' },
  });

  const soldListings = await prisma.agentListing.count({
    where: { agentId: agent.id, status: 'sold' },
  });

  const totalSalesVolume = await prisma.agentListing.aggregate({
    where: { agentId: agent.id, status: 'sold' },
    _sum: { soldPrice: true },
  });

  const newLeadsThisMonth = await prisma.agentLead.count({
    where: {
      agentId: agent.id,
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  const stats = [
    {
      title: 'Total Listings',
      value: agent._count.listings,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Listings',
      value: activeListings,
      icon: Eye,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Properties Sold',
      value: soldListings,
      icon: TrendingUp,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
    {
      title: 'Total Leads',
      value: agent._count.leads,
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'New Leads (This Month)',
      value: newLeadsThisMonth,
      icon: Users,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: 'Sales Volume',
      value: `$${(Number(totalSalesVolume._sum.soldPrice) || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Track your performance and growth</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for charts */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            Detailed analytics charts coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
