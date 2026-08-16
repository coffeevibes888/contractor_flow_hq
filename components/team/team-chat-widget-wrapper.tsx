'use client';

import { TeamChatWidget } from './team-chat-widget';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function TeamChatWidgetWrapper() {
  const { data: session } = useSession();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isTenant, setIsTenant] = useState(false);
  const [landlordId, setLandlordId] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('starter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check user access and get landlord info
        const res = await fetch('/api/landlord/team/chat-access');
        const data = await res.json();

        if (data.success) {
          setIsTeamMember(data.isTeamMember || false);
          setIsTenant(data.isTenant || false);
          setLandlordId(data.landlordId || '');
          setSubscriptionTier(data.subscriptionTier || 'starter');
        }
      } catch (error) {
        console.error('Failed to check chat access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [session]);

  // Don't show if loading or no access
  if (loading || !session?.user?.id) {
    return null;
  }

  // Don't show if not a team member and not a tenant with Pro+ subscription
  const hasChatAccess = isTeamMember || (isTenant && (subscriptionTier === 'pro' || subscriptionTier === 'enterprise'));
  
  if (!hasChatAccess) {
    return null;
  }

  return (
    <TeamChatWidget
      currentUser={{
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        image: session.user.image || undefined,
        role: session.user.role,
      }}
      landlordId={landlordId}
      isTeamMember={isTeamMember}
      isTenant={isTenant}
      subscriptionTier={subscriptionTier}
    />
  );
}
