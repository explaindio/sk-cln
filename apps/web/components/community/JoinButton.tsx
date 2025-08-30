'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useJoinCommunity, useLeaveCommunity } from '../../hooks/useCommunityMembers';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

interface JoinButtonProps {
  communitySlug: string;
  communityType: 'PUBLIC' | 'PRIVATE' | 'PAID';
  isMember?: boolean;
}

export function JoinButton({
  communitySlug,
  communityType,
  isMember: initialIsMember = false,
}: JoinButtonProps) {
  const user = useAuthStore((state) => state.user);
  const joinCommunity = useJoinCommunity();
  const leaveCommunity = useLeaveCommunity();
  const [isMember, setIsMember] = useState(initialIsMember);

  useEffect(() => {
    setIsMember(initialIsMember);
  }, [initialIsMember]);

  if (!user) {
    return (
      <Button disabled>
        Login to Join
      </Button>
    );
  }

  const handleToggle = async () => {
    if (isMember) {
      await leaveCommunity.mutateAsync(communitySlug);
      setIsMember(false);
    } else {
      await joinCommunity.mutateAsync(communitySlug);
      setIsMember(true);
    }
  };

  if (isMember) {
    return (
      <Button
        variant="outline"
        onClick={handleToggle}
        isLoading={leaveCommunity.isPending}
      >
        <Check className="h-4 w-4 mr-2" />
        Joined
      </Button>
    );
  }

  let buttonText = 'Join Community';
  if (communityType === 'PRIVATE') {
    buttonText = 'Request to Join';
  } else if (communityType === 'PAID') {
    buttonText = 'Subscribe';
  }

  return (
    <Button
      onClick={handleToggle}
      isLoading={joinCommunity.isPending}
    >
      {buttonText}
    </Button>
  );
}