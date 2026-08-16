'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bell, DollarSign, HelpCircle, CreditCard, Crown, ArrowRight, Shield, Building2, Code } from 'lucide-react';
import FeatureTracker from '@/components/analytics/feature-tracker';
import { ProfileSettings } from './profile-settings';
import { NotificationSettings } from './notification-settings';
import { FeeSettings } from './fee-settings';
import { HelpAndTour } from './help-and-tour';
import { SecuritySettings } from './security-settings';
import { BankAccountSettings } from './bank-account-settings';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LandlordSettingsClientProps {
  landlord: {
    id: string;
    name: string;
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    companyAddress?: string | null;
    logoUrl?: string | null;
    aboutPhoto?: string | null;
  };
  isPro: boolean;
  isEnterprise?: boolean;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  userEmail?: string;
  initialTab?: string;
}

export function LandlordSettingsClient({ landlord, isPro, isEnterprise = false, twoFactorEnabled = false, emailVerified = false, userEmail = '', initialTab = 'profile' }: LandlordSettingsClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const router = useRouter();

  const handleNeedsOnboarding = () => {
    router.push('/admin/payouts');
  };

  return (
    <div className="space-y-5">
      <FeatureTracker step="settings_viewed" metadata={{ tab: activeTab }} />
      {/* Subscription & Getting Started Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/settings/subscription" className="block">
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-sky-600 to-violet-500 p-4 sm:p-5 hover:border-amber-500/50 transition-all group h-full flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Manage Subscription</h3>
                <p className="text-xs text-black">View plan, billing & usage</p>
              </div>
            </div>
             <div className="text-right mt-2">
                <ArrowRight className="w-4 h-4 inline text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/admin/settings/financials" className="block">
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-sky-600 to-violet-500 transition-all group h-full flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Financial Rules</h3>
                <p className="text-xs text-black">Set up late fees and payment rules.</p>
              </div>
            </div>
            <div className="text-right mt-2">
                <ArrowRight className="w-4 h-4 inline text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {!isPro && (
          <Link href="/admin/settings/subscription" className="block">
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-4 sm:p-5 hover:border-violet-500/50 transition-all group h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Upgrade to Pro</h3>
                    <p className="text-xs text-slate-400">Unlock all features</p>
                  </div>
                </div>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">
                  <span className="hidden sm:inline mr-1">Upgrade</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Link>
        )}

        {isEnterprise && (
          <Link href="/admin/settings/developer" className="block">
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-600 to-blue-500 p-4 sm:p-5 hover:border-cyan-500/50 transition-all group h-full flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Code className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Developer Settings</h3>
                  <p className="text-xs text-black">API keys & webhooks</p>
                </div>
              </div>
              <div className="text-right mt-2">
                <ArrowRight className="w-4 h-4 inline text-cyan-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-around rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-500 border border-black p-2.5 sm:p-3 md:p-4 space-y-1 hover:border-slate-700 transition-colors shadow-2xl active:scale-[0.98]">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-white rounded-lg px-3 py-2.5 text-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4 text-black" />
            <span className="hidden sm:inline text-black">Profile</span>
          </TabsTrigger>
        
          
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg px-3 py-2.5 text-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-black" />
            <span className="hidden sm:inline text-black">Security</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-white rounded-lg px-3 py-2.5 text-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4 text-black" />
            <span className="hidden sm:inline text-black">Notifications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="fees" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-white rounded-lg px-3 py-2.5 text-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4 text-black" />
            <span className="hidden sm:inline text-black">Fees</span>
          </TabsTrigger>
          <TabsTrigger 
            value="help" 
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg px-3 py-2.5 text-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-black" />
            <span className="hidden sm:inline text-black">Help</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSettings
            landlord={landlord}
            emailVerified={emailVerified}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="banking" className="mt-4">
          <BankAccountSettings onNeedsOnboarding={handleNeedsOnboarding} />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecuritySettings initialEnabled={twoFactorEnabled} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <FeeSettings isPro={isPro} />
        </TabsContent>

        <TabsContent value="help" className="mt-4">
          <HelpAndTour />
        </TabsContent>
      </Tabs>
    </div>
  );
}
