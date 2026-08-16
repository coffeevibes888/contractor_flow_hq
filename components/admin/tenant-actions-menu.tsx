'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  AlertTriangle,
  UserMinus,
  FileX,
  Wallet,
  History,
} from 'lucide-react';
import type { TenantActionsMenuProps } from '@/types/tenant-lifecycle';

export function TenantActionsMenu({
  onStartEviction,
  onRecordDeparture,
  onTerminateLease,
  onProcessDeposit,
  onViewNotices,
}: TenantActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-slate-900 border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          onClick={() => handleAction(onStartEviction)}
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Start Eviction
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleAction(onRecordDeparture)}
          className="text-amber-400 focus:text-amber-300 focus:bg-amber-500/10 cursor-pointer"
        >
          <UserMinus className="mr-2 h-4 w-4" />
          Tenant Left
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => handleAction(onTerminateLease)}
          className="text-slate-300 focus:text-white focus:bg-slate-800 cursor-pointer"
        >
          <FileX className="mr-2 h-4 w-4" />
          Terminate Lease
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleAction(onProcessDeposit)}
          className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Process Deposit Return
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => handleAction(onViewNotices)}
          className="text-slate-300 focus:text-white focus:bg-slate-800 cursor-pointer"
        >
          <History className="mr-2 h-4 w-4" />
          View Eviction History
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
