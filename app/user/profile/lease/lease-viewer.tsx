'use client';

// Re-export the redesigned LeaseViewer component
export { default } from '@/components/lease-viewer/lease-viewer';
export type { LeaseViewerProps } from '@/components/lease-viewer/lease-viewer';

// Also export the signature display components for use elsewhere
export { SignatureDisplay, SignatureList } from '@/components/lease-viewer/signature-display';
export type { EmbeddedSignature } from '@/components/lease-viewer/signature-display';
