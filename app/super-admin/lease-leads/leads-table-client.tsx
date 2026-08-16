'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, Search, Download, ExternalLink, StickyNote, Trash2 } from 'lucide-react';

interface Lead {
  id: string;
  email: string;
  landlordName: string | null;
  state: string | null;
  propertyType: string | null;
  propertyAddress: string | null;
  monthlyRent: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  ipAddress: string | null;
  converted: boolean;
  convertedAt: string | null;
  notes: string | null;
  createdAt: string;
}

async function markConverted(id: string) {
  await fetch(`/api/super-admin/leads/${id}/convert`, { method: 'POST' });
}

async function deleteLead(id: string) {
  await fetch(`/api/super-admin/leads/${id}/delete`, { method: 'DELETE' });
}

async function saveNote(id: string, notes: string) {
  await fetch(`/api/super-admin/leads/${id}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPropertyType(t: string | null) {
  if (!t) return '—';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LeadsTableClient({
  leads: initialLeads,
  stateNames,
}: {
  leads: Lead[];
  stateNames: Record<string, string>;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'converted' | 'unconverted'>('all');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      l.email.toLowerCase().includes(q) ||
      (l.landlordName ?? '').toLowerCase().includes(q) ||
      (l.state ?? '').toLowerCase().includes(q) ||
      (stateNames[l.state ?? ''] ?? '').toLowerCase().includes(q) ||
      (l.propertyAddress ?? '').toLowerCase().includes(q);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'converted' && l.converted) ||
      (filter === 'unconverted' && !l.converted);
    return matchesSearch && matchesFilter;
  });

  const handleConvert = (id: string) => {
    startTransition(() => {
      setLeads((prev) =>
        prev.map((l) => l.id === id ? { ...l, converted: true, convertedAt: new Date().toISOString() } : l)
      );
      markConverted(id);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this lead permanently? This cannot be undone.')) return;
    setDeletingId(id);
    deleteLead(id).then(() => {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
    });
  };

  const handleSaveNote = (id: string) => {
    startTransition(() => {
      setLeads((prev) =>
        prev.map((l) => l.id === id ? { ...l, notes: noteText } : l)
      );
      saveNote(id, noteText);
      setExpandedNote(null);
    });
  };

  const downloadCsv = () => {
    const header = 'Email,Name,State,Property Type,Address,Monthly Rent,UTM Source,UTM Medium,UTM Campaign,Converted,Created At';
    const rows = filtered.map((l) =>
      [
        l.email,
        l.landlordName ?? '',
        (stateNames[l.state ?? ''] || l.state) ?? '',
        formatPropertyType(l.propertyType),
        l.propertyAddress ?? '',
        l.monthlyRent ? `$${l.monthlyRent}` : '',
        l.utmSource ?? '',
        l.utmMedium ?? '',
        l.utmCampaign ?? '',
        l.converted ? 'Yes' : 'No',
        formatDate(l.createdAt),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `free-lease-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, state, address…"
            className="flex-1 text-sm border-none outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'unconverted', 'converted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                  filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{leads.length}</span> leads
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Lead</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Property</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Rent</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <>
                <tr key={lead.id} className={`hover:bg-slate-50 transition-colors ${lead.converted ? 'opacity-70' : ''}`}>
                  {/* Lead identity */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 text-sm">{lead.landlordName || <span className="text-slate-400 font-normal">No name</span>}</p>
                    <a href={`mailto:${lead.email}`} className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                      {lead.email}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    {lead.ipAddress && <p className="text-[10px] text-slate-400 mt-0.5">IP: {lead.ipAddress}</p>}
                  </td>

                  {/* Property */}
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">{stateNames[lead.state ?? ''] || lead.state || '—'}</p>
                    <p className="text-xs text-slate-500">{formatPropertyType(lead.propertyType)}</p>
                    {lead.propertyAddress && (
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] truncate" title={lead.propertyAddress}>
                        {lead.propertyAddress}
                      </p>
                    )}
                  </td>

                  {/* Rent */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">
                      {lead.monthlyRent ? `$${lead.monthlyRent.toLocaleString()}/mo` : '—'}
                    </p>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    {lead.utmSource || lead.utmMedium ? (
                      <div className="space-y-0.5">
                        {lead.utmSource && (
                          <span className="inline-block bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                            {lead.utmSource}
                          </span>
                        )}
                        {lead.utmMedium && (
                          <p className="text-[10px] text-slate-400">{lead.utmMedium}</p>
                        )}
                        {lead.utmCampaign && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{lead.utmCampaign}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">direct</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-600">{formatDate(lead.createdAt)}</p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {lead.converted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Converted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        Lead
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!lead.converted && (
                        <button
                          onClick={() => handleConvert(lead.id)}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline whitespace-nowrap"
                        >
                          Mark Converted
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setExpandedNote(expandedNote === lead.id ? null : lead.id);
                          setNoteText(lead.notes ?? '');
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                        title="Add/edit note"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        className="text-[11px] font-bold text-red-400 hover:text-red-600 disabled:opacity-40"
                        title="Delete lead"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {lead.notes && expandedNote !== lead.id && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate italic">{lead.notes}</p>
                    )}
                  </td>
                </tr>

                {/* Inline note editor */}
                {expandedNote === lead.id && (
                  <tr key={`${lead.id}-note`} className="bg-yellow-50 border-b border-yellow-100">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-amber-500 shrink-0" />
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this lead…"
                          rows={2}
                          className="flex-1 text-sm border border-yellow-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                        />
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSaveNote(lead.id)}
                            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setExpandedNote(null)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">No leads match your search.</div>
        )}
      </div>
    </div>
  );
}
