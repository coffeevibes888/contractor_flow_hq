'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, Wrench, Home, Key, Briefcase, Shield,
  DollarSign, AlertTriangle, Clock, CheckCircle2, XCircle,
  Play, RefreshCw, Loader2, ChevronDown, ChevronRight,
  CreditCard, FileText, MessageSquare, Calendar, TrendingUp,
  UserPlus, Zap, Eye, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


interface TestingData {
  users: any[];
  landlords: any[];
  contractors: any[];
  recentPayments: any[];
  maintenanceTickets: any[];
  activeLeases: any[];
}

interface TestingDashboardClientProps {
  initialData: TestingData;
}

const ROLE_CONFIG = {
  tenant: { label: 'Tenant', icon: Home, color: 'bg-emerald-500', path: '/user/dashboard' },
  landlord: { label: 'Landlord', icon: Building2, color: 'bg-violet-500', path: '/admin/overview' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-blue-500', path: '/admin/overview' },
  contractor: { label: 'Contractor', icon: Wrench, color: 'bg-rose-500', path: '/contractor-dashboard' },
  agent: { label: 'Agent', icon: Briefcase, color: 'bg-amber-500', path: '/agent/dashboard' },
  homeowner: { label: 'Homeowner', icon: Key, color: 'bg-sky-500', path: '/homeowner/dashboard' },
  superAdmin: { label: 'Super Admin', icon: Shield, color: 'bg-red-500', path: '/super-admin' },
  employee: { label: 'Employee', icon: Users, color: 'bg-indigo-500', path: '/employee/schedule' },
};

export default function TestingDashboardClient({ initialData }: TestingDashboardClientProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['users', 'scenarios']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };


  // Group users by role
  const usersByRole = initialData.users.reduce((acc, user) => {
    const role = user.role || 'user';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {} as Record<string, any[]>);

  // Simulation actions
  const runSimulation = async (action: string, params?: any) => {
    setLoading(action);
    try {
      const response = await fetch('/api/super-admin/testing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Simulation Complete', description: data.message });
      } else {
        toast({ variant: 'destructive', title: 'Simulation Failed', description: data.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to run simulation' });
    } finally {
      setLoading(null);
    }
  };

  const createTestUser = async (role: string) => {
    setLoading(`create-${role}`);
    try {
      const response = await fetch('/api/super-admin/testing/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Test User Created',
          description: `Email: ${data.user.email}, Password: ${data.password}`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create user' });
    } finally {
      setLoading(null);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="h-7 w-7 text-amber-400" />
              Testing Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Unified testing interface - simulate all user roles and scenarios
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(Object.entries(usersByRole) as [string, any[]][]).slice(0, 6).map(([role, users]) => {
            const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || { label: role, icon: Users, color: 'bg-slate-500' };
            const Icon = config.icon;
            return (
              <Card key={role} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{users.length}</p>
                      <p className="text-xs text-slate-400">{config.label}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>


        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-violet-600">Overview</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-violet-600">Users</TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-violet-600">Scenarios</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-violet-600">Payments</TabsTrigger>
            <TabsTrigger value="dashboards" className="data-[state=active]:bg-violet-600">Dashboards</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quick Actions */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="h-5 w-5 text-emerald-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runSimulation('seed_test_data')}
                    disabled={loading === 'seed_test_data'}
                    className="w-full justify-start bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading === 'seed_test_data' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Seed Complete Test Data
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_late_rent')}
                    disabled={loading === 'create_late_rent'}
                    className="w-full justify-start bg-red-600 hover:bg-red-700"
                  >
                    {loading === 'create_late_rent' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                    Create Late Rent Scenario
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_upcoming_rent')}
                    disabled={loading === 'create_upcoming_rent'}
                    className="w-full justify-start bg-amber-600 hover:bg-amber-700"
                  >
                    {loading === 'create_upcoming_rent' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                    Create Upcoming Rent Due
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_maintenance_ticket')}
                    disabled={loading === 'create_maintenance_ticket'}
                    className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                  >
                    {loading === 'create_maintenance_ticket' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wrench className="h-4 w-4 mr-2" />}
                    Create Maintenance Ticket
                  </Button>
                </CardContent>
              </Card>


              {/* Recent Activity */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-violet-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {initialData.recentPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className={cn('h-4 w-4', payment.status === 'paid' ? 'text-emerald-400' : 'text-amber-400')} />
                        <div>
                          <p className="text-sm text-white">{payment.lease?.tenant?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">${Number(payment.amount).toFixed(0)}</p>
                        </div>
                      </div>
                      <Badge className={payment.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                  {initialData.maintenanceTickets.slice(0, 3).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-blue-400" />
                        <div>
                          <p className="text-sm text-white truncate max-w-[150px]">{ticket.title}</p>
                          <p className="text-xs text-slate-400">{ticket.tenant?.name}</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300">{ticket.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {/* Create Test Users */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-400" />
                  Create Test Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <Button
                        key={role}
                        onClick={() => createTestUser(role)}
                        disabled={loading === `create-${role}`}
                        variant="outline"
                        className="h-auto py-3 flex-col gap-2 border-slate-700 hover:bg-slate-800"
                      >
                        {loading === `create-${role}` ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <span className="text-xs">{config.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Users by Role */}
            {(Object.entries(usersByRole) as [string, any[]][]).map(([role, users]) => {
              const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || { label: role, icon: Users, color: 'bg-slate-500', path: '/' };
              const Icon = config.icon;
              return (
                <Collapsible key={role} open={expandedSections.has(role)} onOpenChange={() => toggleSection(role)}>
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            {config.label}s ({users.length})
                          </div>
                          {expandedSections.has(role) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {users.map((user: any) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-white">{user.name || 'No name'}</p>
                                <p className="text-xs text-slate-400">{user.email}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-8 border-slate-600" asChild>
                                  <Link href={config.path} target="_blank">
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </TabsContent>


          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rent Scenarios */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    Rent Payment Scenarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runSimulation('create_late_rent')}
                    disabled={!!loading}
                    className="w-full justify-start bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                    variant="outline"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Create Late Rent (Overdue)
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_upcoming_rent')}
                    disabled={!!loading}
                    className="w-full justify-start bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Create Upcoming Rent (Due Soon)
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_paid_rent')}
                    disabled={!!loading}
                    className="w-full justify-start bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Paid Rent
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_partial_payment')}
                    disabled={!!loading}
                    className="w-full justify-start bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    variant="outline"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Partial Payment
                  </Button>
                </CardContent>
              </Card>

              {/* Maintenance Scenarios */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-400" />
                    Maintenance Scenarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runSimulation('create_urgent_ticket')}
                    disabled={!!loading}
                    className="w-full justify-start bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                    variant="outline"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Create Urgent Ticket
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_normal_ticket')}
                    disabled={!!loading}
                    className="w-full justify-start bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    variant="outline"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Create Normal Ticket
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_completed_ticket')}
                    disabled={!!loading}
                    className="w-full justify-start bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Completed Ticket
                  </Button>
                </CardContent>
              </Card>


              {/* Lease Scenarios */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-violet-400" />
                    Lease Scenarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runSimulation('create_expiring_lease')}
                    disabled={!!loading}
                    className="w-full justify-start bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                    variant="outline"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Create Expiring Lease (30 days)
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_new_application')}
                    disabled={!!loading}
                    className="w-full justify-start bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Application
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_move_out')}
                    disabled={!!loading}
                    className="w-full justify-start bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 border border-slate-500/30"
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Create Move-Out Notice
                  </Button>
                </CardContent>
              </Card>

              {/* Payout Scenarios */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                    Payout Scenarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => runSimulation('create_pending_payout')}
                    disabled={!!loading}
                    className="w-full justify-start bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                    variant="outline"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Create Pending Payout
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_available_balance')}
                    disabled={!!loading}
                    className="w-full justify-start bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                    variant="outline"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Add Available Balance ($500)
                  </Button>
                  <Button
                    onClick={() => runSimulation('create_contractor_payment')}
                    disabled={!!loading}
                    className="w-full justify-start bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
                    variant="outline"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Create Contractor Payment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Recent Rent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {initialData.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          payment.status === 'paid' ? 'bg-emerald-500/20' : payment.status === 'pending' ? 'bg-amber-500/20' : 'bg-red-500/20'
                        )}>
                          <DollarSign className={cn(
                            'h-5 w-5',
                            payment.status === 'paid' ? 'text-emerald-400' : payment.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{payment.lease?.tenant?.name || 'Unknown Tenant'}</p>
                          <p className="text-xs text-slate-400">
                            {payment.lease?.unit?.property?.name} • Due: {new Date(payment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">${Number(payment.amount).toFixed(0)}</p>
                        <Badge className={cn(
                          payment.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' :
                          payment.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-red-500/20 text-red-300'
                        )}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {initialData.recentPayments.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No payments found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Dashboards Tab */}
          <TabsContent value="dashboards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <Card key={role} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', config.color)}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                          <p className="text-sm text-slate-400">{config.path}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 bg-violet-600 hover:bg-violet-700">
                          <Link href={config.path}>
                            <Eye className="h-4 w-4 mr-2" />
                            Open Dashboard
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-slate-700">
                          <Link href={config.path} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Active Leases Quick View */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-400" />
                  Active Leases ({initialData.activeLeases.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {initialData.activeLeases.map((lease) => (
                    <div key={lease.id} className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">{lease.tenant?.name}</p>
                        <Badge className="bg-emerald-500/20 text-emerald-300">Active</Badge>
                      </div>
                      <p className="text-xs text-slate-400">{lease.unit?.property?.name}</p>
                      <p className="text-xs text-slate-400">Unit: {lease.unit?.name}</p>
                      <p className="text-sm font-medium text-emerald-400 mt-1">${Number(lease.rentAmount).toFixed(0)}/mo</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
