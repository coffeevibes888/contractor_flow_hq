import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Settings, User, Award, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AgentSettingsPage() {
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
      user: {
        select: { email: true, phoneNumber: true },
      },
    },
  });

  if (!agent) {
    return redirect('/onboarding/agent');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Info */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-600" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{agent.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{agent.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">{agent.user.phoneNumber || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Subdomain</p>
              <p className="font-medium text-slate-900">propertyflowhq.com/{agent.subdomain}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Info */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            License Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">License Number</p>
              <p className="font-medium text-slate-900">{agent.licenseNumber || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">License State</p>
              <p className="font-medium text-slate-900">{agent.licenseState || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Brokerage</p>
              <p className="font-medium text-slate-900">{agent.brokerage || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Years of Experience</p>
              <p className="font-medium text-slate-900">{agent.yearsExperience || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specializations */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-600" />
            Specializations & Service Areas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-2">Specializations</p>
            <div className="flex flex-wrap gap-2">
              {agent.specializations.length > 0 ? (
                agent.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary">{spec}</Badge>
                ))
              ) : (
                <p className="text-slate-500">No specializations set</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-2">Service Areas</p>
            <div className="flex flex-wrap gap-2">
              {agent.serviceAreas.length > 0 ? (
                agent.serviceAreas.map((area) => (
                  <Badge key={area} variant="outline">{area}</Badge>
                ))
              ) : (
                <p className="text-slate-500">No service areas set</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 capitalize">{agent.subscriptionTier} Plan</p>
              <p className="text-sm text-slate-500">Status: {agent.subscriptionStatus}</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 capitalize">{agent.subscriptionTier}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
