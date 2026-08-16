'use client';

/**
 * ReceiptList — flat list of receipts shown inside a property pane.
 *
 * The Documents page wraps this in `<YearByPropertyView>`, which handles
 * the year sidebar and the property grouping. So this component just
 * renders the receipt rows themselves.
 *
 * Each row shows: vendor / file name, expense date, amount, status badge,
 * and quick actions (View, Open, Log expense, Delete).
 */

import {
  Receipt,
  FileText,
  Trash2,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScannedDocLike {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  documentType: string | null;
  classificationStatus: string;
  conversionStatus: string;
  propertyId?: string | null;
  property?: { id: string; name: string } | null;
  extractedData?: any;
  createdAt: string;
}

interface ReceiptListProps<T extends ScannedDocLike = ScannedDocLike> {
  documents: T[];
  onDelete: (id: string) => void;
  onCreateExpense?: (doc: T) => void;
  formatFileSize: (bytes?: number) => string;
}

/** Pull the dollar amount off the extracted data when present. */
function bucketAmount(doc: ScannedDocLike): number {
  const ed = doc.extractedData;
  if (ed && typeof ed === 'object') {
    const a = ed.amount;
    if (typeof a === 'number' && isFinite(a)) return a;
    if (typeof a === 'string') {
      const n = parseFloat(a);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

/** Pick the date a receipt belongs to: expense date if available, else upload date. */
function bucketDate(doc: ScannedDocLike): Date {
  const ed = doc.extractedData;
  if (ed && typeof ed === 'object') {
    const d = ed.date ?? ed.incurredAt;
    if (typeof d === 'string') {
      const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) {
        const dt = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        if (!isNaN(dt.getTime())) return dt;
      }
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return new Date(doc.createdAt);
}

export function ReceiptList<T extends ScannedDocLike = ScannedDocLike>({
  documents,
  onDelete,
  onCreateExpense,
  formatFileSize,
}: ReceiptListProps<T>) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">No receipts.</p>
    );
  }

  // Sort newest first by expense / upload date.
  const sorted = documents
    .slice()
    .sort((a, b) => bucketDate(b).getTime() - bucketDate(a).getTime());

  return (
    <div className="space-y-2">
      {sorted.map((doc) => (
        <ReceiptRow
          key={doc.id}
          doc={doc}
          onDelete={onDelete}
          onCreateExpense={
            onCreateExpense
              ? (d) => onCreateExpense(d as T)
              : undefined
          }
          formatFileSize={formatFileSize}
        />
      ))}
    </div>
  );
}

function ReceiptRow({
  doc,
  onDelete,
  onCreateExpense,
  formatFileSize,
}: {
  doc: ScannedDocLike;
  onDelete: (id: string) => void;
  onCreateExpense?: (doc: ScannedDocLike) => void;
  formatFileSize: (bytes?: number) => string;
}) {
  const amount = bucketAmount(doc);
  const date = bucketDate(doc);
  const vendor =
    typeof doc.extractedData === 'object' && doc.extractedData
      ? (doc.extractedData as any).vendor
      : null;
  const hasExpense = doc.conversionStatus === 'completed';

  return (
    <Card className="border-gray-200 bg-white">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 grid place-items-center flex-shrink-0">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {vendor || doc.originalFileName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {doc.fileSize && ` · ${formatFileSize(doc.fileSize)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {amount > 0 && (
                  <span className="text-sm font-semibold text-emerald-700">
                    ${amount.toFixed(2)}
                  </span>
                )}
                {hasExpense ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    Expense logged
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                    No expense
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </a>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              {!hasExpense && onCreateExpense && (
                <button
                  type="button"
                  onClick={() => onCreateExpense(doc)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Log expense
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-600 hover:text-red-700 hover:bg-red-50 transition ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
