'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Phone, Mic, MicOff, Video, VideoOff, ScreenShare, X } from 'lucide-react';

interface CallViewProps {
  onEndCall: () => void;
  isReceivingCall?: boolean;
  onAcceptCall?: () => void;
  onDeclineCall?: () => void;
}

export function CallView({ onEndCall, isReceivingCall, onAcceptCall, onDeclineCall }: CallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  if (isReceivingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 text-white">
        <h2 className="text-2xl mb-4">Incoming Call...</h2>
        <div className="flex space-x-4">
          <Button onClick={onAcceptCall} className="bg-green-500 hover:bg-green-600">
            <Phone className="h-5 w-5 mr-2" />
            Accept
          </Button>
          <Button onClick={onDeclineCall} variant="danger">
            <X className="h-5 w-5 mr-2" />
            Decline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-800 text-white flex flex-col">
      <div className="flex-1 grid grid-cols-2 gap-2 p-2">
        {/* Remote video streams */}
        <div className="bg-black rounded-lg"></div>
        <div className="bg-black rounded-lg"></div>
      </div>
      {/* Local video stream */}
      <div className="absolute bottom-24 right-4 w-48 h-32 bg-black rounded-lg border-2 border-gray-600"></div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex justify-center items-center space-x-4">
        <Button onClick={() => setIsMuted(!isMuted)} variant="ghost" size="icon" className="rounded-full">
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        <Button onClick={() => setIsVideoOff(!isVideoOff)} variant="ghost" size="icon" className="rounded-full">
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <ScreenShare className="h-6 w-6" />
        </Button>
        <Button onClick={onEndCall} variant="danger" size="lg" className="rounded-full px-8">
          <Phone className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}