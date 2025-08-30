'use client';

import { useCommunityMembers } from '../../../../hooks/useCommunityMembers';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Loading } from '../../../../components/ui/Loading';
import { Shield, Star, User } from 'lucide-react';

interface MembersPageProps {
  params: { slug: string };
}

const roleIcons = {
  OWNER: Star,
  ADMIN: Shield,
  MODERATOR: Shield,
  MEMBER: User,
};

const roleColors = {
  OWNER: 'text-yellow-600 bg-yellow-50',
  ADMIN: 'text-red-600 bg-red-50',
  MODERATOR: 'text-blue-600 bg-blue-50',
  MEMBER: 'text-gray-600 bg-gray-50',
};

export default function CommunityMembersPage({ params }: MembersPageProps) {
  const { data: members, isLoading } = useCommunityMembers(params.slug);

  if (isLoading) return <Loading size="lg" className="mt-8" />;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Members ({members?.length || 0})
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((member) => {
          const RoleIcon = roleIcons[member.role];

          return (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {member.user.username}
                      </span>
                      {member.role !== 'MEMBER' && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            roleColors[member.role]
                          }`}
                        >
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {member.role}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}