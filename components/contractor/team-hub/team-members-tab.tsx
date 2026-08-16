'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, UserPlus, Mail, Shield, ShieldCheck, Crown, 
  MoreVertical, Trash2, Clock, Search,
  Building2, Briefcase, Wrench, Calculator, RotateCcw,
  Truck, HardHat, FileText, DollarSign, Package, Loader2
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
import { useToast } from '@/hooks/use-toast';
import { UpgradeModal } from '@/components/contractor/subscription/UpgradeModal';

/** Shape returned by GET /api/contractor/team/roles */
interface ContractorRoleRecord {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  isCustom: boolean;
  _count?: { employees: number };
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  roleId?: string | null;
  status: 'pending' | 'active' | 'inactive';
  invitedEmail?: string;
  permissions: string[];
  joinedAt?: string;
  createdAt: string;
  assignedRole?: { id: string; name: string } | null;
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

// Icon lookup by role key / name (case-insensitive partial match)
const ROLE_ICON_MAP: Record<string, { icon: typeof Crown; color: string; bg: string }> = {
  owner:             { icon: Crown,       color: 'text-amber-600',   bg: 'bg-amber-50 border border-amber-100' },
  manager:           { icon: Briefcase,   color: 'text-blue-600',    bg: 'bg-blue-50 border border-blue-100' },
  foreman:           { icon: HardHat,     color: 'text-orange-600',  bg: 'bg-orange-50 border border-orange-100' },
  technician:        { icon: Wrench,      color: 'text-green-600',   bg: 'bg-green-50 border border-green-100' },
  driver:            { icon: Truck,       color: 'text-cyan-600',    bg: 'bg-cyan-50 border border-cyan-100' },
  office_admin:      { icon: FileText,    color: 'text-pink-600',    bg: 'bg-pink-50 border border-pink-100' },
  bookkeeper:        { icon: Calculator,  color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100' },
  sales:             { icon: DollarSign,  color: 'text-yellow-600',  bg: 'bg-yellow-50 border border-yellow-100' },
  warehouse_manager: { icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50 border border-indigo-100' },
  payroll_manager:   { icon: DollarSign,  color: 'text-teal-600',    bg: 'bg-teal-50 border border-teal-100' },
  helper:            { icon: Users,       color: 'text-slate-600',   bg: 'bg-slate-50 border border-slate-100' },
};

const DEFAULT_ROLE_STYLE = { icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50 border border-slate-100' };

/** Resolve icon/color for a role name (fuzzy match on key words) */
function getRoleStyle(roleName: string) {
  const lower = roleName.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, style] of Object.entries(ROLE_ICON_MAP)) {
    if (lower.includes(key.replace('_', ''))) return style;
  }
  return DEFAULT_ROLE_STYLE;
}

/** Get display name for a member — prefer assignedRole.name, fall back to legacy role field */
function getMemberRoleName(member: TeamMember | null | undefined): string {
  if (!member) return 'Team Member';
  return member.assignedRole?.name || member.role || 'Team Member';
}

export function TeamMembersTab({ 
  members: initialMembers, 
  isEnterprise = false,
  canManageTeam = false,
  currentUserRole = 'employee',
}: TeamMembersTabProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPermissionsDialog, setShowPermissionsDialog] = useState<TeamMember | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'limit' | 'feature'>('limit');

  // Roles fetched from the API (ContractorRole records)
  const [roles, setRoles] = useState<ContractorRoleRecord[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Fetch contractor roles on mount
  useEffect(() => {
    async function fetchRoles() {
      setRolesLoading(true);
      try {
        const res = await fetch('/api/contractor/team/roles');
        const data = await res.json();
        if (data.roles && Array.isArray(data.roles)) {
          // Filter out the Owner role — you can't invite someone as Owner
          const assignable = (data.roles as ContractorRoleRecord[]).filter(
            (r) => r.name.toLowerCase() !== 'owner'
          );
          setRoles(assignable);
          // Default to the first assignable role
          if (assignable.length > 0 && !inviteRoleId) {
            setInviteRoleId(assignable[0].id);
          }
        }
      } catch {
        console.error('Failed to fetch contractor roles');
      } finally {
        setRolesLoading(false);
      }
    }
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!inviteRoleId) {
      setInviteError('Please select a role');
      return;
    }
    
    setIsLoading(true);
    setInviteError(null);

    // Find the selected role record so we can send both roleId and a legacy role name
    const selectedRole = roles.find((r) => r.id === inviteRoleId);
    
    try {
      const res = await fetch('/api/contractor/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          roleId: inviteRoleId,
          role: selectedRole?.name.toLowerCase().replace(/[\s/]+/g, '_') || 'technician',
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setInviteSuccess(true);
        if (data.member) {
          setMembers([...members, data.member]);
        }
        // Surface email delivery status so the owner isn't left guessing
        // why the invitee never got an email. The invite record is still
        // created either way; we just keep the dialog open longer with the
        // warning if email failed.
        if (data.emailSent === false) {
          setInviteError(
            `Invite created, but email could not be sent: ${data.emailError ?? 'unknown error'}. ` +
            `Copy this link and share it manually: ${data.inviteUrl ?? data.inviteLink ?? ''}`
          );
        } else {
          setTimeout(() => {
            setShowInviteDialog(false);
            setInviteEmail('');
            setInviteRoleId(roles[0]?.id || '');
            setInviteSuccess(false);
          }, 1500);
        }
      } else {
        // Check if it's a feature lock or limit error
        if (data.featureLocked || data.limitReached) {
          setShowInviteDialog(false);
          setUpgradeReason(data.limitReached ? 'limit' : 'feature');
          setShowUpgradeModal(true);
        } else {
          setInviteError(data.message || 'Failed to send invitation');
        }
      }
    } catch {
      setInviteError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      const res = await fetch(`/api/contractor/team/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to remove member', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const handleClearAllInvites = async () => {
    if (!confirm('Are you sure you want to clear all pending invitations?')) return;
    
    try {
      const res = await fetch('/api/contractor/team/clear-invites', {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setMembers(members.filter(m => m.status !== 'pending'));
        toast({ title: 'Success', description: data.message });
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to clear invites', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to clear invites', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (memberId: string, newRoleId: string) => {
    try {
      const res = await fetch(`/api/contractor/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: newRoleId, keepCustomPermissions: false }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh the member in local state
        const updatedRole = roles.find((r) => r.id === newRoleId);
        setMembers(members.map(m => 
          m.id === memberId 
            ? { 
                ...m, 
                roleId: newRoleId,
                assignedRole: updatedRole ? { id: updatedRole.id, name: updatedRole.name } : m.assignedRole,
                role: data.newRole || m.role,
                permissions: data.newPermissions || m.permissions,
              } 
            : m
        ));
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to update role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleUpdatePermissions = async () => {
    if (!showPermissionsDialog) return;
    
    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/contractor/team/${showPermissionsDialog.id}/permissions`, {
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
        toast({ title: 'Error', description: data.message || 'Failed to update permissions', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update permissions', variant: 'destructive' });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!showPermissionsDialog) return;
    
    setIsSavingPermissions(true);
    try {
      const res = await fetch(`/api/contractor/team/${showPermissionsDialog.id}/permissions/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedPermissions(data.permissions || []);
        setMembers(members.map(m => 
          m.id === showPermissionsDialog.id ? { ...m, permissions: data.permissions || [] } : m
        ));
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to reset permissions', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reset permissions', variant: 'destructive' });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const openPermissionsDialog = (member: TeamMember) => {
    setShowPermissionsDialog(member);
    setSelectedPermissions(member.permissions || []);
  };

  const togglePermission = (permission: string) => {
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

  // Check if member has custom permissions (different from role defaults)
  const hasCustomPermissions = (member: TeamMember) => {
    if (!member.assignedRole) return false;
    const roleRecord = roles.find((r) => r.id === member.roleId);
    if (!roleRecord) return false;
    const defaults = roleRecord.permissions || [];
    if (!member.permissions || member.permissions.length !== defaults.length) return true;
    return !defaults.every(p => member.permissions.includes(p));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeMembers.length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingMembers.length}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {activeMembers.filter(m => m.role === 'admin' || m.role === 'manager').length}
                </p>
                <p className="text-xs text-gray-500">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <Crown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isEnterprise ? '∞' : `${activeMembers.length}/${maxMembers}`}
                </p>
                <p className="text-xs text-gray-500">{isEnterprise ? 'Unlimited' : 'Team Limit'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Invite */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        {canManageTeam && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setShowInviteDialog(true)}
              disabled={isAtLimit}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title={isAtLimit ? 'Team limit reached. Upgrade to Enterprise for unlimited members.' : 'Invite a new team member'}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Team Limit Warning for Pro */}
      {!isEnterprise && isAtLimit && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">Team Limit Reached</p>
              <p className="text-sm text-amber-700/80 mt-1">
                You've reached the Pro plan limit of 6 team members (5 members + owner). 
                Upgrade to Enterprise for unlimited team members and advanced team operations features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Members */}
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-gray-900 text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-700" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredActive.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Users className="h-7 w-7 text-gray-300" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                {searchQuery ? 'No members found' : 'No active team members yet'}
              </h3>
              {!searchQuery && (
                <p className="text-sm text-gray-500">Invite your first team member to get started</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredActive.map((member) => {
                const roleName = getMemberRoleName(member);
                const style = getRoleStyle(roleName);
                const RoleIcon = style.icon;
                const isCustomized = hasCustomPermissions(member);
                
                return (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {member.user?.image ? (
                          <img src={member.user.image} alt="" className="h-11 w-11 object-cover" />
                        ) : (
                          <span className="text-gray-700 font-medium text-lg">
                            {(member.user?.name || member.invitedEmail || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold">
                          {member.user?.name || member.invitedEmail}
                        </p>
                        <p className="text-sm text-gray-500">{member.user?.email || member.invitedEmail}</p>
                        {member.joinedAt && (
                          <p className="text-xs text-gray-400">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`${style.bg} ${style.color} font-medium`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleName}
                        </Badge>
                        {isCustomized && roleName.toLowerCase() !== 'owner' && (
                          <Badge variant="outline" className="border-violet-200 text-violet-600 bg-violet-50 text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      
                      {roleName.toLowerCase() !== 'owner' && canManageTeam && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-gray-200 w-52">
                            <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">Change Role</div>
                            {roles.map(roleRecord => {
                              const rStyle = getRoleStyle(roleRecord.name);
                              const isActive = member.roleId === roleRecord.id;
                              return (
                                <DropdownMenuItem 
                                  key={roleRecord.id}
                                  onClick={() => handleUpdateRole(member.id, roleRecord.id)}
                                  className={`text-gray-700 focus:bg-gray-100 ${isActive ? 'bg-gray-50' : ''}`}
                                >
                                  <rStyle.icon className={`h-4 w-4 mr-2 ${rStyle.color}`} />
                                  {roleRecord.name}
                                  {isActive && <span className="ml-auto text-violet-600">✓</span>}
                                </DropdownMenuItem>
                              );
                            })}
                            <DropdownMenuSeparator className="bg-gray-100" />
                            <DropdownMenuItem 
                              onClick={() => openPermissionsDialog(member)}
                              className="text-gray-700 focus:bg-gray-100"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Customize Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-100" />
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 focus:bg-red-50"
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
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="border-b border-amber-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-900 flex items-center gap-2 text-base font-bold">
                <Clock className="h-5 w-5 text-amber-600" />
                Pending Invitations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllInvites}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-200">
              {pendingMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between bg-white/60">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">{member.invitedEmail}</p>
                      <p className="text-sm text-amber-700">Invitation sent · Expires in 7 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                      {getMemberRoleName(member)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
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
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Invite Team Member</DialogTitle>
            <DialogDescription className="text-gray-600">
              Send an invitation to join your contractor team.
              {!isEnterprise && (
                <span className="block mt-2 text-amber-600 text-sm">
                  Pro plan: {activeMembers.length}/{maxMembers} team members used
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {inviteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {inviteError}
              </div>
            )}
            
            {inviteSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                ✓ Invitation sent successfully!
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                }}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                disabled={isLoading || inviteSuccess}
              />
              <p className="text-xs text-gray-500">
                If they don&apos;t have an account, they&apos;ll be invited to sign up.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Role</label>
              {rolesLoading ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading roles...
                </div>
              ) : roles.length === 0 ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-sm">
                  No roles available. Roles will be created automatically.
                </div>
              ) : (
                <Select 
                  value={inviteRoleId} 
                  onValueChange={setInviteRoleId}
                  disabled={isLoading || inviteSuccess}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {roles.map(roleRecord => {
                      const style = getRoleStyle(roleRecord.name);
                      const Icon = style.icon;
                      return (
                        <SelectItem key={roleRecord.id} value={roleRecord.id} className="text-gray-900">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${style.color}`} />
                            {roleRecord.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              
              {/* Role description for selected role */}
              {inviteRoleId && (() => {
                const selected = roles.find((r) => r.id === inviteRoleId);
                if (!selected?.description) return null;
                return (
                  <div className="text-xs text-gray-600 mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-gray-900 font-semibold mb-1">{selected.name}</p>
                    <p>{selected.description}</p>
                    <p className="mt-1 text-gray-500">
                      {(selected.permissions as string[]).length} permissions assigned
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)} disabled={isLoading} className="text-gray-700 hover:bg-gray-100">
              Cancel
            </Button>
            <Button 
              onClick={handleInvite}
              disabled={isLoading || !inviteEmail.trim() || inviteSuccess}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold"
            >
              {isLoading ? 'Sending...' : inviteSuccess ? '✓ Sent!' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Permissions Dialog */}
      <Dialog open={!!showPermissionsDialog} onOpenChange={(open) => {
        if (!open) setShowPermissionsDialog(null);
      }}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3">
              <Shield className="h-5 w-5 text-violet-600" />
              Customize Permissions
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {showPermissionsDialog?.user?.name || showPermissionsDialog?.invitedEmail} · {getMemberRoleName(showPermissionsDialog!)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Info banner */}
            <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
              <p className="text-sm text-violet-700">
                Toggle permissions on or off to customize what this team member can access. 
                Changes take effect immediately after saving.
              </p>
            </div>

            {/* Permissions grouped by category (derived from permission keys like "jobs.view") */}
            {(() => {
              // Build categories from the member's current permissions + their role's default permissions
              const memberRole = roles.find((r) => r.id === showPermissionsDialog?.roleId);
              const rolePerms: string[] = (memberRole?.permissions as string[]) || [];
              const allPerms = Array.from(new Set([...selectedPermissions, ...rolePerms]));
              
              // Group by prefix (e.g. "jobs", "customers", "invoices")
              const grouped: Record<string, string[]> = {};
              for (const perm of allPerms) {
                const [category] = perm.split('.');
                if (!grouped[category]) grouped[category] = [];
                if (!grouped[category].includes(perm)) grouped[category].push(perm);
              }

              const categoryIcons: Record<string, typeof Wrench> = {
                jobs: Wrench, customers: Users, invoices: FileText, payments: DollarSign,
                estimates: FileText, team: Users, time: Clock, inventory: Package,
                equipment: Wrench, trucks: Truck, financials: DollarSign, expenses: DollarSign,
                payroll: DollarSign, reports: Shield, analytics: Shield, settings: Shield,
                messages: Mail, leads: Users, marketing: Users,
              };

              return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, perms]) => {
                const CategoryIcon = categoryIcons[category] || Shield;
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-800">
                      <CategoryIcon className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold capitalize">{category}</span>
                    </div>
                    <div className="space-y-2">
                      {perms.sort().map((perm) => {
                        const isEnabled = selectedPermissions.includes(perm);
                        const isDefault = rolePerms.includes(perm);
                        const [, action] = perm.split('.');
                        const label = perm.replace('.', ' → ').replace(/_/g, ' ');
                        
                        return (
                          <div 
                            key={perm}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              isEnabled 
                                ? 'bg-violet-50 border-violet-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 capitalize">{label}</p>
                                {isDefault && (
                                  <Badge variant="outline" className="border-gray-300 text-gray-600 bg-white text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                {action?.replace(/_/g, ' ')} access for {category}
                              </p>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => togglePermission(perm)}
                              disabled={isSavingPermissions}
                              className="data-[state=checked]:bg-violet-600"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
            
            {/* Note about minimum access */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600">
                <strong className="text-gray-700">Note:</strong> Permissions are based on the assigned role. Custom overrides replace the role defaults entirely.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between w-full">
              <Button 
                variant="ghost" 
                onClick={handleResetPermissions}
                disabled={isSavingPermissions}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowPermissionsDialog(null)} disabled={isSavingPermissions} className="text-gray-700 hover:bg-gray-100">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePermissions}
                  disabled={isSavingPermissions}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold"
                >
                  {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={upgradeReason === 'limit' ? 'team members' : 'Team Management'}
        currentTier={isEnterprise ? 'pro' : 'starter'}
        requiredTier={upgradeReason === 'limit' ? 'enterprise' : 'pro'}
        currentLimit={isEnterprise ? 6 : 0}
        requiredLimit={upgradeReason === 'limit' ? -1 : 6}
        benefits={
          upgradeReason === 'limit'
            ? [
                'Unlimited team members',
                'Advanced team operations',
                'Shift management',
                'Payroll integration',
                'Performance tracking',
                'Team analytics',
              ]
            : [
                'Invite up to 6 team members',
                'Team chat with channels',
                'Role-based permissions',
                'Schedule management',
                'Time tracking & timesheets',
                'Team performance reports',
              ]
        }
      />
    </div>
  );
}
