import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ItemAutocomplete = ({
  value,
  onChange,
  disabled,
  items = [],
  placeholder = "Item name",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredItems, setFilteredItems] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const isUserTypingRef = useRef(false);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom + 2, // Small gap from input
        left: rect.left,
        width: rect.width
      };
      setDropdownPosition(position);
    }
  };

  // Filter items based on search term
  useEffect(() => {
    if (searchTerm && searchTerm.length > 0) {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50); // Limit to 50 items to prevent lag
      setFilteredItems(filtered);

      // Only auto-open if user is typing
      if (isUserTypingRef.current && filtered.length > 0) {
        updateDropdownPosition();
        setIsOpen(true);
        isUserTypingRef.current = false;
      }
    } else {
      setFilteredItems([]);
      setIsOpen(false);
    }
    setSelectedIndex(-1);
  }, [searchTerm, items]);

  // Update search term when value prop changes
  useEffect(() => {
    const prevSearchTerm = searchTerm;
    setSearchTerm(value || '');

    // Only close if value changed externally (not from user typing)
    if (value !== prevSearchTerm && !isUserTypingRef.current) {
      setIsOpen(false);
    }
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen && e.key !== 'ArrowDown') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen && filteredItems.length > 0) {
          // Open dropdown if not open
          updateDropdownPosition();
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(prev =>
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
          selectItem(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select an item
  const selectItem = (item) => {
    setSearchTerm(item.name);
    onChange(item.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    isUserTypingRef.current = true;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display text for item
  const formatItemDisplay = (item) => {
    const parts = [item.name];

    if (item.id) {
      parts.push(`(ID: ${item.id})`);
    }

    if (item.valuation) {
      parts.push(`💰 ${item.valuation}`);
    }else if (item.sellingPrice) {
      parts.push(`💰 ${item.sellingPrice}`);//todo remover
    }

    return parts;
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (searchTerm && filteredItems.length > 0) {
            updateDropdownPosition();
            setIsOpen(true);
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("h-7 text-xs w-full", className)}
        autoComplete="off"
      />

      {isOpen && filteredItems.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-gray-900 border border-gray-700 rounded-md shadow-2xl"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 999999
          }}
        >
          {filteredItems.map((item, index) => {
            const displayParts = formatItemDisplay(item);

            return (
              <div
                key={`${item.name}-${item.id}`}
                className={cn(
                  "px-2 py-1.5 cursor-pointer hover:bg-gray-800 text-xs flex items-center gap-2",
                  selectedIndex === index && "bg-gray-800",
                  item.isMonsterLoot && "border-l-2 border-purple-500"
                )}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="font-medium flex-1">{displayParts[0]}</span>
                {displayParts.slice(1).map((part, i) => (
                  <span key={i} className="text-gray-400 text-xs">
                    {part}
                  </span>
                ))}
                {/*remover e adicionar logica de exibir se é material legadario*/}
                {item.isMonsterLoot && (
                  <Badge variant="outline" className="text-xs h-4 px-1 text-purple-400 border-purple-500/50">
                    ML
                  </Badge>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ItemAutocomplete;