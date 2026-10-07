import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { GeoResponse, GeoResult } from '../types/weather'

interface SearchBarProps {
  onSelect: (place: GeoResult) => void
  onGeolocate: () => void
  loading: boolean
}

function SearchBar({ onSelect, onGeolocate, loading }: SearchBarProps) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            value.trim()
          )}&count=5`,
          { signal: controller.signal }
        )
        const data: GeoResponse = await res.json()
        setSuggestions(data.results ?? [])
        setShowSuggestions(true)
        setHighlighted(-1)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function pick(place: GeoResult) {
    setValue('')
    setSuggestions([])
    setShowSuggestions(false)
    onSelect(place)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (highlighted >= 0 && suggestions[highlighted]) {
      pick(suggestions[highlighted])
    } else if (suggestions.length > 0) {
      pick(suggestions[0])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-8">
      <div ref={wrapperRef} className="relative flex-1">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search a city..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-72 overflow-y-auto">
            {suggestions.map((place, i) => (
              <li key={place.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => pick(place)}
                  className={`w-full text-left px-4 py-2.5 flex flex-col ${
                    highlighted === i ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-gray-900">
                    {place.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {[place.admin1, place.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showSuggestions && value.trim().length >= 2 && suggestions.length === 0 && !searching && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <li className="px-4 py-3 text-sm text-gray-500">
              No matching cities
            </li>
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onGeolocate}
        disabled={loading}
        className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 whitespace-nowrap"
      >
        📍 Use my location
      </button>
    </div>
  )
}

export default SearchBar