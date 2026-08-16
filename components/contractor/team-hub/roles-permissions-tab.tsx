'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  RefreshCw,
  Loader2,
  Plus,
  Crown,
  Save,
  AlertTriangle,
  Lock,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isCustom: boolean;
  _count?: { employees: number };
}

interface Props {
  /** Whether the current user is the contractor owner — only owners get write access. */
  isOwner: boolean;
}

/**
 * Roles & Permissions tab.
 *
 * Owner-only management UI for the contractor's role records:
 *   - View every role with its permission set
 *   - Toggle individual permissions on a role and save
 *   - Sync built-in roles to the latest defaults from the codebase
 *   - Create / soft-delete custom roles
 *
 * The Owner role is shown but rendered read-only (it always has full access).
 */
export function RolesPermissionsTab({ isOwner }: Props) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [editPermissions, setEditPermissions] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ── Load roles ───────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch('/api/contractor/team/roles');
      const data = await res.json();
      if (Array.isArray(data.roles)) {
        setRoles(data.roles);
      }
    } catch {
      // ignore — UI shows empty
    } finally {
      setLoading(false);
    }
  }

  // The full superset of permissions across all roles — used to render the
  // permission matrix when editing a role.
  const allPermissions = useMemo(() => {
    const set = new Set<string>();
    for (const r of roles) {
      for (const p of r.permissions || []) set.add(p);
    }
    // Sort for stable display
    return [...set].sort();
  }, [roles]);

  const groupedAllPermissions = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    for (const p of allPermissions) {
      const [category] = p.split('.');
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(p);
    }
    return grouped;
  }, [allPermissions]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleSyncDefaults() {
    if (!confirm(
      'Update all built-in roles to the latest default permissions? Custom roles and per-employee overrides will not be touched.',
    )) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/contractor/team/roles/sync-defaults', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message);
        await fetchRoles();
      } else {
        setSyncMessage(data.error || 'Failed to sync defaults');
      }
    } catch {
      setSyncMessage('Network error syncing defaults');
    } finally {
      setSyncing(false);
    }
  }

  function startEditing(role: RoleRecord) {
    setEditingRole(role);
    setEditPermissions(new Set(role.permissions || []));
  }

  function togglePermission(perm: string) {
    setEditPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function savePermissions() {
    if (!editingRole) return;
    setSavingRoleId(editingRole.id);
    try {
      const res = await fetch(`/api/contractor/team/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: [...editPermissions],
        }),
      });
      const data = await res.json();
      if (data.role) {
        setEditingRole(null);
        await fetchRoles();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingRoleId(null);
    }
  }

  async function deleteRole(role: RoleRecord) {
    if (!role.isCustom) return;
    if (!confirm(`Delete the "${role.name}" role? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/contractor/team/roles/${role.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchRoles();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' });
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isOwner) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-6 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">
              Owner-only access
            </p>
            <p className="text-sm text-amber-100/80 mt-1">
              Managing roles and permissions is restricted to the account
              owner. Ask them to make changes if you need different access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar with sync button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Roles & Permissions</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Define what each role on your team can see and do.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncDefaults}
            disabled={syncing}
            className="border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700"
            title="Update built-in roles to the latest default permissions defined in the platform"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Defaults
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-violet-600 hover:bg-violet-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Custom Role
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {syncMessage}
        </div>
      )}

      {/* Roles list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-3">
          {roles.map((role) => {
            const isOwnerRole = role.name.toLowerCase() === 'owner';
            return (
              <Card
                key={role.id}
                className="border-white/10 bg-slate-900/60"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/20 mt-0.5">
                        {isOwnerRole ? (
                          <Crown className="h-5 w-5 text-amber-400" />
                        ) : (
                          <Shield className="h-5 w-5 text-violet-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-white text-base flex items-center gap-2 flex-wrap">
                          {role.name}
                          {!role.isCustom && (
                            <Badge
                              variant="outline"
                              className="border-slate-500/30 text-slate-400 text-[10px]"
                            >
                              Built-in
                            </Badge>
                          )}
                          {role.isCustom && (
                            <Badge
                              variant="outline"
                              className="border-violet-500/30 text-violet-300 text-[10px]"
                            >
                              Custom
                            </Badge>
                          )}
                          {isOwnerRole && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-300 text-[10px]"
                            >
                              Locked
                            </Badge>
                          )}
                        </CardTitle>
                        {role.description && (
                          <p className="text-xs text-slate-400 mt-1">
                            {role.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>
                            {role.permissions?.length || 0} permission
                            {role.permissions?.length === 1 ? '' : 's'}
                          </span>
                          {role._count && (
                            <span>
                              {role._count.employees} member
                              {role._count.employees === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!isOwnerRole && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(role)}
                          className="border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700"
                        >
                          Edit
                        </Button>
                      )}
                      {role.isCustom && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRole(role)}
                          disabled={(role._count?.employees ?? 0) > 0}
                          className="border-red-700 bg-red-900/20 text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                          title={
                            (role._count?.employees ?? 0) > 0
                              ? 'Reassign team members before deleting'
                              : 'Delete this custom role'
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit role dialog */}
      <Dialog
        open={!!editingRole}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
            setEditPermissions(new Set());
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-400" />
              Edit {editingRole?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Toggle permissions for this role. Changes apply to every team
              member assigned to it (unless they have custom overrides).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-sm text-violet-200">
                {editPermissions.size} permission
                {editPermissions.size === 1 ? '' : 's'} selected
              </p>
            </div>

            {Object.entries(groupedAllPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {perms.sort().map((perm) => {
                      const enabled = editPermissions.has(perm);
                      const [, action] = perm.split('.');
                      return (
                        <div
                          key={perm}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            enabled
                              ? 'bg-slate-800/80 border-violet-500/30'
                              : 'bg-slate-800/40 border-white/5'
                          }`}
                        >
                          <div className="flex-1 pr-4">
                            <p className="text-sm text-white capitalize">
                              {action?.replace(/_/g, ' ') || perm}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {perm}
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => togglePermission(perm)}
                            className="data-[state=checked]:bg-violet-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4">
            <Button
              variant="ghost"
              onClick={() => setEditingRole(null)}
              disabled={savingRoleId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={savePermissions}
              disabled={savingRoleId !== null}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {savingRoleId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create custom role dialog */}
      <CreateRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        allPermissions={allPermissions}
        groupedAllPermissions={groupedAllPermissions}
        onCreated={fetchRoles}
      />
    </div>
  );
}

// ─── Create role dialog ──────────────────────────────────────────────────

function CreateRoleDialog({
  open,
  onOpenChange,
  allPermissions,
  groupedAllPermissions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPermissions: string[];
  groupedAllPermissions: Record<string, string[]>;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setDescription('');
    setPerms(new Set());
    setError(null);
  }

  function toggle(p: string) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    if (perms.size === 0) {
      setError('Select at least one permission');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/contractor/team/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: [...perms],
        }),
      });
      const data = await res.json();
      if (data.role) {
        onCreated();
        reset();
        onOpenChange(false);
      } else {
        setError(data.error || 'Failed to create role');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-violet-400" />
            Create Custom Role
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Define a custom role for your team. Built-in roles still apply
            unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-slate-300">Role Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Crew Chief"
              className="bg-slate-800 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role do?"
              className="bg-slate-800 border-white/10 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">
              Permissions ({perms.size} selected)
            </Label>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {Object.entries(groupedAllPermissions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, list]) => (
                  <div key={category} className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {category}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {list.sort().map((p) => {
                        const enabled = perms.has(p);
                        const [, action] = p.split('.');
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggle(p)}
                            className={`flex items-center justify-between p-2 rounded-md border text-left transition-colors ${
                              enabled
                                ? 'bg-slate-800 border-violet-500/40'
                                : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="text-xs text-white capitalize">
                              {action?.replace(/_/g, ' ') || p}
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                enabled ? 'text-violet-300' : 'text-slate-500'
                              }`}
                            >
                              {enabled ? 'on' : 'off'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-white/10 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
