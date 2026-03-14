import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/queries';
import {
  useInviteUser,
  useDeactivateUser,
  useReactivateUser,
  useResendInvite,
  useRevokeInvite,
  useDeleteUser,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Table, Button, Input, Select, Modal, Badge } from '../components/common';
import type { UserDetail, UserRole } from '../types';

export const UsersList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.is_super_admin === true;

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: users, isLoading } = useUsers({
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  const inviteMutation = useInviteUser();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const resendMutation = useResendInvite();
  const revokeMutation = useRevokeInvite();
  const deleteMutation = useDeleteUser();

  const roleOptions = isSuperAdmin
    ? [
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Staff' },
      ]
    : [{ value: 'staff', label: 'Staff' }];

  const openInvite = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('staff');
    setInviteErrors({});
    setInviteOpen(true);
  };

  const handleInvite = async () => {
    const errs: Record<string, string> = {};
    if (!inviteEmail.trim()) errs.email = 'Required';
    if (Object.keys(errs).length > 0) {
      setInviteErrors(errs);
      return;
    }
    try {
      await inviteMutation.mutateAsync({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      });
      toast('Invite sent');
      setInviteOpen(false);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to send invite', 'error');
    }
  };

  const handleDeactivate = async (u: UserDetail) => {
    if (!confirm(`Deactivate ${u.email}?`)) return;
    try {
      await deactivateMutation.mutateAsync(u.id);
      toast('User deactivated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to deactivate', 'error');
    }
  };

  const handleReactivate = async (u: UserDetail) => {
    try {
      await reactivateMutation.mutateAsync(u.id);
      toast('User reactivated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reactivate', 'error');
    }
  };

  const handleResend = async (u: UserDetail) => {
    try {
      await resendMutation.mutateAsync(u.id);
      toast('Invite resent');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to resend invite', 'error');
    }
  };

  const handleRevoke = async (u: UserDetail) => {
    if (!confirm(`Revoke invite for ${u.email}?`)) return;
    try {
      await revokeMutation.mutateAsync(u.id);
      toast('Invite revoked');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to revoke invite', 'error');
    }
  };

  const handleDelete = async (u: UserDetail) => {
    if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(u.id);
      toast('User deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, string> = {
      active: 'done',
      invited: 'waiting',
      deactivated: 'cancelled',
    };
    return <Badge status={config[status] || status}>{status}</Badge>;
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'last_login', label: 'Last Login' },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  const filterRoleOptions = isSuperAdmin
    ? [
        { value: '', label: 'All roles' },
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Staff' },
      ]
    : [
        { value: '', label: 'All roles' },
        { value: 'staff', label: 'Staff' },
      ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = users ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button variant="primary" size="sm" onClick={openInvite}>
          + Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="w-48">
          <Input
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={filterRoleOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'invited', label: 'Invited' },
              { value: 'deactivated', label: 'Deactivated' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No users found.</p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(u: UserDetail) => {
              const isSelf = u.id === currentUser?.id;
              const isSA = u.is_super_admin;
              return (
                <>
                  <td className="p-2 text-sm font-mono">{u.email}</td>
                  <td className="p-2 text-sm">{u.name || '-'}</td>
                  <td className="p-2 text-xs uppercase">
                    {u.is_super_admin ? 'Super Admin' : u.role}
                  </td>
                  <td className="p-2">{statusBadge(u.status)}</td>
                  <td className="p-2 text-xs text-gray-600">
                    {u.last_login
                      ? new Date(u.last_login).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-2 text-right space-x-1">
                    {/* Edit — not for super admin row unless self */}
                    {(!isSA || isSelf) && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/settings/users/${u.id}`)}
                      >
                        Edit
                      </Button>
                    )}
                    {/* Deactivate — not self, not super admin */}
                    {u.status === 'active' && !isSelf && !isSA && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeactivate(u)}
                      >
                        Deactivate
                      </Button>
                    )}
                    {/* Reactivate */}
                    {u.status === 'deactivated' && !isSA && (
                      <Button size="sm" onClick={() => handleReactivate(u)}>
                        Reactivate
                      </Button>
                    )}
                    {/* Resend invite */}
                    {u.status === 'invited' && (
                      <Button size="sm" onClick={() => handleResend(u)}>
                        Resend
                      </Button>
                    )}
                    {/* Revoke invite */}
                    {u.status === 'invited' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRevoke(u)}
                      >
                        Revoke
                      </Button>
                    )}
                    {/* Delete — not self, not super admin */}
                    {!isSelf && !isSA && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </>
              );
            }}
          />
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite User">
        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            error={inviteErrors.email}
            placeholder="user@example.com"
          />
          <Input
            label="Name (optional)"
            type="text"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full name"
          />
          <Select
            label="Role"
            options={roleOptions}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
