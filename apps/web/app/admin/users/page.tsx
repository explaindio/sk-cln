'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, User, Mail, Shield, Clock, Download, Filter, ChevronDown, MoreHorizontal, Users2, Calendar, FileText, Activity, Lock, Trash2, DownloadCloud } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  activityCount?: number;
  bio?: string;
  phone?: string;
  location?: string;
  communities: { id: string; name: string; role: string }[];
  postsCount: number;
  commentsCount: number;
  totalPoints: number;
}

interface UserActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

interface UserDetailsResponse {
  user: User;
  recentActivity: UserActivity[];
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

interface ActivityResponse {
  activities: ActivityLog[];
  total: number;
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ban' | 'delete' | 'promote' | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Recent activity query
  const { data: activityData, isLoading: isActivityLoading } = useQuery<ActivityResponse>({
    queryKey: ['admin-user-activity'],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '10',
        sort: 'desc',
      });
      const response = await api.get(`/admin/user-activity?${params}`);
      return response.data.data;
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin-users', { searchTerm, roleFilter, statusFilter, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      const response = await api.get(`/admin/users?${params}`);
      return response.data.data;
    },
    keepPreviousData: true,
  });

  const users = data?.users || [];

  // User detail query
  const { data: userDetails, isLoading: isUserLoading } = useQuery<UserDetailsResponse>({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) throw new Error('No user selected');
      const response = await api.get(`/admin/users/${selectedUserId}`);
      return response.data.data;
    },
    enabled: !!selectedUserId && showUserModal,
  });

  const selectedUser = userDetails?.user;

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < users.length;

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64 text-red-600">
          <div className="text-lg">Error loading users: {error.message}</div>
        </div>
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserModal(true);
  };

  const getStatus = (user: User) => {
    if (!user.isActive) return 'INACTIVE';
    return 'ACTIVE';
  };

  const handleBulkAction = (action: 'ban' | 'delete' | 'promote') => {
    setBulkAction(action);
    setShowBulkConfirm(true);
  };

  const confirmBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    bulkActionMutation.mutate({ action: bulkAction, userIds: selectedUsers });
    setShowBulkConfirm(false);
    setBulkAction(null);
    setSelectedUsers([]);
  };

  // Bulk mutations
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, userIds }: { action: 'ban' | 'delete' | 'promote'; userIds: string[] }) => {
      const body = { userIds };
      if (action === 'promote') {
        body.role = 'MODERATOR';
      }
      const response = await api.post(`/admin/users/bulk/${action}`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      toast({ title: `Bulk action completed for ${selectedUsers.length} users` });
    },
    onError: (error) => {
      toast({ title: 'Bulk action failed', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for user actions
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: User['role'] }) => {
      const response = await api.put(`/admin/users/${userId}`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      toast({ title: 'Role updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post(`/admin/users/${userId}/ban`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      toast({ title: 'User banned successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to ban user', description: error.message, variant: 'destructive' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowUserModal(false);
      setSelectedUserId(null);
      toast({ title: 'User deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete user', description: error.message, variant: 'destructive' });
    },
  });

  const handleBulkAction = (action: string) => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action} on ${selectedUsers.length} users`);
    setSelectedUsers([]);
  };

  const exportCSV = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
      });
      const response = await api.post(`/admin/users/export?format=csv&${params}`, {}, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Export started' });
    },
    onError: (error) => {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    },
  });

  const exportPDF = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
      });
      const response = await api.post(`/admin/users/export?format=pdf&${params}`, {}, {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Export started' });
    },
    onError: (error) => {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      exportCSV.mutate();
    } else {
      exportPDF.mutate();
    }
  };

  const roleColorMap = {
    USER: 'default',
    MODERATOR: 'secondary',
    ADMIN: 'default' as const,
  };

  const statusColorMap = {
    ACTIVE: 'default' as const,
    INACTIVE: 'secondary',
    BANNED: 'destructive' as const,
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">
          Manage community members, roles, and user activities
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Users ({data?.total || 0})</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => handleExport('csv')} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="role-filter" className="text-sm font-medium">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All roles</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              indeterminate={isIndeterminate}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              {selectedUsers.length} user(s) selected
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                Bulk Actions
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkAction('ban')}>
                Ban Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('delete')}>
                Delete Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('promote')}>
                Promote to Moderator
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={isIndeterminate}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <img
                      src={user.avatar || '/default-avatar.png'}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleColorMap[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColorMap[getStatus(user)]}>
                      {getStatus(user)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <User className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                          </DialogHeader>
                          {/* TODO: Implement full user detail modal */}
                          <div className="space-y-4">
                            <p>Placeholder for user details modal</p>
                            <div className="flex gap-4">
                              <Button variant="outline">Edit Role</Button>
                              <Button variant="destructive" size="sm">Ban User</Button>
                              <Button variant="destructive" size="sm">Delete User</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                          <DropdownMenuItem>View Activity</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No users found matching the criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.totalPages))}
                  className={currentPage === data.totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Placeholder for Activity Tracking Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Activity Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>TODO: Implement user activity tracking and history</p>
        </CardContent>
      </Card>
    </div>
  );
}