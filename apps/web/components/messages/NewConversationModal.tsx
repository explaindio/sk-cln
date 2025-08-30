'use client';

import { useState } from 'react';
import { useCreateConversation } from '../../hooks/useMessages';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { X, Search, Users, User, Check } from 'lucide-react';

interface NewConversationModalProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
}

export function NewConversationModal({
  onClose,
  onCreated,
}: NewConversationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searching, setSearching] = useState(false);

  const createConversation = useCreateConversation();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const { data } = await api.get(`/api/users/search?q=${searchTerm}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user: UserResult) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    const result = await createConversation.mutateAsync({
      participantIds: selectedUsers.map((u) => u.id),
      isGroup: selectedUsers.length > 1 || isGroup,
      groupName: isGroup ? groupName : undefined,
    });

    onCreated(result.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>New Conversation</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Users */}
            <div>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search users..."
                  className="flex-1"
                />
                <Button onClick={handleSearch} isLoading={searching}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {searchResults.map((user) => {
                  const isSelected = selectedUsers.find((u) => u.id === user.id);

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full p-3 flex items-center justify-between hover:bg-gray-50 ${
                        isSelected ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full" />
                        )}
                        <div className="text-left">
                          <p className="font-medium text-sm">{user.username}</p>
                          {user.firstName && (
                            <p className="text-xs text-gray-500">
                              {user.firstName} {user.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Selected Users</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100"
                    >
                      {user.username}
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Group Options */}
            {selectedUsers.length > 1 && (
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isGroup}
                    onChange={(e) => setIsGroup(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Create as group conversation</span>
                </label>

                {isGroup && (
                  <Input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name (optional)"
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                isLoading={createConversation.isPending}
                disabled={selectedUsers.length === 0}
              >
                Start Conversation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}