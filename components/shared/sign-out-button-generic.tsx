'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth.actions';
import { cn } from '@/lib/utils';

interface SignOutButtonGenericProps {
  variant?: 'ghost' | 'outline' | 'default' | 'destructive' | 'secondary' | 'link';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  text?: string;
}

export function SignOutButtonGeneric({ 
  variant = 'ghost', 
  className,
  showIcon = true,
  showText = false,
  text = 'Sign Out'
}: SignOutButtonGenericProps) {
  const handleSignOut = async () => {
    await logout('/');
  };

  return (
    <Button 
      variant={variant}
      onClick={handleSignOut}
      className={cn(className)}
    >
      {showIcon && <LogOut className={cn("h-4 w-4", showText && "mr-2")} />}
      {showText && text}
    </Button>
  );
}
