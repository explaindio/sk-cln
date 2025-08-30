'use client';

import { useState } from 'react';
import { useUpdateMemberRole } from '../../../hooks/useCommunityMembers';
import { Button } from '../ui/Button';
import { ChevronDown } from 'lucide-react';

interface RoleManagerProps {
  communitySlug: string;
  memberId: string;
  currentRole: string;
  isOwner: boolean;
}

const roles = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMIN', label: 'Admin' },
];

export function RoleManager({
  communitySlug,
  memberId,
  currentRole,
  isOwner,
}: RoleManagerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const updateRole = useUpdateMemberRole();

  if (!isOwner || currentRole === 'OWNER') {
    return null;
  }

  const handleRoleChange = async (newRole: string) => {
    await updateRole.mutateAsync({
      communitySlug,
      memberId,
      role: newRole,
    });
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {currentRole}
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleChange(role.value)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                disabled={role.value === currentRole}
              >
                {role.label}
                {role.value === currentRole && ' (current)'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}