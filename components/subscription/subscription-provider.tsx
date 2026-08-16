'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SubscriptionTier } from '@/lib/config/subscription-tiers';
import { UpgradeModal } from './upgrade-modal';

interface SubscriptionContextType {
  showUpgradeModal: (data: {
    currentTier: SubscriptionTier;
    currentUnitCount: number;
    unitLimit: number;
    reason?: 'unit_limit' | 'feature_locked';
    lockedFeature?: string;
  }) => void;
  closeUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    currentTier: SubscriptionTier;
    currentUnitCount: number;
    unitLimit: number;
    reason: 'unit_limit' | 'feature_locked';
    lockedFeature?: string;
  }>({
    open: false,
    currentTier: 'starter',
    currentUnitCount: 0,
    unitLimit: 24,
    reason: 'unit_limit',
  });

  const showUpgradeModal = useCallback((data: {
    currentTier: SubscriptionTier;
    currentUnitCount: number;
    unitLimit: number;
    reason?: 'unit_limit' | 'feature_locked';
    lockedFeature?: string;
  }) => {
    setModalState({
      open: true,
      currentTier: data.currentTier,
      currentUnitCount: data.currentUnitCount,
      unitLimit: data.unitLimit,
      reason: data.reason || 'unit_limit',
      lockedFeature: data.lockedFeature,
    });
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SubscriptionContext.Provider value={{ showUpgradeModal, closeUpgradeModal }}>
      {children}
      <UpgradeModal
        open={modalState.open}
        onClose={closeUpgradeModal}
        currentTier={modalState.currentTier}
        currentUnitCount={modalState.currentUnitCount}
        unitLimit={modalState.unitLimit}
        reason={modalState.reason}
        lockedFeature={modalState.lockedFeature}
      />
    </SubscriptionContext.Provider>
  );
}
