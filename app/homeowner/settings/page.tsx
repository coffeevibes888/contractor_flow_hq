import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, Shield, HousePlus } from 'lucide-react';
import HomeProfileForm from '@/components/homeowner/home-profile-form';
import { SignOutButtonGeneric } from '@/components/shared/sign-out-button-generic';
import AccountSecurity from './account-security';

export default async function HomeownerSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  // Get homeowner profile
  const homeowner = await prisma.homeowner.findUnique({
    where: { userId: session.user.id },
  }) as any;

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneNumber: true },
  });

  // Serialize for client
  const serializedHomeowner = homeowner ? {
    id: homeowner.id,
    name: homeowner.name || null,
    homeType: homeowner.homeType,
    interestedServices: homeowner.interestedServices || [],
    projectTimeline: homeowner.projectTimeline,
    address: homeowner.address as any,
    images: homeowner.images || [],
    yearBuilt: homeowner.yearBuilt || null,
    squareFootage: homeowner.squareFootage || null,
    bedrooms: homeowner.bedrooms || null,
    bathrooms: homeowner.bathrooms ? Number(homeowner.bathrooms) : null,
    lotSize: homeowner.lotSize || null,
    description: homeowner.description || null,
  } : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your home and account preferences</p>
        </div>

        <Tabs defaultValue="home" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <HousePlus className="h-4 w-4" />
              My Home
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home">
            {serializedHomeowner ? (
              <HomeProfileForm homeowner={serializedHomeowner} />
            ) : (
              <Card className="bg-white border-slate-200">
                <CardContent className="py-12 text-center">
                  <HousePlus className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-700">Unable to load home profile. Please try again.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {session.user.name?.charAt(0) || 'H'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{session.user.name}</p>
                    <p className="text-sm text-slate-600">{session.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card className="bg-white border-slate-200 hover:border-sky-300 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Bell className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Notifications</p>
                      <p className="text-sm text-slate-600">Manage email and push notifications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AccountSecurity
                userName={session.user.name || ''}
                userEmail={session.user.email || ''}
                userPhone={userRecord?.phoneNumber || null}
              />
            </div>

            <Card className="bg-white border-red-200">
              <CardContent className="p-4">
                <SignOutButtonGeneric 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  showIcon={true}
                  showText={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
