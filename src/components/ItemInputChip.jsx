import React, { useState } from 'react';
import { X, AlertCircle, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ItemSelectionModal from './ItemSelectionModal';
import { getTierColor } from '@/utils/tierUtils';

const ItemInputChip = ({
  value,
  onChange,
  availableItems = [],
  placeholder = "Select item...",
  disabled = false,
  filterBy = null // Function to filter items, e.g. (item) => item.name.toLowerCase().includes('egg')
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Apply filter if provided
  const filteredItems = filterBy ? availableItems.filter(filterBy) : availableItems;

  // Find matching item in database (case-insensitive)
  const findItem = (name) => {
    if (!name) return null;
    return filteredItems.find(item =>
      item.name?.toLowerCase() === name.toLowerCase()
    );
  };

  const currentItem = findItem(value);
  const isValidItem = !!currentItem;

  const handleSelect = (itemName) => {
    if (itemName && itemName.trim()) {
      onChange(itemName.trim());
      setIsModalOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsModalOpen(true);
  };

  const handleChipClick = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {/* Display chip or placeholder */}
      <div className="relative inline-flex items-center gap-1">
        {value ? (
          <Badge
            variant={isValidItem ? "secondary" : "destructive"}
            className={cn(
              "pr-1 gap-1 max-w-xs",
              disabled ? "opacity-50" : "cursor-pointer",
              isValidItem
                ? getTierColor(currentItem?.tier)
                : "bg-red-900/30 text-red-400 hover:bg-red-900/40"
            )}
            onClick={!disabled ? handleChipClick : undefined}
          >
            {!isValidItem && <AlertCircle className="h-3 w-3 flex-shrink-0" />}
            <span className="text-xs truncate" title={isValidItem ? currentItem.name : value}>
              {isValidItem
                ? (() => {
                    const itemValue = currentItem.valuation || currentItem.sellPrice || 0;
                    const displayName = currentItem.name.length > 30
                      ? currentItem.name.substring(0, 30) + '...'
                      : currentItem.name;
                    return `${displayName} (ID: ${currentItem.id}, ${itemValue}gp)`;
                  })()
                : value.length > 40 ? value.substring(0, 40) + '...' : value}
            </span>
            {!disabled && (
              <Edit2 className="h-3 w-3 ml-1 opacity-60 hover:opacity-100" />
            )}
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="ml-1 hover:bg-gray-500/30 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ) : (
          <button
            onClick={!disabled ? () => setIsModalOpen(true) : undefined}
            disabled={disabled}
            className={cn(
              "px-3 py-1 text-xs rounded-md border border-dashed",
              disabled
                ? "border-gray-700 text-gray-600 cursor-not-allowed"
                : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 cursor-pointer"
            )}
          >
            + Add Item
          </button>
        )}
      </div>

      {/* Selection Modal */}
      <ItemSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        currentValue={value}
        availableItems={filteredItems}
        placeholder="Search for an item or type a custom name..."
      />
    </>
  );
};

export default ItemInputChip;