'use client';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

interface SpotlightTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  storageKey: string;
}

export function SpotlightTour(_props: SpotlightTourProps) {
  return null;
}
