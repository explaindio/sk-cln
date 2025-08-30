'use client';

import { useState, useMemo } from 'react';
import { useCommunities } from '../../hooks/useCommunity';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import Link from 'next/link';
import { Users, Plus, Lock, Globe, DollarSign, Search } from 'lucide-react';

const typeIcons = {
  PUBLIC: Globe,
  PRIVATE: Lock,
  PAID: DollarSign,
};

export default function CommunitiesPage() {
  const { data: communities, isLoading, error } = useCommunities();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCommunities = useMemo(() => {
    if (!searchTerm) return communities;

    return communities?.filter((community) => {
      const term = searchTerm.toLowerCase();
      return (
        community.name.toLowerCase().includes(term) ||
        community.description.toLowerCase().includes(term)
      );
    });
  }, [communities, searchTerm]);

  if (isLoading) return <Loading size="lg" className="mt-8" />;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load communities</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
        <Link href="/communities/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Community
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {filteredCommunities?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No communities match your search' : 'No communities found'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm ? 'Try a different search term' : 'Be the first to create a community!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities?.map((community) => {
            const TypeIcon = typeIcons[community.type];

            return (
              <Link
                key={community.id}
                href={`/communities/${community.slug}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {community.name}
                      </CardTitle>
                      <TypeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {community.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        <Users className="h-4 w-4 inline mr-1" />
                        {community.memberCount} members
                      </span>
                      <span className="text-gray-500">
                        by {community.owner.username}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}