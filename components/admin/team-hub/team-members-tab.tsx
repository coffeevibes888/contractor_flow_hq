'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, UserPlus, Mail, Shield, ShieldCheck, Crown, 
  MoreVertical, Trash2, Clock, Search, QrCode,
  Copy, Check, RefreshCw,
  Building2, Briefcase, Wrench, Calculator, RotateCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'property_manager' | 'leasing_agent' | 'showing_agent' | 'maintenance_tech' | 'accountant' | 'employee';
  status: 'pending' | 'active' | 'inactive';
  invitedEmail?: string;
  permissions: string[];
  joinedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
}

interface TeamMembersTabProps {
  members: TeamMember[];
  isEnterprise?: boolean;
  canManageTeam?: boolean;
  currentUserRole?: string;
}

const ROLE_CONFIG = {
  owner: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Owner' },
  admin: { icon: ShieldCheck, color: 'text-violet-400', bg: 'bg-violet-500/20', label: 'Admin' },
  property_manager: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Property Manager' },
  leasing_agent: { icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Leasing Agent' },
  showing_agent: { icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/20', label: 'Showing Agent' },
  maintenance_tech: { icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Maintenance Tech' },
  accountant: { icon: Calculator, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Accountant' },
  employee: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Employee' },
  // Legacy role mappings
  manager: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Property Manager' },
  member: { icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Maintenance Tech' },
};

const PERMISSION_CONFIG: Record<string, { label: string; description: string; category: string }> = {
  view_properties: { label: 'View Properties', description: 'View property listings and details', category: 'properties' },
  manage_properties: { label: 'Manage Properties', description: 'Add, edit, and delete properties', category: 'properties' },
  manage_tenants: { label: 'Manage Tenants', description: 'Add, edit tenant information', category: 'tenants' },
  process_applications: { label: 'Process Applications', description: 'Review and approve/deny applications', category: 'tenants' },
  schedule_showings: { label: 'Schedule Showings', description: 'Schedule property showings', category: 'tenants' },
  manage_maintenance: { label: 'Manage Maintenance', description: 'Create and manage work orders', category: 'maintenance' },
  view_financials: { label: 'View Financials', description: 'View financial reports (read-only)', category: 'finances' },
  manage_finances: { label: 'Manage Finances', description: 'Process payments and refunds', category: 'finances' },
  manage_team: { label: 'Manage Team', description: 'Invite and manage team members', category: 'team' },
  manage_schedule: { label: 'Manage Schedule', description: 'Create team schedules and shifts', category: 'team' },
  approve_timesheets: { label: 'Approve Timesheets', description: 'Review and approve timesheets', category: 'team' },
  view_reports: { label: 'View Reports', description: 'Access analytics dashboards', category: 'reports' },
};

const PERMISSION_CATEGORIES = [
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'finances', label: 'Finances', icon: Calculator },
  { id: 'team', label: 'Team', icon: Briefcase },
  { id: 'reports', label: 'Reports', icon: ShieldCheck },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  owner: Object.keys(PERMISSION_CONFIG),
  admin: Object.keys(PERMISSION_CONFIG),
  property_manager: ['view_properties', 'manage_properties', 'manage_tenants', 'process_applications', 'schedule_showings', 'manage_maintenance', 'view_financials', 'manage_schedule', 'approve_timesheets', 'view_reports'],
  leasing_agent: ['view_properties', 'manage_tenants', 'process_applications', 'schedule_showings'],
  showing_agent: ['view_properties', 'schedule_showings'],
  maintenance_tech: ['view_properties', 'manage_maintenance'],
  accountant: ['view_properties', 'view_financials', 'manage_finances', 'view_reports'],
  employee: ['view_properties'],
};

export function TeamMembersTab({ 
  members: initialMembers, 
  isEnterprise = false,
  canManageTeam = false,
  currentUserRole = 'employee',
}: TeamMembersTabProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPermissionsDialog, setShowPermissionsDialog] = useState<TeamMember | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteSendEmail, setInviteSendEmail] = useState(true);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showJobSiteDialog, setShowJobSiteDialog] = useState(false);
  const [jobSiteRole, setJobSiteRole] = useState<string>('employee');
  const [jobSiteQrDataUrl, setJobSiteQrDataUrl] = useState<string | null>(null);
  const [jobSiteInviteUrl, setJobSiteInviteUrl] = useState<string | null>(null);
  const [isGeneratingJobSite, setIsGeneratingJobSite] = useState(false);
  const [copiedJobSiteLink, setCopiedJobSiteLink] = useState(false);

  const generateQRCode = async (url: string): Promise<string> => {
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#ffffff', light: '#1e1b4b' } });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsLoading(true);
    setInviteError(null);
    
    try {
      const res = await fetch('/api/landlord/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          phone: invitePhone.trim() || undefined,
          sendEmail: inviteSendEmail,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setInviteSuccess(true);
        if (data.member) {
          setMembers([...members, data.member]);
        }
        // Generate QR code if we got an invite URL back
        if (data.inviteUrl) {
          setInviteUrl(data.inviteUrl);
          try {
            const qr = await generateQRCode(data.inviteUrl);
            setQrDataUrl(qr);
          } catch { /* non-critical */ }
          setShowInviteDialog(false);
          setShowQRDialog(true);
          setInviteEmail('');
          setInviteRole('employee');
          setInvitePhone('');
          setInviteSendEmail(true);
          setInviteSuccess(false);
        } else {
          setTimeout(() => {
            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRole('employee');
            setInvitePhone('');
            setInviteSendEmail(true);
            setInviteSuccess(false);
          }, 1500);
        }
      } else {
        setInviteError(data.message || 'Failed to send invitation');
      }
    } catch {
      setInviteError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateJobSiteInvite = async () => {
    setIsGeneratingJobSite(true);
    try {
      const res = await fetch('/api/landlord/team/invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: jobSiteRole }),
      });
      const data = await res.json();
      if (data.success && data.inviteUrl) {
        setJobSiteInviteUrl(data.inviteUrl);
        try {
          const qr = await generateQRCode(data.inviteUrl);
          setJobSiteQrDataUrl(qr);
        } catch { /* non-critical */ }
      } else {
        alert(data.message || 'Failed to generate invite link');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsGeneratingJobSite(false);
    }
  };

  const handleCopyLink = async (url: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(url);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch { /* ignore */ }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      const res = await fetch(`/api/landlord/team/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        alert(data.message || 'Failed to remove member');
      }
    } catch {
      alert('Failed to remove member');
    }
  };

  const handleClearAllInvites = async () => {
    if (!confirm('Are you sure you want to clear all pending invitations?')) return;
    
    try {
      const res = await fetch('/api/landlord/team/clear-invites', {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.filter(m => m.status !== 'pending'));
        alert(data.message);
      } else {
        alert(data.message || 'Failed to clear invites');
      }
    } catch {
      alert('Failed to clear invites');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/landlord/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, keepCustomPermissions: false }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.map(m => 
          m.id === memberId 
            ? { ...m, role: data.newRole || newRole as TeamMember['role'], permissions: data.newPermissions || DEFAULT_PERMISSIONS[newRole] || [] } 
            : m
        ));
      } else {
        alert(data.message || 'Failed to update role');
      }
    } catch {
      alert('Failed to update role');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!showPermissionsDialog) return;
    
    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/landlord/team/${showPermissionsDialog.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.map(m => 
          m.id === showPermissionsDialog.id ? { ...m, permissions: data.permissions || selectedPermissions } : m
        ));
        setShowPermissionsDialog(null);
      } else {
        alert(data.message || 'Failed to update permissions');
      }
    } catch {
      alert('Failed to update permissions');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!showPermissionsDialog) return;
    
    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/landlord/team/${showPermissionsDialog.id}/permissions/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedPermissions(data.permissions || []);
        setMembers(members.map(m => 
          m.id === showPermissionsDialog.id ? { ...m, permissions: data.permissions || [] } : m
        ));
      } else {
        alert(data.message || 'Failed to reset permissions');
      }
    } catch {
      alert('Failed to reset permissions');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const openPermissionsDialog = (member: TeamMember) => {
    setShowPermissionsDialog(member);
    setSelectedPermissions(member.permissions || []);
  };

  const togglePermission = (permission: string) => {
    // Don't allow removing view_properties (minimum access)
    if (permission === 'view_properties' && selectedPermissions.includes(permission)) {
      return;
    }
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');
  
  // Calculate team limits based on tier
  const maxMembers = isEnterprise ? Infinity : 6; // Pro: 5 members + 1 owner = 6 total
  const isAtLimit = !isEnterprise && activeMembers.length >= maxMembers;
  
  const filteredActive = activeMembers.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.invitedEmail?.toLowerCase().includes(q)
    );
  });

  // Pro plan roles
  const proRoles = ['admin', 'property_manager', 'leasing_agent', 'showing_agent'];
  // Enterprise-only roles
  const enterpriseRoles = ['maintenance_tech', 'accountant', 'employee'];
  
  const availableRoles = isEnterprise 
    ? [...proRoles, ...enterpriseRoles]
    : proRoles;

  // Check if member has custom permissions (different from role defaults)
  const hasCustomPermissions = (member: TeamMember) => {
    const defaults = DEFAULT_PERMISSIONS[member.role] || [];
    if (!member.permissions || member.permissions.length !== defaults.length) return true;
    return !defaults.every(p => member.permissions.includes(p));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeMembers.length}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingMembers.length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activeMembers.filter(m => m.role === 'admin' || m.role === 'property_manager').length}
                </p>
                <p className="text-xs text-slate-400">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Crown className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {isEnterprise ? '∞' : `${activeMembers.length}/${maxMembers}`}
                </p>
                <p className="text-xs text-slate-400">{isEnterprise ? 'Unlimited' : 'Team Limit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Invite */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-white"
          />
        </div>
        {canManageTeam && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setShowInviteDialog(true)}
              disabled={isAtLimit}
              className="bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={isAtLimit ? 'Team limit reached. Upgrade to Enterprise for unlimited members.' : 'Invite a new team member'}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
            <Button
              onClick={() => { setShowJobSiteDialog(true); setJobSiteQrDataUrl(null); setJobSiteInviteUrl(null); }}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
              title="Generate a QR code for on-site sign-up"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Job Site QR
            </Button>
          </div>
        )}
      </div>

      {/* Team Limit Warning for Pro */}
      {!isEnterprise && isAtLimit && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400">Team Limit Reached</p>
              <p className="text-sm text-amber-300/80 mt-1">
                You've reached the Pro plan limit of 6 team members (5 members + owner). 
                Upgrade to Enterprise for unlimited team members and advanced team operations features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Members */}
      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredActive.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? 'No members found' : 'No active team members yet'}</p>
              {!searchQuery && (
                <p className="text-sm mt-1">Invite your first team member to get started</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredActive.map((member) => {
                const roleKey = member.role as keyof typeof ROLE_CONFIG;
                const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.employee;
                const RoleIcon = config.icon;
                const isCustomized = hasCustomPermissions(member);
                
                return (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {member.user?.image ? (
                          <img src={member.user.image} alt="" className="h-11 w-11 object-cover" />
                        ) : (
                          <span className="text-white font-medium text-lg">
                            {(member.user?.name || member.invitedEmail || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {member.user?.name || member.invitedEmail}
                        </p>
                        <p className="text-sm text-slate-400">{member.user?.email || member.invitedEmail}</p>
                        {member.joinedAt && (
                          <p className="text-xs text-slate-500">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bg} ${config.color} border-0`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {isCustomized && member.role !== 'owner' && (
                          <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      
                      {member.role !== 'owner' && canManageTeam && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 w-52">
                            <div className="px-2 py-1.5 text-xs text-slate-400 font-medium">Change Role</div>
                            {availableRoles.map(role => {
                              const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                              return (
                                <DropdownMenuItem 
                                  key={role}
                                  onClick={() => handleUpdateRole(member.id, role)}
                                  className={`text-slate-200 focus:bg-white/10 ${member.role === role ? 'bg-white/5' : ''}`}
                                >
                                  {roleConfig?.label || role}
                                  {member.role === role && <span className="ml-auto text-violet-400">✓</span>}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => openPermissionsDialog(member)}
                              className="text-slate-200 focus:bg-white/10"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Customize Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-400 focus:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && canManageTeam && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Pending Invitations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllInvites}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-500/10">
              {pendingMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.invitedEmail}</p>
                      <p className="text-sm text-amber-400">Invitation sent • Expires in 7 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      {ROLE_CONFIG[member.role]?.label || member.role}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) {
          setInviteError(null);
          setInviteSuccess(false);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
            <DialogDescription className="text-slate-400">
              Send an invitation to join your property management team.
              {!isEnterprise && (
                <span className="block mt-2 text-amber-400 text-sm">
                  Pro plan: {activeMembers.length}/{maxMembers} team members used
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {inviteError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {inviteError}
              </div>
            )}
            
            {inviteSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                ✓ Invitation sent successfully!
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                }}
                className="bg-slate-800 border-white/10 text-white"
                disabled={isLoading || inviteSuccess}
              />
              <p className="text-xs text-slate-500">
                If they don&apos;t have an account, they&apos;ll be invited to sign up.
              </p>
            </div>

{/* Phone/SMS field — uncomment when Twilio account is active
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Phone Number <span className="text-slate-500 font-normal">(optional — for SMS)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="pl-9 bg-slate-800 border-white/10 text-white"
                  disabled={isLoading || inviteSuccess}
                />
              </div>
              <p className="text-xs text-slate-500">Requires Twilio to be configured.</p>
            </div>
*/}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Role</label>
              <Select 
                value={inviteRole} 
                onValueChange={setInviteRole}
                disabled={isLoading || inviteSuccess}
              >
                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {availableRoles.map(role => {
                    const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                    const Icon = config?.icon || Shield;
                    return (
                      <SelectItem key={role} value={role} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config?.color || 'text-slate-400'}`} />
                          {config?.label || role}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Role descriptions */}
              <div className="text-xs text-slate-500 space-y-1.5 mt-3 p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <p className="text-slate-400 font-medium mb-2">Role Descriptions:</p>
                <p><span className="text-violet-400">Admin:</span> Full operational access, can manage team</p>
                <p><span className="text-blue-400">Property Manager:</span> Manages properties, tenants, schedules</p>
                <p><span className="text-cyan-400">Leasing Agent:</span> Handles applications and leasing</p>
                <p><span className="text-teal-400">Showing Agent:</span> Conducts property showings</p>
                {isEnterprise && (
                  <>
                    <p><span className="text-orange-400">Maintenance Tech:</span> Handles repairs and work orders</p>
                    <p><span className="text-emerald-400">Accountant:</span> Manages financial records</p>
                    <p><span className="text-slate-400">Employee:</span> Basic access, time clock only</p>
                  </>
                )}
                <p className="text-slate-500 mt-2 pt-2 border-t border-white/5">
                  You can customize permissions after inviting.
                </p>
              </div>
            </div>

            {/* Delivery option — let the PM choose whether to email the invite
                or skip and just share the QR / link manually. Mirrors the
                "Send invite email" toggle on the tenant form. */}
            <div className="rounded-lg bg-slate-800/40 border border-white/5 p-3 flex items-start gap-3">
              <input
                id="invite-send-email"
                type="checkbox"
                checked={inviteSendEmail}
                onChange={(e) => setInviteSendEmail(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-violet-500 focus:ring-violet-500"
              />
              <div className="flex-1">
                <label htmlFor="invite-send-email" className="text-sm font-medium text-slate-200 cursor-pointer">
                  Email this invite
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uncheck to skip the email — you&apos;ll get a QR code and link to share directly.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleInvite}
              disabled={isLoading || !inviteEmail.trim() || inviteSuccess}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isLoading ? 'Sending...' : inviteSuccess ? '✓ Sent!' : (inviteSendEmail ? 'Send Invitation' : 'Generate Invite Link')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Share Dialog (shown after email invite is sent) */}
      <Dialog open={showQRDialog} onOpenChange={(open) => { if (!open) { setShowQRDialog(false); setQrDataUrl(null); setInviteUrl(null); } }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-violet-400" />
              Invite Sent!
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Email sent. Share this QR code or link for quick access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {qrDataUrl && (
              <div className="flex justify-center">
                <div className="rounded-xl overflow-hidden border-4 border-violet-500/30 shadow-lg shadow-violet-500/10">
                  <img src={qrDataUrl} alt="Invite QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}
            {!qrDataUrl && (
              <div className="flex justify-center items-center h-48 text-slate-500">
                <QrCode className="h-16 w-16 opacity-30" />
              </div>
            )}

            {inviteUrl && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">Invite Link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className="bg-slate-800 border-white/10 text-slate-300 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/10 flex-shrink-0"
                    onClick={() => handleCopyLink(inviteUrl, setCopiedLink)}
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">Link expires in 7 days</p>
          </div>

          <DialogFooter>
            <Button onClick={() => { setShowQRDialog(false); setQrDataUrl(null); setInviteUrl(null); }} className="bg-violet-600 hover:bg-violet-500 w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Site QR Code Dialog */}
      <Dialog open={showJobSiteDialog} onOpenChange={(open) => { if (!open) { setShowJobSiteDialog(false); setJobSiteQrDataUrl(null); setJobSiteInviteUrl(null); } }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-400" />
              Job Site Invite
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Show this QR code on-site. Anyone who scans it can create an account and join with the selected role — no email required.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Role for new joiners</label>
              <Select value={jobSiteRole} onValueChange={(v) => { setJobSiteRole(v); setJobSiteQrDataUrl(null); setJobSiteInviteUrl(null); }}>
                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {availableRoles.map(role => {
                    const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                    const Icon = config?.icon || Shield;
                    return (
                      <SelectItem key={role} value={role} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config?.color || 'text-slate-400'}`} />
                          {config?.label || role}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {jobSiteQrDataUrl ? (
              <>
                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden border-4 border-orange-500/30 shadow-lg shadow-orange-500/10">
                    <img src={jobSiteQrDataUrl} alt="Job Site QR Code" className="w-48 h-48" />
                  </div>
                </div>

                {jobSiteInviteUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Or share the link</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={jobSiteInviteUrl}
                        className="bg-slate-800 border-white/10 text-slate-300 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/10 flex-shrink-0"
                        onClick={() => handleCopyLink(jobSiteInviteUrl, setCopiedJobSiteLink)}
                      >
                        {copiedJobSiteLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-300 hover:bg-white/10 flex-1"
                    onClick={() => { setJobSiteQrDataUrl(null); setJobSiteInviteUrl(null); }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Code
                  </Button>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-500 flex-1"
                    onClick={() => setShowJobSiteDialog(false)}
                  >
                    Done
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">This code is single-use and expires in 7 days.</p>
              </>
            ) : (
              <Button
                onClick={handleGenerateJobSiteInvite}
                disabled={isGeneratingJobSite}
                className="w-full bg-orange-600 hover:bg-orange-500"
              >
                {isGeneratingJobSite ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><QrCode className="h-4 w-4 mr-2" /> Generate QR Code</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Permissions Dialog */}
      <Dialog open={!!showPermissionsDialog} onOpenChange={(open) => {
        if (!open) setShowPermissionsDialog(null);
      }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <Shield className="h-5 w-5 text-violet-400" />
              Customize Permissions
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {showPermissionsDialog?.user?.name || showPermissionsDialog?.invitedEmail} • {ROLE_CONFIG[showPermissionsDialog?.role as keyof typeof ROLE_CONFIG]?.label || showPermissionsDialog?.role}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Info banner */}
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-sm text-violet-300">
                Toggle permissions on or off to customize what this team member can access. 
                Changes take effect immediately after saving.
              </p>
            </div>

            {/* Permissions by category */}
            {PERMISSION_CATEGORIES.map(category => {
              const categoryPermissions = Object.entries(PERMISSION_CONFIG)
                .filter(([_, config]) => config.category === category.id);
              
              if (categoryPermissions.length === 0) return null;
              
              const CategoryIcon = category.icon;
              
              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CategoryIcon className="h-4 w-4" />
                    <span className="font-medium">{category.label}</span>
                  </div>
                  <div className="space-y-2">
                    {categoryPermissions.map(([permKey, permConfig]) => {
                      const isEnabled = selectedPermissions.includes(permKey);
                      const isDefault = DEFAULT_PERMISSIONS[showPermissionsDialog?.role || 'employee']?.includes(permKey);
                      const isViewProperties = permKey === 'view_properties';
                      
                      return (
                        <div 
                          key={permKey}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isEnabled 
                              ? 'bg-slate-800/80 border-violet-500/30' 
                              : 'bg-slate-800/40 border-white/5'
                          }`}
                        >
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{permConfig.label}</p>
                              {isDefault && (
                                <Badge variant="outline" className="border-slate-500/30 text-slate-400 text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{permConfig.description}</p>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => togglePermission(permKey)}
                            disabled={isViewProperties || isSavingPermissions}
                            className="data-[state=checked]:bg-violet-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Note about view_properties */}
            <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5">
              <p className="text-xs text-slate-500">
                <strong>Note:</strong> &quot;View Properties&quot; is always enabled as it&apos;s required for basic access.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between w-full">
              <Button 
                variant="ghost" 
                onClick={handleResetPermissions}
                disabled={isSavingPermissions}
                className="text-slate-400 hover:text-white"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowPermissionsDialog(null)} disabled={isSavingPermissions}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePermissions}
                  disabled={isSavingPermissions}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
