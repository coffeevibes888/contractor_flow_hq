import { Folder, FolderOpen } from 'lucide-react';

interface FolderIconProps {
  color?: string;
  isOpen?: boolean;
  className?: string;
}

export function FolderIcon({ 
  color = '#3B82F6', 
  isOpen = false, 
  className = 'h-4 w-4' 
}: FolderIconProps) {
  const Icon = isOpen ? FolderOpen : Folder;
  
  return (
    <Icon 
      className={className} 
      style={{ color }} 
    />
  );
}
