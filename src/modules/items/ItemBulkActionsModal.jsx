import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ItemBulkActionsModal({ isOpen, onClose, selectedItems }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Add/Edit Attribute state
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeValue, setAttributeValue] = useState('');

  // Remove Attribute state
  const [removeAttributeKey, setRemoveAttributeKey] = useState('');

  const handleAddEditAttribute = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    if (!attributeKey.trim()) {
      toast.error('Attribute key is required');
      return;
    }

    if (!attributeValue.trim()) {
      toast.error('Attribute value is required');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedItems.length });

    try {
      const response = await fetch('/api/items/bulk-add-attribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: selectedItems.map(item => item.id),
          attributeKey: attributeKey.trim(),
          attributeValue: attributeValue.trim(),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add/edit attribute');
      }

      const result = await response.json();
      toast.success(`Successfully updated ${result.updatedCount} item(s)`);

      // Reset form
      setAttributeKey('');
      setAttributeValue('');

      // Close modal and reload page
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error adding/editing attribute:', error);
      toast.error(error.message || 'Failed to add/edit attribute');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleRemoveAttribute = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    if (!removeAttributeKey.trim()) {
      toast.error('Attribute key is required');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedItems.length });

    try {
      const response = await fetch('/api/items/bulk-remove-attribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: selectedItems.map(item => item.id),
          attributeKey: removeAttributeKey.trim(),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove attribute');
      }

      const result = await response.json();
      toast.success(`Successfully updated ${result.updatedCount} item(s)`);

      // Reset form
      setRemoveAttributeKey('');

      // Close modal and reload page
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error removing attribute:', error);
      toast.error(error.message || 'Failed to remove attribute');
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription className="text-gray-400">
            {selectedItems?.length || 0} item(s) selected
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="add-edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add-edit">Add/Edit Attribute</TabsTrigger>
            <TabsTrigger value="remove">Remove Attribute</TabsTrigger>
          </TabsList>

          <TabsContent value="add-edit" className="space-y-4 mt-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="attribute-key">Attribute Key</Label>
                  <Input
                    id="attribute-key"
                    placeholder="e.g., lootCategory"
                    value={attributeKey}
                    onChange={(e) => setAttributeKey(e.target.value)}
                    disabled={isProcessing}
                    className="bg-gray-900 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attribute-value">Attribute Value</Label>
                  <Input
                    id="attribute-value"
                    placeholder="e.g., creature products"
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                    disabled={isProcessing}
                    className="bg-gray-900 border-gray-700"
                  />
                </div>

                <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded">
                  <p className="font-semibold mb-1">Example:</p>
                  <p className="text-xs">Key: <code className="text-blue-400">lootCategory</code></p>
                  <p className="text-xs">Value: <code className="text-blue-400">creature products</code></p>
                  <p className="text-xs mt-2 text-gray-500">
                    This will add or update the attribute in the selected items.
                  </p>
                </div>

                {isProcessing && (
                  <div className="text-sm text-gray-400">
                    Processing... {progress.current} / {progress.total}
                  </div>
                )}

                <Button
                  onClick={handleAddEditAttribute}
                  disabled={isProcessing || !attributeKey.trim() || !attributeValue.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add/Edit Attribute
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remove" className="space-y-4 mt-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remove-attribute-key">Attribute Key to Remove</Label>
                  <Input
                    id="remove-attribute-key"
                    placeholder="e.g., lootCategory"
                    value={removeAttributeKey}
                    onChange={(e) => setRemoveAttributeKey(e.target.value)}
                    disabled={isProcessing}
                    className="bg-gray-900 border-gray-700"
                  />
                </div>

                <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded">
                  <p className="font-semibold mb-1">Example:</p>
                  <p className="text-xs">Key: <code className="text-red-400">lootCategory</code></p>
                  <p className="text-xs mt-2 text-gray-500">
                    This will remove the attribute from all selected items that have it.
                  </p>
                </div>

                {isProcessing && (
                  <div className="text-sm text-gray-400">
                    Processing... {progress.current} / {progress.total}
                  </div>
                )}

                <Button
                  onClick={handleRemoveAttribute}
                  disabled={isProcessing || !removeAttributeKey.trim()}
                  variant="destructive"
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Attribute
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
