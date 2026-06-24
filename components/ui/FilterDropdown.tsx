'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface FilterDropdownProps {
  name: string
  defaultValue: string
  options: Option[]
  placeholder: string
  className?: string
}

export function FilterDropdown({
  name,
  defaultValue,
  options,
  placeholder,
  className = '',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === selectedValue)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const handleSelect = (val: string) => {
    setSelectedValue(val)
    setIsOpen(false)
    // Se vogliamo auto-sottomettere il form quando si cambia filtro:
    setTimeout(() => {
      const form = containerRef.current?.closest('form')
      if (form) {
        form.requestSubmit()
      }
    }, 50)
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input type="hidden" name={name} value={selectedValue} />
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-teal-500 focus:outline-none transition-all duration-150 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={16} className={`ml-2 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[200px] rounded-xl border border-gray-200 bg-white shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Opzione vuota / placeholder */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
              selectedValue === '' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{placeholder}</span>
            {selectedValue === '' && <Check size={14} className="text-teal-600" />}
          </button>
          
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                selectedValue === opt.value ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {selectedValue === opt.value && <Check size={14} className="text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
