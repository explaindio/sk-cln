'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  MessageSquare, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Users,
  Calendar,
  QrCode,
  FileSpreadsheet,
  FileText,
  Printer
} from 'lucide-react';
import { cn, formatDate, getInitials } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import {
  useEventAttendees,
  useUpdateAttendeeStatus,
  useSendAttendeeMessage,
  useExportAttendees,
  EventAttendee,
  AttendeeStatus,
} from '../../hooks/useEventAttendees';

interface AttendeeManagementProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  className?: string;
}

const STATUS_CONFIG = {
  registered: { label: 'Registered', color: 'blue', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'green', icon: CheckCircle },
  attended: { label: 'Attended', color: 'purple', icon: UserCheck },
  no_show: { label: 'No Show', color: 'red', icon: UserX },
  cancelled: { label: 'Cancelled', color: 'gray', icon: XCircle },
};

const EXPORT_FORMATS = [
  { format: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { format: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', icon: FileText },
  { format: 'print', label: 'Print', icon: Printer },
];

export function AttendeeManagement({
  eventId,
  eventTitle,
  eventStartTime,
  className,
}: AttendeeManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'all'>('all');
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { addToast } = useToast();

  // Use proper hooks for API integration
  const { data: attendees = [], isLoading, refetch } = useEventAttendees(eventId);
  const updateStatus = useUpdateAttendeeStatus();
  const sendMessage = useSendAttendeeMessage();
  const exportAttendees = useExportAttendees();

  // Filter attendees based on search and status
  const filteredAttendees = useMemo(() => {
    return attendees.filter(attendee => {
      const matchesSearch = searchTerm === '' || 
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.phone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || attendee.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [attendees, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = attendees.length;
    const confirmed = attendees.filter(a => a.status === 'confirmed').length;
    const attended = attendees.filter(a => a.status === 'attended').length;
    const noShow = attendees.filter(a => a.status === 'no_show').length;
    
    return { total, confirmed, attended, noShow };
  }, [attendees]);

  const handleSelectAll = () => {
    if (selectedAttendees.size === filteredAttendees.length) {
      setSelectedAttendees(new Set());
    } else {
      setSelectedAttendees(new Set(filteredAttendees.map(a => a.id)));
    }
  };

  const handleSelectAttendee = (attendeeId: string) => {
    const newSelected = new Set(selectedAttendees);
    if (newSelected.has(attendeeId)) {
      newSelected.delete(attendeeId);
    } else {
      newSelected.add(attendeeId);
    }
    setSelectedAttendees(newSelected);
  };

  const handleUpdateStatus = async (attendeeId: string, status: AttendeeStatus) => {
    try {
      await updateStatus.mutateAsync({ attendeeId, status });
      addToast({
        type: 'success',
        title: 'Status updated',
        message: 'Attendee status has been updated successfully',
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      addToast({
        type: 'error',
        title: 'Update failed',
        message: 'Could not update attendee status',
      });
    }
  };

  const handleSendMessage = async (attendeeIds: string[], message: string) => {
    try {
      setBulkActionLoading(true);
      await sendMessage.mutateAsync({ attendeeIds, message });
      addToast({
        type: 'success',
        title: 'Message sent',
        message: `Message sent to ${attendeeIds.length} attendee(s)`,
      });
      setSelectedAttendees(new Set());
    } catch (error) {
      console.error('Failed to send message:', error);
      addToast({
        type: 'error',
        title: 'Send failed',
        message: 'Could not send message to attendees',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const data = await exportAttendees.mutateAsync({ 
        eventId, 
        format,
        attendeeIds: selectedAttendees.size > 0 ? Array.from(selectedAttendees) : undefined 
      });
      
      // Create download link
      const blob = new Blob([data], { type: getMimeType(format) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${eventTitle}-${formatDate(new Date())}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast({
        type: 'success',
        title: 'Export complete',
        message: `Attendees exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      addToast({
        type: 'error',
        title: 'Export failed',
        message: 'Could not export attendees',
      });
    }
  };

  const handleCheckIn = async () => {
    try {
      // Validate check-in code and mark attendance
      const attendee = attendees.find(a => a.checkInCode === checkInCode);
      if (!attendee) {
        addToast({
          type: 'error',
          title: 'Invalid code',
          message: 'Check-in code not found',
        });
        return;
      }
      
      await updateStatus.mutateAsync({ 
        attendeeId: attendee.id, 
        status: 'attended' 
      });
      
      addToast({
        type: 'success',
        title: 'Check-in successful',
        message: `${attendee.name} has been marked as attended`,
      });
      
      setCheckInCode('');
      setShowCheckInModal(false);
    } catch (error) {
      console.error('Check-in failed:', error);
      addToast({
        type: 'error',
        title: 'Check-in failed',
        message: 'Could not complete check-in',
      });
    }
  };

  const getMimeType = (format: string): string => {
    switch (format) {
      case 'csv': return 'text/csv';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf': return 'application/pdf';
      default: return 'text/plain';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('p-6 bg-white rounded-lg shadow', className)} data-testid="loading-skeleton">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Attendees</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage attendees for "{eventTitle}"
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowCheckInModal(true)}
            variant="outline"
            size="sm"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Check In
          </Button>
          <div className="relative">
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                {EXPORT_FORMATS.map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    onClick={() => {
                      handleExport(format);
                      setShowExportMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-gray-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Confirmed</p>
              <p className="text-2xl font-semibold text-green-900">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Attended</p>
              <p className="text-2xl font-semibold text-purple-900">{stats.attended}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">No Show</p>
              <p className="text-2xl font-semibold text-red-900">{stats.noShow}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search attendees by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AttendeeStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedAttendees.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-900">
              {selectedAttendees.size} attendee(s) selected
            </p>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  const message = prompt('Enter message to send:');
                  if (message) {
                    handleSendMessage(Array.from(selectedAttendees), message);
                  }
                }}
                size="sm"
                disabled={bulkActionLoading}
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Message
              </Button>
              <Button
                onClick={() => setSelectedAttendees(new Set())}
                variant="outline"
                size="sm"
                disabled={bulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendees List */}
      <div className="space-y-3">
        {filteredAttendees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No attendees found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No attendees have registered for this event yet'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0}
                onChange={handleSelectAll}
                className="mr-3"
              />
              <div className="flex-1 grid grid-cols-6 gap-4 text-sm font-medium text-gray-600">
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Registration Date</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
            </div>
            
            {filteredAttendees.map((attendee) => {
              const statusConfig = STATUS_CONFIG[attendee.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <div
                  key={attendee.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedAttendees.has(attendee.id)}
                    onChange={() => handleSelectAttendee(attendee.id)}
                    className="mr-3"
                  />
                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 mr-3">
                        {getInitials(attendee.name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{attendee.name}</p>
                        {attendee.ticketType && (
                          <p className="text-xs text-gray-500">{attendee.ticketType}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">{attendee.email}</div>
                    <div className="text-sm text-gray-600">{attendee.phone || '-'}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(attendee.registeredAt)}
                    </div>
                    <div>
                      <Badge
                        variant={statusConfig.color as any}
                        className="flex items-center"
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={attendee.status}
                        onChange={(e) => handleUpdateStatus(attendee.id, e.target.value as AttendeeStatus)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                          <option key={status} value={status}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const message = prompt(`Send message to ${attendee.name}:`);
                          if (message) {
                            handleSendMessage([attendee.id], message);
                          }
                        }}
                        className="text-gray-600 hover:text-blue-600"
                        title="Send message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check In Attendee</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the check-in code or scan QR code to mark attendance
            </p>
            <Input
              type="text"
              placeholder="Enter check-in code"
              value={checkInCode}
              onChange={(e) => setCheckInCode(e.target.value)}
              className="mb-4"
            />
            <div className="flex space-x-3">
              <Button
                onClick={handleCheckIn}
                disabled={!checkInCode}
              >
                Check In
              </Button>
              <Button
                onClick={() => {
                  setShowCheckInModal(false);
                  setCheckInCode('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}