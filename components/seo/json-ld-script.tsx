/**
 * Renders a JSON-LD <script type="application/ld+json"> element as part of
 * the server-rendered HTML. Designed to be dropped anywhere in a server
 * component (head emission is not required — Google parses LD-JSON in body).
 *
 * Usage:
 *   <JsonLdScript data={contractorLd(input)} />
 *   <JsonLdScript data={[propertyLd(p), breadcrumbLd(crumbs)]} />
 */
import React from 'react';

interface JsonLdScriptProps {
  data: object | object[];
  /** Optional id; helpful when multiple scripts share a page for debugging */
  id?: string;
}

export default function JsonLdScript({ data, id }: JsonLdScriptProps) {
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item, i) => (
        <script
          key={`${id || 'jsonld'}-${i}`}
          type="application/ld+json"
          // JSON.stringify prevents script-injection: `<` and `>` cannot appear
          // unescaped inside string values once we replace them.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
