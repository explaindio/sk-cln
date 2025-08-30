'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications, useMarkAsRead } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { data: notificationsData = { notifications: [], unreadCount: 0 } } = useNotifications(true);
  const markAsRead = useMarkAsRead();
  
  const { notifications, unreadCount } = notificationsData;
  
  useOnClickOutside(dropdownRef, () => setIsOpen(false));
  
  const handleNotificationClick = (notification: any) => {
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    // Navigate to the action URL if it exists
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Notifications</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              <ul>
                {notifications.map((notification: any) => (
                  <li 
                    key={notification.id} 
                    className={`border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex">
                      {notification.imageUrl && (
                        <img 
                          src={notification.imageUrl} 
                          alt="" 
                          className="h-10 w-10 rounded-full mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 self-center"></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <Link href="/notifications" className="block text-center text-blue-600 hover:text-blue-800">
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}