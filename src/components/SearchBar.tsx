import { useState, type FormEvent } from 'react'

interface SearchBarProps {
  onSearch: (city: string) => void
  onGeolocate: () => void
  loading: boolean
}

function SearchBar({ onSearch, onGeolocate, loading }: SearchBarProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (value.trim()) {
      onSearch(value.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a city..."
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
      >
        Search
      </button>
      <button
        type="button"
        onClick={onGeolocate}
        disabled={loading}
        className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
      >
        📍 Use my location
      </button>
    </form>
  )
}

export default SearchBar