import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function ItemBulkActionsModal({ isOpen, onClose, selectedItems }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription className="text-gray-400">
            {selectedItems?.length || 0} item(s) selected
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-gray-300 font-medium">
                  No Bulk Actions Available
                </p>
                <p className="text-xs text-gray-400">
                  Bulk editing actions have been disabled for items.
                  This view is read-only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
