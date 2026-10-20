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
        className={`w-full flex items-center justify-between px-3.5 py-3 bg-slate-800/90 hover:bg-slate-700/80 border transition rounded-xl text-left cursor-pointer shadow-sm ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/30'
            : 'border-slate-700 hover:border-slate-600'
        } ${buttonClassName}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 mr-2">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            {selectedArea ? (
              <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{selectedArea.name}</span>
                {selectedArea.tag && (
                  <span className="text-[11px] px-1.5 py-0.2 text-slate-400 font-normal bg-slate-700/60 rounded border border-slate-600/50 shrink-0">
                    {selectedArea.tag}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-slate-500">{placeholder}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Styled Scrollable Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-[999] min-w-[260px] animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
          {/* Header */}
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
            <span>Select Proximity Area</span>
            <span className="text-emerald-400 font-medium">Ahmedabad Hub</span>
          </div>

          {/* Quick Filter Search */}
          <div className="relative mt-2 mb-1.5 px-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controlled Height Scrollable List (max-h-48 ~ 192px) */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredAreas.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-white border border-blue-500/50 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="truncate">{a.name}</span>
                      {a.tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-normal shrink-0 border border-slate-700/60">
                          {a.tag}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
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
