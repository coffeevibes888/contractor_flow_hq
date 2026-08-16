'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { APP_NAME } from '@/lib/constants';
import { 
  Bell, Menu, X, LogOut, User, Settings, 
  ChevronDown, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function EmployeeHeader() {
  const { data: session } = useSession();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo & Company */}
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 hover:bg-white/10 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-white" />
            )}
          </button>
          
          <Link href="/employee" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white">Employee Portal</p>
              <p className="text-xs text-slate-400">{APP_NAME}</p>
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative text-slate-400 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  {session?.user?.image ? (
                    <Image 
                      src={session.user.image} 
                      alt="" 
                      width={32} 
                      height={32}
                      className="h-8 w-8 object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {(session?.user?.name || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-white/10">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                <p className="text-xs text-slate-400">{session?.user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="text-slate-200 focus:bg-white/10">
                <Link href="/employee/profile">
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-slate-200 focus:bg-white/10">
                <Link href="/employee/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-red-400 focus:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
