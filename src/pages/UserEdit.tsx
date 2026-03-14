import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUser, useRoleDefaults } from '../hooks/queries';
import {
  useUpdateUser,
  useDeactivateUser,
  useReactivateUser,
  useResetUserPassword,
  useSetUserPermissions,
  useResetUserPermissions,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Badge } from '../components/common';
import type { UserRole, PermissionOverride } from '../types';

// Permission categories for display
const PERMISSION_CATEGORIES: { label: string; prefix: string; permissions: string[] }[] = [
  {
    label: 'Products',
    prefix: 'products',
    permissions: ['products.view', 'products.create', 'products.edit', 'products.delete'],
  },
  {
    label: 'Receipts',
    prefix: 'receipts',
    permissions: ['receipts.view', 'receipts.create', 'receipts.confirm', 'receipts.validate', 'receipts.cancel'],
  },
  {
    label: 'Deliveries',
    prefix: 'deliveries',
    permissions: ['deliveries.view', 'deliveries.create', 'deliveries.confirm', 'deliveries.validate', 'deliveries.cancel'],
  },
  {
    label: 'Production',
    prefix: 'production',
    permissions: ['production.view', 'production.create', 'production.start', 'production.validate', 'production.cancel'],
  },
  {
    label: 'Adjustments',
    prefix: 'adjustments',
    permissions: ['adjustments.view', 'adjustments.create', 'adjustments.validate'],
  },
  {
    label: 'Transfers',
    prefix: 'transfers',
    permissions: ['transfers.view', 'transfers.create', 'transfers.validate', 'transfers.cancel'],
  },
  {
    label: 'Dashboard',
    prefix: 'dashboard',
    permissions: ['dashboard.view'],
  },
  {
    label: 'Move History',
    prefix: 'movehistory',
    permissions: ['movehistory.view'],
  },
  {
    label: 'Freshness',
    prefix: 'freshness',
    permissions: ['freshness.view'],
  },
  {
    label: 'Settings',
    prefix: 'settings',
    permissions: ['settings.warehouses', 'settings.locations', 'settings.suppliers', 'settings.users'],
  },
];

// Manager simplified access levels for operation categories
type AccessLevel = 'none' | 'view' | 'view_validate' | 'full';

function getAccessLevel(permissions: Record<string, boolean>, prefix: string): AccessLevel {
  const view = permissions[`${prefix}.view`] === true;
  const validate = permissions[`${prefix}.validate`] === true;
  const create = permissions[`${prefix}.create`] === true;
  if (create) return 'full';
  if (validate) return 'view_validate';
  if (view) return 'view';
  return 'none';
}

function accessLevelToOverrides(
  prefix: string,
  level: AccessLevel,
  allPerms: string[]
): Array<{ permission: string; granted: boolean }> {
  const catPerms = allPerms.filter((p) => p.startsWith(prefix + '.'));
  return catPerms.map((p) => {
    const action = p.split('.')[1];
    let granted = false;
    if (level === 'full') {
      granted = true;
    } else if (level === 'view_validate') {
      granted = action === 'view' || action === 'validate' || action === 'start';
    } else if (level === 'view') {
      granted = action === 'view';
    }
    return { permission: p, granted };
  });
}

export const UserEdit: React.FC = () => {
  const { id: idStr } = useParams<{ id: string }>();
  const id = Number(idStr);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = currentUser?.is_super_admin === true;

  const { data: userDetail, isLoading } = useUser(id);
  const { data: roleDefaultsData } = useRoleDefaults();

  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const resetPwMutation = useResetUserPassword();
  const setPermMutation = useSetUserPermissions();
  const resetPermMutation = useResetUserPermissions();

  // Editable state
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [newPassword, setNewPassword] = useState('');

  // Permission overrides (Super Admin view)
  const [permOverrides, setPermOverrides] = useState<Record<string, boolean | null>>({});

  // Initialize form when data loads
  useEffect(() => {
    if (!userDetail) return;
    setName(userDetail.name || '');
    setRole(userDetail.role);

    // Build override map: null = use role default, true/false = override
    const overrides: Record<string, boolean | null> = {};
    if (userDetail.overrides) {
      for (const o of userDetail.overrides) {
        overrides[o.permission] = o.granted === 1;
      }
    }
    setPermOverrides(overrides);
  }, [userDetail]);

  // Compute resolved permissions for this user
  const resolvedPermissions = useMemo(() => {
    if (!roleDefaultsData || !userDetail) return {};
    const defaults = roleDefaultsData.defaults[userDetail.role] || {};
    const resolved: Record<string, boolean> = {};
    for (const p of roleDefaultsData.permissions) {
      if (permOverrides[p] !== undefined && permOverrides[p] !== null) {
        resolved[p] = permOverrides[p] as boolean;
      } else {
        resolved[p] = defaults[p] === true;
      }
    }
    return resolved;
  }, [roleDefaultsData, userDetail, permOverrides]);

  if (isLoading || !userDetail) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const isSelf = userDetail.id === currentUser?.id;
  const isEditingSuperAdmin = userDetail.is_super_admin;

  // Super admin self-edit: only name + password
  const canChangeRole = isSuperAdmin && !isEditingSuperAdmin && !isSelf;
  const canEditPermissions = isSuperAdmin && !isEditingSuperAdmin;
  const canDeactivate = !isSelf && !isEditingSuperAdmin;
  const canResetPassword = !isEditingSuperAdmin || isSelf;

  const handleSave = async () => {
    try {
      const body: { name?: string; role?: UserRole } = {};
      if (name.trim() !== (userDetail.name || '')) body.name = name.trim();
      if (canChangeRole && role !== userDetail.role) body.role = role;
      if (Object.keys(body).length > 0) {
        await updateMutation.mutateAsync({ id, ...body });
        toast('User updated');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      await resetPwMutation.mutateAsync({ id, newPassword });
      setNewPassword('');
      toast('Password reset');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reset password', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate ${userDetail.email}?`)) return;
    try {
      await deactivateMutation.mutateAsync(id);
      toast('User deactivated');
      navigate('/settings/users');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to deactivate', 'error');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(id);
      toast('User reactivated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reactivate', 'error');
    }
  };

  // Super Admin: toggle individual permission
  const togglePermission = (perm: string) => {
    const roleDefault =
      roleDefaultsData?.defaults[userDetail.role]?.[perm] === true;
    const current = permOverrides[perm];

    if (current === null || current === undefined) {
      // Currently using default → set override to opposite of default
      setPermOverrides({ ...permOverrides, [perm]: !roleDefault });
    } else {
      // Has override → remove override (go back to default)
      const next = { ...permOverrides };
      delete next[perm];
      setPermOverrides(next);
    }
  };

  const handleSavePermissions = async () => {
    const permissions: Array<{ permission: string; granted: boolean }> = [];
    for (const [perm, granted] of Object.entries(permOverrides)) {
      if (granted !== null && granted !== undefined) {
        permissions.push({ permission: perm, granted: granted as boolean });
      }
    }
    try {
      await setPermMutation.mutateAsync({ id, permissions });
      toast('Permissions saved');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save permissions', 'error');
    }
  };

  const handleResetPermissions = async () => {
    if (!confirm('Reset all permission overrides to role defaults?')) return;
    try {
      await resetPermMutation.mutateAsync(id);
      setPermOverrides({});
      toast('Permissions reset to defaults');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to reset permissions', 'error');
    }
  };

  // Manager view: simplified access level dropdowns
  const handleAccessLevelChange = (prefix: string, level: AccessLevel) => {
    if (!roleDefaultsData) return;
    const overrides = accessLevelToOverrides(prefix, level, roleDefaultsData.permissions);
    const next = { ...permOverrides };
    for (const o of overrides) {
      // Compare with role default — only set override if different
      const roleDefault = roleDefaultsData.defaults[userDetail.role]?.[o.permission] === true;
      if (o.granted !== roleDefault) {
        next[o.permission] = o.granted;
      } else {
        delete next[o.permission];
      }
    }
    setPermOverrides(next);
  };

  const statusLabel = userDetail.status;
  const statusBadgeMap: Record<string, string> = {
    active: 'done',
    invited: 'waiting',
    deactivated: 'cancelled',
  };

  const accessLevelOptions = [
    { value: 'none', label: 'No access' },
    { value: 'view', label: 'View only' },
    { value: 'view_validate', label: 'View + Validate' },
    { value: 'full', label: 'Full access' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/settings/users')}
            className="text-xs text-gray-500 hover:text-black underline mb-1 block"
          >
            &larr; Back to Users
          </button>
          <h1 className="text-2xl font-bold">{userDetail.name || userDetail.email}</h1>
          <p className="text-sm text-gray-600 font-mono">{userDetail.email}</p>
        </div>
        <Badge status={statusBadgeMap[statusLabel] || statusLabel}>
          {statusLabel}
        </Badge>
      </div>

      {/* Info + Basic Edit */}
      <div className="border border-black p-4 space-y-4">
        <h2 className="text-sm font-bold uppercase">Account Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {canChangeRole ? (
            <Select
              label="Role"
              options={[
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' },
              ]}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold">Role</label>
              <div className="px-2 py-2 border border-gray-300 text-sm text-gray-500 bg-gray-50">
                {isEditingSuperAdmin ? 'Super Admin' : userDetail.role}
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div>Created: {new Date(userDetail.created_at).toLocaleString()}</div>
          <div>Last login: {userDetail.last_login ? new Date(userDetail.last_login).toLocaleString() : 'Never'}</div>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            Save Changes
          </Button>
          {canDeactivate && userDetail.status === 'active' && (
            <Button variant="danger" size="sm" onClick={handleDeactivate}>
              Deactivate
            </Button>
          )}
          {userDetail.status === 'deactivated' && (
            <Button size="sm" onClick={handleReactivate}>
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Password Reset */}
      {canResetPassword && (
        <div className="border border-black p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase">
            {isSelf ? 'Change Password' : 'Reset Password'}
          </h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleResetPassword}
              disabled={resetPwMutation.isPending || !newPassword.trim()}
            >
              {isSelf ? 'Change' : 'Reset'}
            </Button>
          </div>
        </div>
      )}

      {/* Permissions — Super Admin: full granular toggles */}
      {canEditPermissions && isSuperAdmin && (
        <div className="border border-black p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase">Permission Overrides</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleResetPermissions}>
                Reset to Defaults
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSavePermissions}
                disabled={setPermMutation.isPending}
              >
                Save Permissions
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Checked = granted. Overridden permissions are marked with a dot.
            Click once to override, click again to revert to role default.
          </p>

          {PERMISSION_CATEGORIES.map((cat) => (
            <div key={cat.prefix} className="border-t border-gray-200 pt-3">
              <h3 className="text-xs font-bold uppercase text-gray-600 mb-2">{cat.label}</h3>
              <div className="grid grid-cols-2 gap-1">
                {cat.permissions.map((perm) => {
                  const roleDefault =
                    roleDefaultsData?.defaults[userDetail.role]?.[perm] === true;
                  const hasOverride =
                    permOverrides[perm] !== null && permOverrides[perm] !== undefined;
                  const isGranted = hasOverride
                    ? (permOverrides[perm] as boolean)
                    : roleDefault;
                  const action = perm.split('.')[1];

                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-2 py-1 px-2 text-xs cursor-pointer hover:bg-gray-50 ${
                        hasOverride ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isGranted}
                        onChange={() => togglePermission(perm)}
                        className="accent-black"
                      />
                      <span>{action}</span>
                      {hasOverride && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" title="Overridden" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permissions — Manager: simplified category dropdowns */}
      {canEditPermissions && !isSuperAdmin && (
        <div className="border border-black p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase">Access Level</h2>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSavePermissions}
              disabled={setPermMutation.isPending}
            >
              Save
            </Button>
          </div>

          {PERMISSION_CATEGORIES
            .filter((cat) =>
              // Only show operation categories for manager view
              ['receipts', 'deliveries', 'production', 'adjustments', 'transfers'].includes(cat.prefix)
            )
            .map((cat) => (
              <div key={cat.prefix} className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-sm">{cat.label}</span>
                <div className="w-48">
                  <Select
                    options={accessLevelOptions}
                    value={getAccessLevel(resolvedPermissions, cat.prefix)}
                    onChange={(e) =>
                      handleAccessLevelChange(cat.prefix, e.target.value as AccessLevel)
                    }
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
