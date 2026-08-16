'use client';

/**
 * YearByPropertyView
 *
 * Shared two-column shell used by every Documents tab. The left rail is a
 * vertical list of years (newest first) styled like the Tax Years sidebar
 * on the property detail page. The right pane shows the items for the
 * selected year, grouped by property.
 *
 * The component is intentionally generic — it doesn't know what an "item"
 * is. Each Documents tab passes:
 *
 *   - `items`            the array of records to display
 *   - `getDate(item)`    returns the timestamp the item is bucketed into
 *                        (e.g. `expense.incurredAt` for receipts, or
 *                        `lease.startDate` for active leases)
 *   - `getPropertyId(item)` / `getPropertyName(item)` decide which
 *                        property a given item belongs to. Items that
 *                        return null go into an "Unassigned" bucket so
 *                        nothing falls through the cracks.
 *   - `renderItem`       renders a single item card inside the property
 *                        section
 *   - `emptyState`       what to show when no items match the active year
 *
 * Years are derived from the data + always include the current year so the
 * sidebar feels familiar even if no items have been logged yet. Once a
 * new calendar year arrives, that year auto-appears at the top.
 */

import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyLite {
  id: string;
  name: string;
}

interface YearByPropertyViewProps<TItem> {
  items: TItem[];
  properties: PropertyLite[];
  /** Returns the date the item should be bucketed into. Receives the raw item. */
  getDate: (item: TItem) => Date | string | null | undefined;
  /** Property the item belongs to. Return null/undefined for "Unassigned". */
  getPropertyId: (item: TItem) => string | null | undefined;
  /** Optional override for the property's display name when the id can't be resolved. */
  getPropertyName?: (item: TItem) => string | null | undefined;
  /**
   * Render the items in a single property bucket. Lets callers reuse
   * existing grid components (e.g. DocumentGrid, ActiveLeasesGrid)
   * instead of wrapping them in a new card.
   */
  renderBucket: (items: TItem[]) => React.ReactNode;
  /** Shown when a year has zero items (per-property pane). */
  emptyState: React.ReactNode;
  /** Header copy at the top of the right pane (kept short). */
  paneTitle?: string;
  /** Right-aligned action element (e.g. "Add Document" button). */
  paneAction?: React.ReactNode;
  /** Caller can opt out of the unassigned bucket if it doesn't apply. */
  hideUnassigned?: boolean;
}

export function YearByPropertyView<TItem>({
  items,
  properties,
  getDate,
  getPropertyId,
  getPropertyName,
  renderBucket,
  emptyState,
  paneTitle,
  paneAction,
  hideUnassigned,
}: YearByPropertyViewProps<TItem>) {
  // ── Derive the year list ──────────────────────────────────────────────────
  // The current calendar year is always present even if no items exist
  // for it yet. Older years only show up once they have at least one item.
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const item of items) {
      const d = parseDate(getDate(item));
      if (d) set.add(d.getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [items, getDate, currentYear]);

  const [activeYear, setActiveYear] = useState<number>(currentYear);

  // ── Bucket items into the active year + by property ───────────────────────
  const itemsThisYear = useMemo(() => {
    return items.filter((item) => {
      const d = parseDate(getDate(item));
      return d && d.getFullYear() === activeYear;
    });
  }, [items, getDate, activeYear]);

  const byProperty = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; items: TItem[] }
    >();

    for (const item of itemsThisYear) {
      const id = getPropertyId(item);
      const name =
        (id && properties.find((p) => p.id === id)?.name) ||
        getPropertyName?.(item) ||
        (id ? `Property ${id.slice(0, 6)}` : 'Unassigned');

      const key = id ?? '__unassigned__';
      if (!map.has(key)) {
        map.set(key, { id: key, name, items: [] });
      }
      map.get(key)!.items.push(item);
    }

    // Stable order: properties in the user's `properties` order, then
    // anything else alphabetically, then unassigned at the very end.
    const ordered: { id: string; name: string; items: TItem[] }[] = [];
    for (const p of properties) {
      const bucket = map.get(p.id);
      if (bucket) {
        ordered.push(bucket);
        map.delete(p.id);
      }
    }
    const unassigned = map.get('__unassigned__');
    map.delete('__unassigned__');
    const remaining = Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    ordered.push(...remaining);
    if (unassigned && !hideUnassigned) ordered.push(unassigned);

    return ordered;
  }, [itemsThisYear, properties, getPropertyId, getPropertyName, hideUnassigned]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* ── Left: year sidebar ──────────────────────────────────────────── */}
      <aside className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarIcon className="h-4 w-4 text-blue-500" />
          Tax Years
        </div>
        <div className="flex lg:flex-col gap-2 overflow-x-auto">
          {years.map((y) => {
            const isActive = y === activeYear;
            const count = items.filter((item) => {
              const d = parseDate(getDate(item));
              return d && d.getFullYear() === y;
            }).length;
            return (
              <button
                key={y}
                type="button"
                onClick={() => setActiveYear(y)}
                className={cn(
                  'group flex-shrink-0 lg:flex-shrink lg:w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50',
                )}
              >
                <span>{y}</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-white/90' : 'text-gray-500',
                  )}
                >
                  {count > 0 && (
                    <span className="hidden sm:inline mr-2">
                      {count} item{count !== 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'inline h-4 w-4 transition',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-500',
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right: per-property panes ───────────────────────────────────── */}
      <div className="space-y-4">
        {(paneTitle || paneAction) && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">{paneTitle}</p>
            {paneAction}
          </div>
        )}

        {byProperty.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
            {emptyState}
          </div>
        ) : (
          <div className="space-y-4">
            {byProperty.map((bucket) => (
              <PropertySection
                key={bucket.id}
                name={bucket.name}
                count={bucket.items.length}
              >
                {renderBucket(bucket.items)}
              </PropertySection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertySection({
  name,
  count,
  children,
}: {
  name: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-50 grid place-items-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        </div>
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

/** Coerce strings or Date objects into a Date, returning null on failure. */
function parseDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'string') {
    const isoLocal = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoLocal) {
      const d = new Date(
        parseInt(isoLocal[1]),
        parseInt(isoLocal[2]) - 1,
        parseInt(isoLocal[3]),
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
