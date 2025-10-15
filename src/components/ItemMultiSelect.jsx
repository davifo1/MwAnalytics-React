import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ItemMultiSelectModal from './ItemMultiSelectModal';
import { getTierColor, sortByTier } from '@/utils/tierUtils';

const ItemMultiSelect = ({
  value = [],
  onChange,
  availableItems = [],
  disabled = false,
  placeholder = 'Select items...',
  filterLabel = null, // e.g., "lootCategory: imbuement"
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get selected items objects and sort by tier (legendary first)
  const selectedItems = useMemo(() => {
    const items = value
      .map(itemName => availableItems.find(item => item.name === itemName))
      .filter(Boolean);

    return sortByTier(items, true); // true = descending (legendary first)
  }, [value, availableItems]);

  const handleToggleItem = (itemName) => {
    if (value.includes(itemName)) {
      onChange(value.filter(name => name !== itemName));
    } else {
      onChange([...value, itemName]);
    }
  };

  const handleRemoveItem = (itemName, e) => {
    e.stopPropagation();
    onChange(value.filter(name => name !== itemName));
  };

  const handleContainerClick = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "min-h-[36px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5",
          "flex flex-wrap gap-1.5 items-center cursor-pointer",
          "hover:border-gray-600 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleContainerClick}
      >
        {filterLabel && (
          <span className="text-[10px] text-gray-500 mr-1 px-1.5 py-0.5 bg-gray-700/50 rounded border border-gray-600/50">
            {filterLabel}
          </span>
        )}
        {selectedItems.length === 0 ? (
          <span className="text-sm text-gray-500">{placeholder}</span>
        ) : (
          selectedItems.map((item) => (
            <Badge
              key={item.name}
              variant="secondary"
              className={cn(
                "text-xs px-2 py-0.5 gap-1",
                item.tier ? getTierColor(item.tier) : "bg-blue-600/20 text-blue-300 border-blue-500/30"
              )}
            >
              {item.name}
              <button
                onClick={(e) => handleRemoveItem(item.name, e)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* Selection Modal */}
      <ItemMultiSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedItems={value}
        onToggleItem={handleToggleItem}
        availableItems={availableItems}
        placeholder="Search for items..."
        filterLabel={filterLabel}
      />
    </>
  );
};

export default ItemMultiSelect;
