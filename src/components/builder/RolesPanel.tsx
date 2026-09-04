'use client';

import React, { useState } from 'react';
import { useBuilderStore } from '@/builder/state/builder-store';
import { Role, Permission, RecordAuthorizationRule } from '@/builder/schema/rbac';
import { ShieldCheck, Plus, Trash2, KeyRound, Lock, Check } from 'lucide-react';

export const RolesPanel: React.FC = () => {
  const project = useBuilderStore((s) => s.project);
  const setProject = useBuilderStore((s) => s.setProject);

  const roles: Role[] = project.roles || [];
  const permissions: Permission[] = project.permissions || [];
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles.length > 0 ? roles[0].id : null);
  const [newRoleName, setNewRoleName] = useState('');

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const roleId = newRoleName.toLowerCase().replace(/\s+/g, '_');
    const newRole: Role = {
      id: roleId,
      name: newRoleName.trim(),
      description: `Custom ${newRoleName} role`,
      permissions: ['read.*'],
    };

    setProject({
      ...project,
      roles: [...roles, newRole],
    });
    setNewRoleName('');
    setSelectedRoleId(newRole.id);
  };

  const handleDeleteRole = (roleId: string) => {
    const updatedRoles = roles.filter((r) => r.id !== roleId);
    setProject({
      ...project,
      roles: updatedRoles,
    });
    if (selectedRoleId === roleId) {
      setSelectedRoleId(updatedRoles.length > 0 ? updatedRoles[0].id : null);
    }
  };

  const handleTogglePermission = (permissionString: string) => {
    if (!selectedRole) return;
    const hasPerm = selectedRole.permissions.includes(permissionString);
    const updatedPerms = hasPerm
      ? selectedRole.permissions.filter((p) => p !== permissionString)
      : [...selectedRole.permissions, permissionString];

    const updatedRole = { ...selectedRole, permissions: updatedPerms };
    setProject({
      ...project,
      roles: roles.map((r) => (r.id === selectedRole.id ? updatedRole : r)),
    });
  };

  const AVAILABLE_SYSTEM_PERMS = [
    '*.*',
    'collections.read',
    'collections.create',
    'collections.update',
    'collections.delete',
    'users.read',
    'users.update',
    'analytics.view',
    'settings.manage',
  ];

  return (
    <div data-testid="roles-panel" className="w-80 h-full bg-[#0D111A] border-r border-[#1B1E2B] flex flex-col select-none text-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-[#1B1E2B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Roles & RBAC</h2>
        </div>
      </div>

      {/* Role Creation Form */}
      <div className="p-3 border-b border-[#1B1E2B] flex gap-2">
        <input
          type="text"
          placeholder="New role name..."
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          className="flex-1 bg-[#141824] border border-[#23293D] rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
        />
        <button
          onClick={handleAddRole}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Roles List */}
      <div className="p-2 border-b border-[#1B1E2B] flex flex-col gap-1 max-h-40 overflow-y-auto">
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => setSelectedRoleId(role.id)}
            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${
              selectedRoleId === role.id
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'hover:bg-[#141724] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">{role.name}</span>
              {role.isSystem && (
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">System</span>
              )}
            </div>
            {!role.isSystem && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRole(role.id);
                }}
                className="text-slate-500 hover:text-red-400 p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Role Permission Checkboxes */}
      {selectedRole ? (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-3">
          <div className="text-xs font-semibold text-slate-300">Permissions for {selectedRole.name}</div>
          <div className="flex flex-col gap-1.5">
            {AVAILABLE_SYSTEM_PERMS.map((perm) => {
              const active = selectedRole.permissions.includes(perm);
              return (
                <div
                  key={perm}
                  onClick={() => handleTogglePermission(perm)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer border text-xs transition-colors ${
                    active
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-200'
                      : 'bg-[#121622] border-[#1E2333] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="font-mono text-[11px]">{perm}</span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Select a role</div>
      )}
    </div>
  );
};
