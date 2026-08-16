/**
 * SEO library — Phase 1 foundation
 *
 * Public surface:
 *  - canonicalUrl(path)        → absolute URL on the canonical host
 *  - truncateDescription(s, n) → safe meta description trimming
 *  - SEO copy builders:
 *      buildContractorTitle(...)
 *      buildContractorDescription(...)
 *      buildPropertySeoTitle(...)        e.g. "Sunset Blvd — 1-3BR Apartments for Rent in Denver, CO from $1,500/mo"
 *      buildPropertySeoDescription(...)
 *      buildAgentListingTitle(...)        e.g. "3BR/2BA House for Sale in Denver, CO — $450,000"
 *      buildAgentListingDescription(...)
 *  - Structured data (JSON-LD) builders in ./structured-data
 */

export * from './canonical';
export * from './copy';
export * from './structured-data';
