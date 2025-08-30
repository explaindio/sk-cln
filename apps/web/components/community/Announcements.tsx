'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Megaphone, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
}

interface AnnouncementsProps {
  announcements: Announcement[];
  canCreate: boolean;
}

export function Announcements({ announcements, canCreate }: AnnouncementsProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleCreate = () => {
    // TODO: Implement announcement creation
    console.log('Creating announcement:', { title, content });
    setTitle('');
    setContent('');
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Megaphone className="h-5 w-5 mr-2" />
            Announcements
          </CardTitle>
          {canCreate && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">New Announcement</h4>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Announcement content"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            />
            <Button size="sm" onClick={handleCreate}>
              Post Announcement
            </Button>
          </div>
        )}

        {announcements.length === 0 ? (
          <p className="text-gray-500 text-sm">No announcements yet</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-l-4 border-primary-500 pl-3">
                <h4 className="font-medium">{announcement.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {announcement.content}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {announcement.author} • {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}