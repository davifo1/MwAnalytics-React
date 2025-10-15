import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const MonsterInputChip = ({
  value = [],
  onChange,
  materialName,
  allMonsters = [],
  placeholder = "Add monster...",
  className = ""
}) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue && allMonsters.length > 0) {
      const filtered = allMonsters
        .filter(monster => {
          const monsterName = monster.monsterName?.toLowerCase() || '';
          const searchTerm = inputValue.toLowerCase();

          // Check if already selected
          const isSelected = value.some(v =>
            v.name?.toLowerCase() === monsterName
          );

          return !isSelected && monsterName.includes(searchTerm);
        })
        .slice(0, 10)
        .map(monster => ({
          name: monster.monsterName,
          power: monster.power || 0
        }));

      setSuggestions(filtered);
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  }, [inputValue, allMonsters, value]);

  const handleAddMonster = (monster) => {
    const newValue = [...value, monster];
    onChange(newValue);
    setInputValue('');
    setIsInputMode(false);
    setSuggestions([]);
  };

  const handleRemoveMonster = (index) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleAddMonster(suggestions[highlightedIndex]);
        }
      }
    }

    if (e.key === 'Escape') {
      setIsInputMode(false);
      setSuggestions([]);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setSuggestions([]);
        setIsInputMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-1 bg-gray-800/50 border border-gray-700 rounded">
        {/* Monster chips */}
        {value.map((monster, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-0.5 bg-gray-700/50 rounded text-sm"
          >
            <span className="text-gray-200">{monster.name?.toLowerCase()}</span>
            {monster.power > 0 && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-gray-600">
                {monster.power}
              </Badge>
            )}
            <button
              onClick={() => handleRemoveMonster(index)}
              className="ml-1 text-gray-400 hover:text-gray-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add button or input */}
        {isInputMode ? (
          <div className="relative flex-1 min-w-[150px]">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-2 py-0.5 bg-transparent border-0 text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setIsInputMode(true)}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
          >
            + Add monster
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((monster, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                index === highlightedIndex
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
              }`}
              onClick={() => handleAddMonster(monster)}
            >
              <span className="text-sm">{monster.name?.toLowerCase()}</span>
              {monster.power > 0 && (
                <Badge variant="outline" className="text-xs ml-2 border-gray-600">
                  Power: {monster.power}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default MonsterInputChip;