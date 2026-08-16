'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, Building2, Mail, Lock, User, CheckCircle2, 
  Loader2, AlertCircle, Briefcase, Clock, Shield,
  ArrowRight, ArrowLeft
} from 'lucide-react';

type InviteData = {
  id: string;
  email: string | null;
  role: string;
  landlordId: string;
  landlordName: string;
  expiresAt: string;
};

type OnboardingStep = 'welcome' | 'account' | 'role-info' | 'employment' | 'complete';

const getRoleRedirectUrl = (role: string, isExistingEmployee: boolean): string => {
  switch (role) {
    case 'employee':
      return isExistingEmployee ? '/employee' : '/employee?onboarding=true';
    case 'maintenance_tech':
      return '/admin/operations/maintenance';
    case 'accountant':
      return '/admin/payouts';
    case 'showing_agent':
      return '/admin/properties';
    case 'leasing_agent':
      return '/admin/applications';
    default:
      return '/admin/team';
  }
};

const ROLE_INFO = {
  // Pro Plan Roles
  admin: {
    title: 'Admin',
    icon: Shield,
    color: 'text-violet-400',
    bg: 'bg-violet-500/20',
    description: 'You\'ll have full access to manage properties, tenants, finances, and team operations.',
    features: ['Full property access', 'Manage tenants', 'Financial reports', 'Team management'],
  },
  property_manager: {
    title: 'Property Manager',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    description: 'You\'ll manage properties, tenants, schedules, and oversee day-to-day operations.',
    features: ['Manage properties', 'Handle tenant relations', 'Approve timesheets', 'View reports'],
  },
  leasing_agent: {
    title: 'Leasing Agent',
    icon: Users,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    description: 'You\'ll handle rental applications, manage tenants, and schedule property showings.',
    features: ['Process applications', 'Manage tenants', 'Schedule showings', 'View properties'],
  },
  showing_agent: {
    title: 'Showing Agent',
    icon: Building2,
    color: 'text-teal-400',
    bg: 'bg-teal-500/20',
    description: 'You\'ll conduct property showings for prospective tenants.',
    features: ['Schedule showings', 'View properties', 'Team chat access'],
  },
  // Enterprise-Only Roles
  maintenance_tech: {
    title: 'Maintenance Tech',
    icon: Briefcase,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    description: 'You\'ll handle maintenance requests, repairs, and work orders.',
    features: ['View work orders', 'Update maintenance status', 'View properties', 'Team chat access'],
  },
  accountant: {
    title: 'Accountant',
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    description: 'You\'ll manage financial records, reports, and payment processing.',
    features: ['View financials', 'Process payments', 'Generate reports', 'View properties'],
  },
  employee: {
    title: 'Employee',
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    description: 'You\'ll be able to clock in/out, view your schedule, request time off, and access the employee portal.',
    features: ['Clock in/out with GPS', 'View work schedule', 'Request time off', 'View pay stubs'],
  },
  // Legacy role mappings
  manager: {
    title: 'Property Manager',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    description: 'You\'ll manage properties, tenants, schedules, and oversee day-to-day operations.',
    features: ['Manage properties', 'Handle tenant relations', 'Approve timesheets', 'View reports'],
  },
  member: {
    title: 'Maintenance Tech',
    icon: Briefcase,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    description: 'You\'ll handle maintenance requests, repairs, and work orders.',
    features: ['View work orders', 'Update maintenance status', 'View properties', 'Team chat access'],
  },
};

export default function TeamInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    isExistingEmployee: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setError('Invalid invite link - missing token');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/team/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (data.success) {
          setInvite(data.invite);
        } else {
          setError(data.message || 'Invalid invitation');
        }
      } catch {
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  // If user is already logged in, try to accept the invite
  useEffect(() => {
    async function acceptInvite() {
      if (status === 'authenticated' && session?.user && invite && step === 'welcome') {
        // Open invite (no specific email) — any logged-in user can proceed
        if (!invite.email) {
          setStep('role-info');
          return;
        }
        // Email-specific invite — must match
        if (session.user.email?.toLowerCase() === invite.email.toLowerCase()) {
          setStep('role-info');
        }
      }
    }

    acceptInvite();
  }, [status, session, invite, step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Please enter your name');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      // Register the user
      const registerEmail = invite?.email || formData.email;
      if (!registerEmail) {
        setFormError('Please enter your email address');
        setIsSubmitting(false);
        return;
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: registerEmail,
          password: formData.password,
          role: 'property_manager', // Default role for team members
          inviteToken: token,
        }),
      });

      const data = await res.json();

      if (data.success || res.ok) {
        // Sign in the user
        const signInResult = await signIn('credentials', {
          email: invite?.email || formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          setStep('role-info');
        } else {
          setFormError('Account created but sign-in failed. Please try signing in manually.');
        }
      } else {
        setFormError(data.message || 'Failed to create account');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          isExistingEmployee: formData.isExistingEmployee,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep('complete');
      } else {
        setError(data.message || 'Failed to accept invitation');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInWithProvider = (provider: string) => {
    const callbackUrl = `/team/invite?token=${encodeURIComponent(token || '')}`;
    signIn(provider, { callbackUrl });
  };

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-md bg-slate-900/80 border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400 mb-4" />
            <p className="text-slate-400">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-slate-900/80 border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-slate-400">
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push('/sign-in')}
              className="w-full bg-violet-600 hover:bg-violet-500"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = ROLE_INFO[invite.role as keyof typeof ROLE_INFO] || ROLE_INFO.member;
  const RoleIcon = roleInfo.icon;

  // Welcome step - show invite details
  if (step === 'welcome') {
    const isLoggedIn = status === 'authenticated' && session?.user;
    const isOpenInvite = !invite.email; // No specific email — anyone can join
    const isCorrectEmail = isOpenInvite || (isLoggedIn && session.user.email?.toLowerCase() === invite.email?.toLowerCase());

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-lg bg-slate-900/80 border-white/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">You&apos;re Invited!</CardTitle>
            <CardDescription className="text-slate-400">
              <span className="text-violet-400 font-medium">{invite.landlordName}</span> has invited you to join their team
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invite details */}
            <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${roleInfo.bg}`}>
                  <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Your Role</p>
                  <p className="text-white font-medium">{roleInfo.title}</p>
                </div>
              </div>
              {invite.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-700/50">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Invited Email</p>
                    <p className="text-white font-medium">{invite.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons based on auth state */}
            {isLoggedIn ? (
              isCorrectEmail ? (
                <Button
                  onClick={() => setStep('role-info')}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-400">
                    You&apos;re signed in as {session.user.email}, but this invite was sent to {invite.email}.
                    Please sign in with the correct email to accept.
                  </div>
                  <Button
                    onClick={() => signIn()}
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/10"
                  >
                    Sign in with different account
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => setStep('account')}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                >
                  {isOpenInvite ? 'Create Account & Join' : 'Create Account & Join'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-slate-900 px-2 text-slate-500">or</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleSignInWithProvider('google')}
                  variant="outline"
                  className="w-full border-white/10 text-white hover:bg-white/10"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <p className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => signIn(undefined, { callbackUrl: `/team/invite?token=${token}` })}
                    className="text-violet-400 hover:text-violet-300"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Account creation step
  if (step === 'account') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-lg bg-slate-900/80 border-white/10">
          <CardHeader>
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <CardTitle className="text-white">Create Your Account</CardTitle>
            <CardDescription className="text-slate-400">
              Set up your account to join {invite.landlordName}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  {invite.email ? (
                    <Input
                      type="email"
                      value={invite.email}
                      disabled
                      className="pl-10 bg-slate-800/50 border-white/10 text-slate-400"
                    />
                  ) : (
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 bg-slate-800/50 border-white/10 text-white"
                      required
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {invite.email ? 'This email was specified in your invitation' : 'Enter your email to create your account'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-white/10 text-white"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-white/10 text-white"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role info step
  if (step === 'role-info') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-lg bg-slate-900/80 border-white/10">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-2xl ${roleInfo.bg} flex items-center justify-center mb-4`}>
              <RoleIcon className={`h-8 w-8 ${roleInfo.color}`} />
            </div>
            <CardTitle className="text-white">Your Role: {roleInfo.title}</CardTitle>
            <CardDescription className="text-slate-400">
              {roleInfo.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-300">What you&apos;ll be able to do:</p>
              <ul className="space-y-2">
                {roleInfo.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-400">
                    <CheckCircle2 className={`h-4 w-4 ${roleInfo.color}`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Employment question for employee role */}
            {invite.role === 'employee' && (
              <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 space-y-3">
                <p className="text-sm font-medium text-white">Are you already employed by {invite.landlordName}?</p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.isExistingEmployee ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, isExistingEmployee: true })}
                    className={formData.isExistingEmployee 
                      ? 'flex-1 bg-emerald-600 hover:bg-emerald-500' 
                      : 'flex-1 border-white/10 text-white hover:bg-white/10'
                    }
                  >
                    Yes, I&apos;m employed
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.isExistingEmployee ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, isExistingEmployee: false })}
                    className={!formData.isExistingEmployee 
                      ? 'flex-1 bg-violet-600 hover:bg-violet-500' 
                      : 'flex-1 border-white/10 text-white hover:bg-white/10'
                    }
                  >
                    No, I&apos;m new
                  </Button>
                </div>
                {!formData.isExistingEmployee && (
                  <p className="text-xs text-amber-400">
                    You&apos;ll need to complete the hiring process before you can start working.
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleAcceptInvite}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Team...
                </>
              ) : (
                <>
                  Accept & Join Team
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete step
  if (step === 'complete') {
    const redirectUrl = getRoleRedirectUrl(invite.role, formData.isExistingEmployee);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-lg bg-slate-900/80 border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <CardTitle className="text-white">Welcome to the Team!</CardTitle>
            <CardDescription className="text-slate-400">
              You&apos;ve successfully joined {invite.landlordName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {invite.role === 'employee' && !formData.isExistingEmployee && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-400">
                <p className="font-medium mb-1">Next Steps</p>
                <p>Since you&apos;re a new employee, you&apos;ll need to complete the onboarding process including any required paperwork.</p>
              </div>
            )}

            <Button
              onClick={() => router.push(redirectUrl)}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              Go to My Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
