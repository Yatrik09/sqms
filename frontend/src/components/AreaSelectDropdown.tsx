import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Search, X } from 'lucide-react';
import { POPULAR_AREAS, type GeoArea } from '../utils/geo';

interface AreaSelectDropdownProps {
  value: string;
  onChange: (area: string) => void;
  areas?: GeoArea[];
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

export const AreaSelectDropdown: React.FC<AreaSelectDropdownProps> = ({
  value,
  onChange,
  areas = POPULAR_AREAS,
  className = '',
  buttonClassName = '',
  placeholder = 'Select Area...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedArea = areas.find(
    (a) => a.name.toLowerCase() === value.toLowerCase()
  ) || areas[0];

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (areaName: string) => {
    onChange(areaName);
    setIsOpen(false);
  };

  const filteredAreas = areas.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.tag && a.tag.toLowerCase().includes(q));
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#fafafc] border transition rounded-[980px] text-left cursor-pointer shadow-none ${
          isOpen
            ? 'border-[#0071e3] ring-1 ring-[#0071e3]'
            : 'border-[#d6d6d6] hover:border-[#86868b]'
        } ${buttonClassName}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 mr-2">
          <MapPin className="w-4 h-4 text-[#0071e3] shrink-0" />
          <div className="truncate">
            {selectedArea ? (
              <span className="text-[14px] font-normal text-[#1d1d1f] flex items-center gap-1.5 truncate">
                <span className="truncate">{selectedArea.name}</span>
                {selectedArea.tag && (
                  <span className="text-[11px] px-2 py-0.5 text-[#707070] font-normal bg-[#f5f5f7] rounded-full border border-[#d6d6d6] shrink-0">
                    {selectedArea.tag}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[14px] text-[#86868b]">{placeholder}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#707070] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0071e3]' : ''
          }`}
        />
      </button>

      {/* Styled Scrollable Dropdown Menu — Paper Frost 20px Radius */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#d6d6d6] rounded-[20px] shadow-lg p-2.5 z-[999] min-w-[260px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#707070] border-b border-[#d6d6d6] flex items-center justify-between">
            <span>Select Proximity Area</span>
            <span className="text-[#0066cc]">Ahmedabad Hub</span>
          </div>

          {/* Quick Filter Search */}
          <div className="relative mt-2 mb-2 px-1">
            <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area..."
              className="w-full pl-9 pr-7 py-1.5 bg-[#f5f5f7] border border-[#d6d6d6] rounded-full text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2 text-[#707070] hover:text-[#1d1d1f]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controlled Height Scrollable List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredAreas.length === 0 ? (
              <div className="text-center py-4 text-[13px] text-[#86868b]">
                No matching area found
              </div>
            ) : (
              filteredAreas.map((a) => {
                const isSelected = a.name.toLowerCase() === value.toLowerCase();

                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => handleSelect(a.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#f5f5f7] text-[#0066cc] font-medium border border-[#d6d6d6]'
                        : 'text-[#1d1d1f] hover:bg-[#f5f5f7] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="truncate">{a.name}</span>
                      {a.tag && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] font-normal shrink-0 border border-[#d6d6d6]">
                          {a.tag}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0066cc] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
