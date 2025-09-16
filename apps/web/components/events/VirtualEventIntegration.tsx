'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, 
  MessageCircle, 
  Database, 
  Calendar, 
  Bell, 
  BarChart3, 
  Mic, 
  Camera, 
  Play, 
  StopCircle, 
  Users, 
  Globe, 
  Zap, 
  Clock,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEventReminders } from '@/hooks/useEventReminders'; // Assuming this exists or can be integrated
import { Event } from '@/hooks/useEvents'; // Adjust import as needed

interface VirtualEventIntegrationProps {
  event: Event;
  onUpdateEvent?: (updates: Partial<Event>) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

interface AnalyticsMetric {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
}

export function VirtualEventIntegration({ 
  event, 
  onUpdateEvent, 
  className = '' 
}: VirtualEventIntegrationProps) {
  const [activeTab, setActiveTab] = useState('platforms');
  const [selectedPlatform, setSelectedPlatform] = useState(event.platform || 'native');
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl || '');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsMetric[]>([
    { label: 'Live Viewers', value: 127, trend: 'up' },
    { label: 'Peak Viewers', value: 250 },
    { label: 'Chat Messages', value: 456, trend: 'up' },
    { label: 'Engagement Rate', value: '78%', trend: 'stable' },
    { label: 'Average Watch Time', value: '12:34' },
    { label: 'Conversion Rate', value: '23%', trend: 'down' }
  ]);
  const [pastStreams, setPastStreams] = useState([
    { id: '1', title: 'Welcome Webinar', date: '2023-09-10', duration: '45:30', views: 150 },
    { id: '2', title: 'Product Demo', date: '2023-09-05', duration: '30:15', views: 89 }
  ]);
  const [videoUrl, setVideoUrl] = useState('/sample-stream.mp4'); // Mock native stream URL
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { scheduleReminder } = useEventReminders();

  const platforms = [
    { value: 'native', label: 'Native Streaming', icon: Video },
    { value: 'zoom', label: 'Zoom', icon: Globe },
    { value: 'teams', label: 'Microsoft Teams', icon: Users },
    { value: 'youtube', label: 'YouTube Live', icon: Play },
    { value: 'twitch', label: 'Twitch', icon: Zap }
  ];

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    if (onUpdateEvent) {
      onUpdateEvent({ platform });
    }
    toast({
      title: 'Platform Updated',
      description: `Switched to ${platform} integration.`,
    });
  };

  const handleUrlChange = (url: string) => {
    setMeetingUrl(url);
    if (onUpdateEvent) {
      onUpdateEvent({ meetingUrl: url });
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    toast({ title: 'Recording Started', description: 'Stream is now being recorded.' });
    // Mock API call for recording
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    toast({ title: 'Recording Stopped', description: 'Recording saved and available for replay.' });
    // Mock API call to stop and save recording
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        user: 'Current User', // Mock user
        message: newMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      // Mock WebSocket send
    }
  };

  const handleScheduleReminder = (time: string) => {
    scheduleReminder(event.id, new Date(time));
    toast({ title: 'Reminder Scheduled', description: `Reminder set for ${time}` });
  };

  const handlePlayReplay = (streamId: string, url: string) => {
    setVideoUrl(url); // Mock replay URL
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.play();
    }
  };

  const getEmbedUrl = () => {
    switch (selectedPlatform) {
      case 'zoom':
        return meetingUrl ? `https://zoom.us/embed/${meetingUrl.split('/j/')[1]}` : '';
      case 'teams':
        return meetingUrl || '';
      case 'youtube':
        return meetingUrl || '';
      case 'twitch':
        return meetingUrl ? `https://player.twitch.tv/?channel=${meetingUrl.split('/').pop()}` : '';
      default:
        return '';
    }
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Virtual Event Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="streaming">Streaming</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            </TabsList>

            {/* Platforms Tab */}
            <TabsContent value="platforms" className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Select Integration Platform</h3>
                <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          <platform.icon className="h-4 w-4" />
                          {platform.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlatform !== 'native' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">Meeting URL</h3>
                  <Input
                    value={meetingUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={`Enter ${selectedPlatform} meeting URL`}
                  />
                  {embedUrl && (
                    <Badge variant="secondary">Embed ready - URL configured</Badge>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Native Streaming Tab */}
            <TabsContent value="streaming" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Live Stream Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Go Live</span>
                      <Switch />
                    </div>
                    <Input placeholder="Stream key (auto-generated)" disabled />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-1" /> Start Camera
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mic className="h-4 w-4 mr-1" /> Start Audio
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stream Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-48 bg-black rounded-md object-cover"
                      controls
                    >
                      Your browser does not support the video tag.
                    </video>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Live Chat ({messages.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-64 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {messages.map((msg) => (
                      <div key={msg.id} className="mb-2 text-sm">
                        <span className="font-medium">{msg.user}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        <p className="ml-2">{msg.message}</p>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      Send
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    127 viewers • 45 active in chat
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recording Tab */}
            <TabsContent value="recording" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stream Recording</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Enable Recording</span>
                    <Switch checked={isRecording} onCheckedChange={setIsRecording} />
                  </div>
                  {isRecording ? (
                    <Button onClick={handleStopRecording} variant="destructive">
                      <StopCircle className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button onClick={handleStartRecording}>
                      <Mic className="h-4 w-4 mr-2" /> Start Recording
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Replays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastStreams.map((stream) => (
                      <div key={stream.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{stream.title}</p>
                          <p className="text-sm text-gray-500">
                            {stream.date} • {stream.duration} • {stream.views} views
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlayReplay(stream.id, '/replay.mp4')} // Mock
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      </div>
                    ))}
                  </div>
                  {pastStreams.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No recordings yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Stream Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analyticsData.map((metric, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{typeof metric.value === 'number' ? metric.value : metric.value}</p>
                        <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
                        {metric.trend && (
                          <div className={`text-xs mt-1 ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                            {metric.trend === 'up' ? '↑ Trending up' : metric.trend === 'down' ? '↓ Trending down' : '→ Stable'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scheduling Tab */}
            <TabsContent value="scheduling" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scheduling & Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Send Reminder</label>
                      <Input type="datetime-local" onChange={(e) => handleScheduleReminder(e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span className="text-sm">Reminders: {event.reminders?.length || 0} scheduled</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Set Auto-Reminders
                    </Button>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedPlatform !== 'native' && embedUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Embedded Player</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              src={embedUrl}
              className="w-full h-96 border rounded-md"
              allowFullScreen
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}