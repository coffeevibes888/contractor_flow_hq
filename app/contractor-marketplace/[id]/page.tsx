// Re-export the contractor profile page from the canonical location.
// The /contractors/[id] route redirects here via next.config.ts.
export { default, generateMetadata } from '@/app/contractors/[id]/page';
