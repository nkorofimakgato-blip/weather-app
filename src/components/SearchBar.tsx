import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { GeoResult } from '../types/weather'
import { searchSouthAfricanPlaces } from '../services/weatherApi'
interface Props { onSelect: (place: GeoResult) => void; onGeolocate: () => void; loading: boolean }
export default function SearchBar({ onSelect, onGeolocate, loading }: Props) {
  const [value, setValue] = useState(''); const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false); const [searching, setSearching] = useState(false)
  const [error, setError] = useState(''); const [active, setActive] = useState(-1)
  const wrapper = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const query = value.trim(); if (query.length < 2) return
    const controller = new AbortController(); const timer = window.setTimeout(async () => {
      setSearching(true); setError('')
      try { const results = await searchSouthAfricanPlaces(query, controller.signal); setSuggestions(results); setOpen(true); setActive(-1) }
      catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Search failed.'); setSuggestions([]); setOpen(true) } }
      finally { if (!controller.signal.aborted) setSearching(false) }
    }, 280)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [value])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close)
  }, [])
  function choose(place: GeoResult) { if (place.country_code?.toUpperCase() !== 'ZA') return; setValue(''); setOpen(false); setSuggestions([]); onSelect(place) }
  function submit(e: FormEvent) { e.preventDefault(); if (active >= 0 && suggestions[active]) choose(suggestions[active]); else if (suggestions[0]) choose(suggestions[0]) }
  function keydown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(v => Math.max(v - 1, 0)) }
    if (e.key === 'Enter' && active >= 0 && suggestions[active]) { e.preventDefault(); choose(suggestions[active]) }
  }
  return <div className="search-row">
    <div className="search-wrap" ref={wrapper}>
      <form onSubmit={submit} role="search"><label className="sr-only" htmlFor="location-search">Search South African locations</label>
        <span className="search-symbol" aria-hidden="true">⌕</span>
        <input id="location-search" type="search" value={value} onChange={e => { const next = e.target.value; setValue(next); setActive(-1); setError(''); if (next.trim().length < 2) { setSuggestions([]); setOpen(false); setSearching(false) } else { setOpen(true); setSearching(true) } }} onFocus={() => value.trim().length >= 2 && setOpen(true)} onKeyDown={keydown} placeholder="Search any South African city or town…" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls="location-suggestions" />
        <button type="submit" className="search-submit" aria-label="Search">Search</button>
      </form>
      {open && <ul id="location-suggestions" className="suggestions" role="listbox" aria-label="South African locations">
        {suggestions.map((p, i) => <li key={p.id}><button type="button" role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)} onClick={() => choose(p)}><strong>{p.name}</strong><span>{[p.admin1, 'South Africa'].filter(Boolean).join(' · ')}</span></button></li>)}
        {searching && <li className="suggestion-message">Searching South Africa…</li>}
        {error && <li className="suggestion-message error-text">{error}</li>}
        {!searching && !error && !suggestions.length && <li className="suggestion-message">No matching South African locations found.</li>}
      </ul>}
    </div>
    <button className="location-button" type="button" onClick={onGeolocate} disabled={loading}>⌖ <span>{loading ? 'Locating…' : 'Use my location'}</span></button>
  </div>
}
