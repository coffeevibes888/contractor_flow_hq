import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function AgentOpenHousesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'agent') {
    return redirect('/');
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  const openHouses = await prisma.agentOpenHouse.findMany({
    where: { agentId: agent.id },
    include: {
      listing: {
        select: { title: true, address: true, images: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  const upcomingOpenHouses = openHouses.filter(oh => new Date(oh.date) >= new Date());
  const pastOpenHouses = openHouses.filter(oh => new Date(oh.date) < new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Open Houses</h1>
          <p className="text-slate-600 mt-1">Schedule and manage your open house events</p>
        </div>
        <Button asChild className="bg-amber-600 hover:bg-amber-700">
          <Link href="/agent/open-houses/create">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Open House
          </Link>
        </Button>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming</h2>
        {upcomingOpenHouses.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No upcoming open houses</h3>
              <p className="text-slate-500 mb-4">Schedule an open house to attract potential buyers</p>
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link href="/agent/open-houses/create">Schedule Open House</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingOpenHouses.map((oh) => (
              <Card key={oh.id} className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {new Date(oh.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{oh.listing.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {oh.startTime} - {oh.endTime}
                  </p>
                  {oh.isVirtual && (
                    <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Virtual
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {pastOpenHouses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Past Open Houses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastOpenHouses.slice(0, 6).map((oh) => (
              <Card key={oh.id} className="bg-white/60 backdrop-blur-sm border-white/20 opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {new Date(oh.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-700">{oh.listing.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {oh.startTime} - {oh.endTime}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
