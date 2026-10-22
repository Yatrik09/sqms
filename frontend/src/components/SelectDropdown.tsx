import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectDropdownProps {
  value: string | number | undefined;
  onChange: (value: any) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  id?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  icon,
  size = 'md',
  searchable,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options into standard SelectOption objects
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const isSearchEnabled = searchable ?? (normalizedOptions.length > 7);

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchEnabled]);

  const handleSelect = (optValue: string | number) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-full',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-[20px]',
    lg: 'px-4 py-3 text-sm sm:text-base rounded-[20px]',
  }[size];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button following DESIGN.md */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#f5f5f7] hover:bg-white border transition text-left cursor-pointer shadow-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[#e6e6e8] border-[#d6d6d6]'
            : isOpen
            ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-white'
            : 'border-[#d6d6d6] hover:border-[#86868b]'
        } ${sizeClasses} ${buttonClassName}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 mr-2 truncate">
          {icon && <span className="shrink-0 text-[#0071e3]">{icon}</span>}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <div className="truncate">
            {selectedOption ? (
              <span className="font-normal text-[#1d1d1f] flex items-center gap-2 truncate">
                <span className="truncate">{selectedOption.label}</span>
                {selectedOption.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#707070] font-normal border border-[#d6d6d6] shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[#86868b]">{placeholder}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#707070] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0071e3]' : ''
          }`}
        />
      </button>

      {/* Styled Dropdown Menu Panel (DESIGN.md Gallery White / Paper Frost Surface) */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#d6d6d6] rounded-[20px] shadow-xl p-2 z-[999] min-w-[220px] animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {/* Optional Search Filter */}
          {isSearchEnabled && (
            <div className="relative mb-2 px-1">
              <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-7 py-1.5 bg-[#f5f5f7] border border-[#d6d6d6] rounded-full text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition"
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
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#86868b]">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition text-left cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-[#86868b]'
                        : isSelected
                        ? 'bg-[#f5f5f7] text-[#0066cc] font-medium border border-[#d6d6d6]'
                        : 'text-[#1d1d1f] hover:bg-[#f5f5f7] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[11px] text-[#707070] block truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#707070] font-normal shrink-0 border border-[#d6d6d6]">
                          {opt.badge}
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
