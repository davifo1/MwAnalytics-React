import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Package, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getTierColor } from '@/utils/tierUtils';

const ItemMultiSelectModal = ({
  isOpen,
  onClose,
  selectedItems = [],
  onToggleItem,
  availableItems = [],
  placeholder = "Search for items...",
  filterLabel = null
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter items based on search
  useEffect(() => {
    let items;

    if (searchValue) {
      items = availableItems
        .filter(item =>
          item.name?.toLowerCase().includes(searchValue.toLowerCase()) &&
          item.isMonsterLoot // Only show monsterLoot items
        )
        .slice(0, 100); // Show up to 100 items when searching
    } else {
      // Show all monsterLoot items when no search
      items = availableItems
        .filter(item => item.isMonsterLoot);
    }

    // Sort by value (valuation > sellPrice), descending
    items.sort((a, b) => {
      const valueA = a.valuation || a.sellPrice || 0;
      const valueB = b.valuation || b.sellPrice || 0;
      return valueB - valueA; // Descending order (highest value first)
    });

    setFilteredItems(items);
    setSelectedIndex(-1);
  }, [searchValue, availableItems]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
        handleItemToggle(filteredItems[selectedIndex].name);
      }
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < filteredItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    }
  };

  const handleItemToggle = (itemName) => {
    if (itemName && itemName.trim()) {
      onToggleItem(itemName.trim());
      setSearchValue(''); // Clear search after selection
      inputRef.current?.focus();
    }
  };

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[90%] max-w-[600px] max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-400" />
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold text-gray-200">
                Select Items {selectedItems.length > 0 && `(${selectedItems.length} selected)`}
              </h2>
              {filterLabel && (
                <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-800/50 rounded border border-gray-600/50 self-start">
                  {filterLabel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-12 pr-4 py-3 text-lg bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-100 placeholder-gray-500"
            />
          </div>

          {/* Helper text */}
          <p className="mt-2 text-xs text-gray-500">
            Clique nos itens para selecionar/desselecionar múltiplos. Pressione ESC para fechar.
          </p>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto border-t border-gray-700">
          <div className="px-6 py-2">
            {/* Items list */}
            {filteredItems.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                  Database Items
                </p>
                {filteredItems.map((item, index) => {
                  const itemValue = item.valuation || item.sellPrice || 0;
                  const isSelected = selectedItems.includes(item.name);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "px-4 py-3 rounded-md cursor-pointer transition-all",
                        selectedIndex === index
                          ? "bg-blue-900/30 text-blue-300"
                          : isSelected
                          ? "bg-green-900/20 text-green-400 hover:bg-green-900/30"
                          : "hover:bg-gray-800 text-gray-300"
                      )}
                      onClick={() => handleItemToggle(item.name)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-green-500 border-green-500"
                              : "border-gray-600"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.tier && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs px-1.5 py-0",
                                  getTierColor(item.tier)
                                )}
                              >
                                {item.tier}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>ID: {item.id}</span>
                          {itemValue > 0 && (
                            <span className="text-yellow-500">{itemValue} gp</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchValue ? (
              <p className="text-center text-gray-500 py-8">
                No items found matching "{searchValue}"
              </p>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Start typing to search for items
              </p>
            )}
          </div>
        </div>

        {/* Footer with selected count */}
        {selectedItems.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemMultiSelectModal;
