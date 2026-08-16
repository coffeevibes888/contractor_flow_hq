import Link from 'next/link';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-slate-200">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-slate-200' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <span className="mx-1">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
