'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, Phone, Archive, MessageCircle } from 'lucide-react';
import { AssignTenantDialog } from './assign-tenant-dialog';
import Link from 'next/link';

interface UnassignedTenant {
  linkId: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    image: string | null;
    signupDate: string;
  };
  signupMethod: string | null;
  inviteCode: string | null;
  daysWaiting: number;
}

export function UnassignedTenantsClient({ 
  tenants, 
  landlordId 
}: { 
  tenants: UnassignedTenant[];
  landlordId: string;
}) {
  const router = useRouter();
  const [selectedTenant, setSelectedTenant] = useState<UnassignedTenant | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const handleAssign = (tenant: UnassignedTenant) => {
    setSelectedTenant(tenant);
    setAssignDialogOpen(true);
  };

  const handleArchive = async (linkId: string) => {
    if (!confirm('Archive this tenant? They will be moved to archived tenants.')) return;

    const res = await fetch(`/api/admin/tenants/unassigned/${linkId}/archive`, {
      method: 'POST'
    });

    if (res.ok) {
      router.refresh();
    } else {
      alert('Failed to archive tenant');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unassigned Tenants</h1>
        <p className="text-sm text-gray-600 mt-1">
          Tenants who signed up but haven't been assigned to a property yet
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Unassigned</div>
          <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Waiting {'>'} 7 Days</div>
          <div className="text-2xl font-bold text-amber-600">
            {tenants.filter(t => t.daysWaiting > 7).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Waiting {'>'} 30 Days</div>
          <div className="text-2xl font-bold text-red-600">
            {tenants.filter(t => t.daysWaiting > 30).length}
          </div>
        </div>
      </div>

      {/* Tenant List */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unassigned Tenants</h3>
          <p className="text-sm text-gray-600">
            When tenants sign up using your email or invite code, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Signup Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Days Waiting</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tenants.map((item) => (
                  <tr key={item.linkId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.tenant.image ? (
                          <img src={item.tenant.image} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {item.tenant.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{item.tenant.name}</div>
                          <div className="text-xs text-gray-500">
                            Signed up {new Date(item.tenant.signupDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          {item.tenant.email}
                        </div>
                        {item.tenant.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            {item.tenant.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {item.signupMethod === 'invite_code' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Code: {item.inviteCode}
                          </span>
                        )}
                        {item.signupMethod === 'email' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Your Email
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.daysWaiting > 30 ? 'bg-red-100 text-red-800' :
                        item.daysWaiting > 7 ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.daysWaiting} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/messages?tenant=${item.tenant.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Message tenant"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => handleAssign(item)}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500"
                        >
                          Assign to Property
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchive(item.linkId)}
                          title="Archive tenant"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-200">
            {tenants.map((item) => (
              <div key={item.linkId} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {item.tenant.image ? (
                    <img src={item.tenant.image} alt="" className="h-12 w-12 rounded-full" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                      {item.tenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.tenant.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.tenant.signupDate).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.daysWaiting > 30 ? 'bg-red-100 text-red-800' :
                    item.daysWaiting > 7 ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.daysWaiting}d
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-3 w-3" />
                    {item.tenant.email}
                  </div>
                  {item.tenant.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-3 w-3" />
                      {item.tenant.phone}
                    </div>
                  )}
                </div>

                {item.signupMethod && (
                  <div>
                    {item.signupMethod === 'invite_code' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Code: {item.inviteCode}
                      </span>
                    )}
                    {item.signupMethod === 'email' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Your Email
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Link href={`/admin/messages?tenant=${item.tenant.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(item)}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                  >
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      {selectedTenant && (
        <AssignTenantDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          tenant={selectedTenant}
          landlordId={landlordId}
          onSuccess={() => {
            setAssignDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// Made with Bob
