'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Context to share collapsed state
export const SidebarContext = createContext<{ isCollapsed: boolean }>({ isCollapsed: false });

export function useSidebarState() {
  return useContext(SidebarContext);
}

interface AdminSidebarWrapperProps {
  children: React.ReactNode;
}

export function AdminSidebarWrapper({ children }: AdminSidebarWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load saved preference from localStorage
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', String(newState));
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <aside className='hidden md:flex flex-col w-64 border-r border-white/10 glass-effect-dark px-4 py-6 gap-6'>
        {children}
      </aside>
    );
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      <aside
        className={cn(
          'hidden md:flex flex-col border-r-2 border-black shadow-xl glass-effect-dark py-6 gap-6 transition-all duration-300 ease-in-out relative group/sidebar',
          isCollapsed ? 'w-[72px] px-3' : 'w-72 px-4'
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full',
            'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg',
            'hover:from-sky-400 hover:to-cyan-400 transition-all duration-200',
            'border-2 border-white/20 hover:scale-110'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className='h-3.5 w-3.5' />
          ) : (
            <ChevronLeft className='h-3.5 w-3.5' />
          )}
        </button>

        {/* Sidebar Content */}
        <div className={cn(
          'flex flex-col gap-6 h-full overflow-hidden',
          isCollapsed && 'items-center'
        )}>
          {children}
        </div>
      </aside>

      {/* Global styles for collapsed state */}
      <style jsx global>{`
        ${isCollapsed ? `
          aside.group\/sidebar .sidebar-expanded-only,
          aside.group\/sidebar .nav-text-content {
            opacity: 0;
            width: 0;
            overflow: hidden;
            display: none !important;
          }
          aside.group\/sidebar nav a {
            justify-content: center;
            padding: 0.625rem;
          }
          aside.group\/sidebar .nav-tooltip {
            display: block !important;
          }
        ` : `
          aside.group\/sidebar .nav-tooltip {
            display: none !important;
          }
          aside.group\/sidebar nav button {
            display: flex;
          }
        `}
      `}</style>
    </SidebarContext.Provider>
  );
}
