'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, List } from 'lucide-react';
import type { DocumentSection } from '@/lib/utils/document-sections';

export interface DocumentOutlineProps {
  sections: DocumentSection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function DocumentOutline({
  sections,
  activeSection,
  onSectionClick,
  className,
  collapsible = true,
  defaultCollapsed = false,
}: DocumentOutlineProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      onSectionClick(sectionId);
    },
    [onSectionClick]
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-white border-r border-gray-200', className)}>
      {/* Header */}
      {collapsible && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Contents</span>
          </div>
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      )}

      {/* Section list */}
      {!isCollapsed && (
        <nav className="p-3 overflow-y-auto max-h-[calc(100vh-200px)]">
          <ul className="space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
                    activeSection === section.id
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-gray-600',
                    // Indentation based on heading level
                    section.level === 1 && 'font-medium',
                    section.level === 2 && 'pl-6',
                    section.level === 3 && 'pl-9',
                    section.level === 4 && 'pl-12'
                  )}
                >
                  <span className="line-clamp-2">{section.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
