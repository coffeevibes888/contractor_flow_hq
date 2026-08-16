'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Download, 
  Trash2, 
  Tag, 
  MapPin,
  CheckSquare,
  Square
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BulkActionsProps {
  selectedItems: string[];
  onClearSelection: () => void;
  onBulkPrint: () => void;
  onBulkDelete: () => void;
  onBulkUpdateLocation: (location: string) => void;
  onBulkUpdateCategory: (category: string) => void;
}

export function BulkActions({
  selectedItems,
  onClearSelection,
  onBulkPrint,
  onBulkDelete,
  onBulkUpdateLocation,
  onBulkUpdateCategory,
}: BulkActionsProps) {
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');

  if (selectedItems.length === 0) return null;

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onBulkUpdateLocation(location.trim());
      setLocation('');
      setShowLocationDialog(false);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category.trim()) {
      onBulkUpdateCategory(category.trim());
      setCategory('');
      setShowCategoryDialog(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            <span className="font-semibold">{selectedItems.length} selected</span>
          </div>
          
          <div className="h-6 w-px bg-white/30" />
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onBulkPrint}
              title="Print labels"
            >
              <Printer className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setShowLocationDialog(true)}
              title="Update location"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setShowCategoryDialog(true)}
              title="Update category"
            >
              <Tag className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onBulkDelete}
              title="Delete items"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="h-6 w-px bg-white/30" />
          
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onClearSelection}
          >
            <Square className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLocationSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                New Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Warehouse A, Shelf 3"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-600">
              This will update the location for {selectedItems.length} selected item(s).
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Location
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                New Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Tools, Materials, Safety"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-600">
              This will update the category for {selectedItems.length} selected item(s).
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
