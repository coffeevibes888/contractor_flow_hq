'use client';

import { Building2, Users, Calendar, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface AgentDashboardClientProps {
  agent: {
    id: string;
    name: string;
    subdomain: string;
    brokerage: string | null;
    listings: Array<{
      id: string;
      title: string;
      status: string;
      price: any;
      address: any;
    }>;
    leads: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      type: string;
      createdAt: Date;
    }>;
    openHouses: Array<{
      id: string;
      date: Date;
      startTime: string;
      endTime: string;
      listing: {
        title: string;
        address: any;
      };
    }>;
  };
  stats: {
    activeListings: number;
    pendingListings: number;
    soldListings: number;
    newLeads: number;
    totalListings: number;
    totalLeads: number;
  };
}

export default function AgentDashboardClient({ agent, stats }: AgentDashboardClientProps) {
  const statCards = [
    {
      title: 'Active Listings',
      value: stats.activeListings,
      icon: Building2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Pending Sales',
      value: stats.pendingListings,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Sold This Year',
      value: stats.soldListings,
      icon: Building2,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      sold: 'bg-violet-100 text-violet-700',
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-cyan-100 text-cyan-700',
      qualified: 'bg-emerald-100 text-emerald-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {agent.name.split(' ')[0]}!</h1>
          <p className="text-slate-300 mt-1">
            {agent.brokerage && <span>{agent.brokerage} • </span>}
            <Link href={`/${agent.subdomain}`} className="text-violet-400 hover:underline">
              View your public profile →
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/agent/leads">
              <Users className="h-4 w-4 mr-2" />
              View Leads
            </Link>
          </Button>
          <Button asChild className="bg-violet-600 hover:bg-violet-700">
            <Link href="/agent/listings/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-slate-800/50 backdrop-blur-sm border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Listings */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-white">Recent Listings</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Link href="/agent/listings">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {agent.listings.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 mx-auto text-slate-500 mb-3" />
                <p className="text-slate-400 text-sm">No listings yet</p>
                <Button asChild size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700">
                  <Link href="/agent/listings/create">Add your first listing</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {agent.listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/agent/listings/${listing.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{listing.title}</p>
                      <p className="text-sm text-slate-400 truncate">
                        {typeof listing.address === 'object' && listing.address?.city
                          ? `${listing.address.city}, ${listing.address.state}`
                          : 'Address not set'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="font-semibold text-white">
                        {formatCurrency(Number(listing.price))}
                      </span>
                      <Badge className={getStatusBadge(listing.status)}>{listing.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-white">Recent Leads</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Link href="/agent/leads">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {agent.leads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-slate-500 mb-3" />
                <p className="text-slate-400 text-sm">No leads yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Leads will appear here when buyers contact you
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {agent.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/agent/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{lead.name}</p>
                      <p className="text-sm text-slate-400 truncate">{lead.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="outline" className="capitalize border-white/20 text-slate-300">{lead.type}</Badge>
                      <Badge className={getStatusBadge(lead.status)}>{lead.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Open Houses */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-white">Upcoming Open Houses</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Link href="/agent/open-houses">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {agent.openHouses.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 mx-auto text-slate-500 mb-3" />
              <p className="text-slate-400 text-sm">No upcoming open houses</p>
              <Button asChild size="sm" variant="outline" className="mt-3 border-white/20 text-white hover:bg-white/10">
                <Link href="/agent/open-houses/create">Schedule an open house</Link>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {agent.openHouses.map((openHouse) => (
                <div
                  key={openHouse.id}
                  className="p-4 rounded-lg border border-white/10 bg-slate-700/50"
                >
                  <div className="flex items-center gap-2 text-violet-400 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {new Date(openHouse.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="font-medium text-white truncate">{openHouse.listing.title}</p>
                  <p className="text-sm text-slate-400">
                    {openHouse.startTime} - {openHouse.endTime}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
