'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  User
} from 'lucide-react';

interface Attendee {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED';
  registeredAt: string;
  checkedInAt?: string;
}

interface RSVPManagementProps {
  eventId: string;
  attendees: Attendee[];
  capacity?: number;
  onCheckIn?: (attendeeId: string) => void;
  onCancel?: (attendeeId: string) => void;
  onMoveToRegistered?: (attendeeId: string) => void;
}

export function RSVPManagement({
  eventId,
  attendees,
  capacity,
  onCheckIn,
  onCancel,
  onMoveToRegistered,
}: RSVPManagementProps) {
  const [filter, setFilter] = useState<'all' | 'registered' | 'waitlisted' | 'attended'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAttendees = attendees.filter(attendee => {
    const matchesFilter = filter === 'all' ||
      (filter === 'registered' && attendee.status === 'REGISTERED') ||
      (filter === 'waitlisted' && attendee.status === 'WAITLISTED') ||
      (filter === 'attended' && attendee.status === 'ATTENDED');

    const matchesSearch = attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          attendee.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = {
    registered: attendees.filter(a => a.status === 'REGISTERED').length,
    waitlisted: attendees.filter(a => a.status === 'WAITLISTED').length,
    attended: attendees.filter(a => a.status === 'ATTENDED').length,
    cancelled: attendees.filter(a => a.status === 'CANCELLED').length,
  };

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Status', 'Registered At', 'Checked In At'],
      ...attendees.map(a => [
        a.name,
        a.email,
        a.status,
        a.registeredAt,
        a.checkedInAt || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-${eventId}-attendees.csv`;
    link.click();
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending
    console.log('Send email to attendees');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Registered</p>
                <p className="text-2xl font-bold">{stats.registered}</p>
                {capacity && (
                  <p className="text-xs text-gray-500">of {capacity}</p>
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waitlisted</p>
                <p className="text-2xl font-bold">{stats.waitlisted}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attended</p>
                <p className="text-2xl font-bold">{stats.attended}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendee List</CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleSendEmail}>
                <Mail className="h-4 w-4 mr-1" />
                Email All
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />

              <div className="flex space-x-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'registered' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('registered')}
                >
                  Registered
                </Button>
                <Button
                  variant={filter === 'waitlisted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('waitlisted')}
                >
                  Waitlisted
                </Button>
                <Button
                  variant={filter === 'attended' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('attended')}
                >
                  Attended
                </Button>
              </div>
            </div>

            {/* Attendee Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Registered</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((attendee) => (
                    <tr key={attendee.id} className="border-b">
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-2">
                          {attendee.avatar ? (
                            <img
                              src={attendee.avatar}
                              alt={attendee.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full" />
                          )}
                          <span>{attendee.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm">{attendee.email}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          attendee.status === 'REGISTERED' ? 'bg-green-100 text-green-800' :
                          attendee.status === 'WAITLISTED' ? 'bg-yellow-100 text-yellow-800' :
                          attendee.status === 'ATTENDED' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {attendee.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {new Date(attendee.registeredAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex space-x-2">
                          {attendee.status === 'REGISTERED' && (
                            <button
                              onClick={() => onCheckIn?.(attendee.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Check In
                            </button>
                          )}
                          {attendee.status === 'WAITLISTED' && (
                            <button
                              onClick={() => onMoveToRegistered?.(attendee.id)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Confirm
                            </button>
                          )}
                          {attendee.status !== 'CANCELLED' && (
                            <button
                              onClick={() => onCancel?.(attendee.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}