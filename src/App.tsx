import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import SearchBar from './components/SearchBar'
import { provinceLocations } from './data/locations'
import { getWeather, reverseGeocodeSouthAfrica } from './services/weatherApi'
import type { GeoResult, SavedPlace, WeatherResponse, WeatherSnapshot } from './types/weather'
import { getWeatherInfo } from './utils/weatherCodes'
import { summarizeDay } from './utils/dailySummary'

type Page = 'home' | 'forecast' | 'locations' | 'settings'
type Preferences = { temperature: 'C' | 'F'; wind: 'kmh' | 'mph'; theme: 'dark' | 'light'; autoRefresh: boolean; notifications: boolean; autoLocation: boolean }
const DEFAULT_PREFS: Preferences = { temperature: 'C', wind: 'kmh', theme: 'dark', autoRefresh: true, notifications: false, autoLocation: false }
const readStorage = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
const hourLabel = (value: string, timezone = 'Africa/Johannesburg') => new Date(value).toLocaleTimeString('en-ZA', { hour: 'numeric', timeZone: timezone })
const dateLabel = (value: string, options: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', options)
const direction = (degrees: number) => ['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees / 45) % 8]
const windLabel = (value: number, unit: 'kmh' | 'mph') => Math.round(unit === 'mph' ? value * 0.621371 : value)
const formatTime = (value?: string, timezone = 'Africa/Johannesburg') => value ? new Date(value).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: timezone }) : '—'

function App() {
  const cached = readStorage<WeatherSnapshot | null>('weathersa-last-weather', null)
  const [weather, setWeather] = useState<WeatherResponse | null>(cached?.weather ?? null)
  const [place, setPlace] = useState<SavedPlace | null>(cached?.place ?? null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(cached?.updatedAt ?? null)
  const [saved, setSaved] = useState<SavedPlace[]>(() => readStorage('weathersa-favourites', []))
  const [recent, setRecent] = useState<SavedPlace[]>(() => readStorage('weathersa-recent', []))
  const [prefs, setPrefs] = useState<Preferences>(() => ({ ...DEFAULT_PREFS, ...readStorage('weathersa-preferences', DEFAULT_PREFS) }))
  const [page, setPage] = useState<Page>('home')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const [retryPlace, setRetryPlace] = useState<SavedPlace | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const requestId = useRef(0)
  const autoLocationAttempted = useRef(false)
  const initialRefreshAttempted = useRef(false)
  const isSaved = !!place && saved.some(s => s.latitude === place.latitude && s.longitude === place.longitude)
  const current = weather?.current
  const condition = current ? getWeatherInfo(current.weather_code) : null
  const temperature = (c: number) => Math.round(prefs.temperature === 'F' ? c * 9 / 5 + 32 : c)
  const tempUnit = prefs.temperature === 'F' ? '°F' : '°C'
  const windUnit = prefs.wind === 'mph' ? 'mph' : 'km/h'
  const windSpeed = (v: number) => windLabel(v, prefs.wind)
  // Anchor the hourly strip to the API's current valid time, not the browser clock.
  // This prevents the first (current) hour being skipped when the page loads mid-hour.
  const startHour = weather ? weather.hourly.time.reduce((best, value, index, times) =>
    Math.abs(new Date(value).getTime() - new Date(weather.current.time).getTime()) < Math.abs(new Date(times[best]).getTime() - new Date(weather.current.time).getTime()) ? index : best, 0) : 0

  useEffect(() => { localStorage.setItem('weathersa-favourites', JSON.stringify(saved)) }, [saved])
  useEffect(() => { localStorage.setItem('weathersa-recent', JSON.stringify(recent.slice(0, 8))) }, [recent])
  useEffect(() => { localStorage.setItem('weathersa-preferences', JSON.stringify(prefs)) }, [prefs])
  useEffect(() => { if (weather && place && updatedAt) localStorage.setItem('weathersa-last-weather', JSON.stringify({ weather, place, updatedAt } satisfies WeatherSnapshot)) }, [weather, place, updatedAt])
  useEffect(() => {
    const online = () => setOffline(false); const offlineNow = () => setOffline(true)
    window.addEventListener('online', online); window.addEventListener('offline', offlineNow)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineNow) }
  }, [])

  async function loadPlace(next: SavedPlace) {
    initialRefreshAttempted.current = true
    setRetryPlace(next)
    const id = ++requestId.current; setLoading(true); setError('')
    try {
      const result = await getWeather(next)
      if (id !== requestId.current) return
      const now = Date.now(); setWeather(result); setPlace(next); setUpdatedAt(now); setRetryPlace(null)
      setRecent(old => [next, ...old.filter(p => p.latitude !== next.latitude || p.longitude !== next.longitude)].slice(0, 8))
      if (prefs.notifications && 'Notification' in window && Notification.permission === 'granted') {
        const alerts = buildAdvisories(result)
        if (alerts.length) new Notification(`WeatherSA · ${next.name}`, { body: alerts[0].title })
      }
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : 'Could not load weather data.') }
    finally { if (id === requestId.current) setLoading(false) }
  }
  function selectGeo(result: GeoResult) {
    if (result.country_code?.toUpperCase() !== 'ZA') { setError('Please select a location in South Africa.'); return }
    void loadPlace({ name: result.name, admin1: result.admin1, latitude: result.latitude, longitude: result.longitude })
    setPage('home')
  }
  function locate() {
    initialRefreshAttempted.current = true
    if (!navigator.geolocation) { setError('Location is not supported by this browser.'); return }
    const id = ++requestId.current; setLoading(true); setError('')
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const next = await reverseGeocodeSouthAfrica(position.coords.latitude, position.coords.longitude)
        if (id !== requestId.current) return
        const result = await getWeather(next)
        if (id !== requestId.current) return
        setWeather(result); setPlace(next); setUpdatedAt(Date.now()); setRetryPlace(null); setRecent(old => [next, ...old.filter(p => p.latitude !== next.latitude || p.longitude !== next.longitude)].slice(0, 8)); setPage('home')
      } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : 'Location lookup failed.') }
      finally { if (id === requestId.current) setLoading(false) }
    }, () => { if (id === requestId.current) { setError('Location permission was denied or unavailable.'); setLoading(false) } }, { timeout: 12000, maximumAge: 300000 })
  }
  function toggleSaved(target = place) {
    if (!target) return
    const exists = saved.some(s => s.latitude === target.latitude && s.longitude === target.longitude)
    setSaved(exists ? saved.filter(s => s.latitude !== target.latitude || s.longitude !== target.longitude) : [...saved, target])
  }
  function updatePrefs(patch: Partial<Preferences>) { setPrefs(old => ({ ...old, ...patch })) }
  // Revalidate cached weather immediately after opening the app; never leave an old forecast
  // on screen until the 15-minute background refresh interval fires.
  useEffect(() => {
    if (!place || !navigator.onLine || initialRefreshAttempted.current) return
    initialRefreshAttempted.current = true
    void loadPlace(place)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.latitude, place?.longitude, offline])
  async function enableNotifications() {
    if (!('Notification' in window)) { setError('Notifications are not supported in this browser.'); return }
    const permission = await Notification.requestPermission()
    updatePrefs({ notifications: permission === 'granted' })
    if (permission !== 'granted') setError('Notification permission was not granted.')
  }
  useEffect(() => {
    if (!prefs.autoRefresh || !place) return
    const timer = window.setInterval(() => { void loadPlace(place) }, 15 * 60 * 1000)
    return () => window.clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.autoRefresh, place?.latitude, place?.longitude])
  // The location request is intentionally triggered once when the saved preference is enabled.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!prefs.autoLocation || place || autoLocationAttempted.current || !navigator.geolocation) return; autoLocationAttempted.current = true; locate() }, [prefs.autoLocation, place])

  const advisories = useMemo(() => weather ? buildAdvisories(weather) : [], [weather])
  const navItems: { id: Page; label: string; icon: string }[] = [{ id: 'home', label: 'Home', icon: '⌂' }, { id: 'forecast', label: 'Forecast', icon: '▤' }, { id: 'locations', label: 'Locations', icon: '⌖' }, { id: 'settings', label: 'Settings', icon: '⚙' }]
  const timeUpdated = updatedAt ? new Date(updatedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }) : 'Not yet updated'
  const weatherValidAt = current?.time ? new Date(current.time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: weather?.timezone || 'Africa/Johannesburg' }) : '—'

  return <main className={`app-shell ${prefs.theme === 'light' ? 'light-theme' : ''}`}>
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => setPage('home')} aria-label="WeatherSA home">
        <span className="brand-mark" aria-hidden="true">☀</span>
        <span className="brand-name">Weather<span className="brand-light">SA</span></span>
      </button>
      <p className="sidebar-tagline">Real Weather.<br />Real South Africa.</p>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </button>)}
        <button onClick={() => setPage('locations')}><span className="nav-icon">♥</span><span>Favourites</span><small>{saved.length || ''}</small></button>
        <button onClick={() => setPage('settings')}><span className="nav-icon">ⓘ</span><span>About</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sa-emblem"><span>SA</span><small>PROUDLY SOUTH AFRICAN</small></div>
        <div className={`sidebar-status ${offline ? 'is-offline' : ''}`}>
          <span className="status-line"><i />{offline ? 'Offline mode' : 'Live data'}</span>
          <small>{updatedAt ? `Updated ${timeUpdated} SAST` : 'Waiting for weather data'}</small>
        </div>
      </div>
    </aside>

    <div className="content-shell">
      <div className="page-wrap">
        <header className="topbar">
          <div className="topbar-search"><SearchBar onSelect={selectGeo} onGeolocate={locate} loading={loading} /></div>
          <div className="header-actions">
            {place && <span className="current-place"><span>⌖</span>{place.name}</span>}
            <button className="unit-toggle" onClick={() => updatePrefs({ temperature: prefs.temperature === 'C' ? 'F' : 'C' })} aria-label="Change temperature unit"><strong className={prefs.temperature === 'C' ? 'unit-active' : ''}>°C</strong><span>/</span><strong className={prefs.temperature === 'F' ? 'unit-active' : ''}>°F</strong></button>
            <button className="refresh-top" onClick={() => place && void loadPlace(place)} disabled={!place || loading} aria-label="Refresh weather">↻</button>
          </div>
        </header>
        {error && <div className="error-banner" role="alert">⚠ {error}<span className="error-actions">{retryPlace && <button onClick={() => void loadPlace(retryPlace)}>Try again</button>}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></span></div>}
        {offline && <div className="offline-banner">You’re offline. Showing the last saved forecast where available; it may be out of date.</div>}
        {loading && !weather && <LoadingSkeleton />}
        {loading && weather && <div className="loading-card"><span className="loader" /> Updating weather information…</div>}

        {page === 'home' && <>
          {weather && place ? <>
            <section className="weather-hero">
              <div className="hero-cityline" aria-hidden="true" />
              <div className="hero-topline">
                <div><span className="weather-location-pin">⌖</span><span className="hero-city-name">{place.name}</span>{place.admin1 && <span className="hero-province">{place.admin1}</span>}</div>
                <div className="hero-actions"><span className="updated-label">Fetched {timeUpdated}</span><button className={`save-button ${isSaved ? 'is-saved' : ''}`} onClick={() => toggleSaved()}>{isSaved ? '♥ Saved' : '♡ Save place'}</button></div>
              </div>
              <div className="hero-main">
                <div className="hero-reading"><div className="temperature">{temperature(current!.temperature_2m)}<span>{tempUnit}</span></div><div className="condition">{condition?.label}</div><div className="feels-like">Feels like {temperature(current!.apparent_temperature)}{tempUnit}</div></div>
                <div className="hero-weather-icon" aria-hidden="true">{condition?.icon}</div>
                <div className="hero-quick-stats">
                  <HeroStat icon="💧" label="Humidity" value={`${current!.relative_humidity_2m}%`} />
                  <HeroStat icon="🌬" label="Wind" value={`${windSpeed(current!.wind_speed_10m)} ${windUnit}`} />
                  <HeroStat icon="☀" label="UV Index" value={current!.uv_index?.toFixed(1) ?? '—'} />
                </div>
              </div>
              <div className="hero-bottom"><span>{current!.is_day ? '☀ Daytime' : '☾ Nighttime'}</span><span>{offline || error ? 'Last saved forecast' : 'Open-Meteo model estimate'}</span><span className="source-stamp">Valid {weatherValidAt} SAST</span><div className="hero-sun-times"><span>🌅 Sunrise <strong>{formatTime(weather.daily.sunrise[0], weather.timezone)}</strong></span><span>🌇 Sunset <strong>{formatTime(weather.daily.sunset[0], weather.timezone)}</strong></span></div></div>
            </section>

            <div className="home-dashboard-grid">
              <section className="panel seven-day-panel">
                <div className="section-heading"><div><span className="section-kicker">UPCOMING WEATHER</span><h2>7-Day Forecast</h2></div><button className="text-action" onClick={() => setPage('forecast')}>View full forecast <span>→</span></button></div>
                <div className="day-strip">{weather.daily.time.map((date, i) => { const summary = summarizeDay(weather, i); return <article className="day-tile" key={date}><span className="day-name">{i === 0 ? 'Today' : dateLabel(date, { weekday: 'short' })}</span><small>{dateLabel(date, { day: '2-digit', month: 'short' })}</small><span className="day-icon">{summary.info.icon}</span><strong>{temperature(weather.daily.temperature_2m_max[i])}° <span>/ {temperature(weather.daily.temperature_2m_min[i])}°</span></strong><small className="day-rain">💧 {summary.dayRain === null ? '—' : `${summary.dayRain}%`}</small></article> })}</div>
              </section>

              <section className="panel hourly-panel chart-panel"><div className="section-heading"><div><span className="section-kicker">HOUR BY HOUR</span><h2>24-Hour Forecast</h2></div><button className="text-action" onClick={() => setPage('forecast')}>Details <span>→</span></button></div><HourlyChart weather={weather} start={startHour} temperature={temperature} unit={tempUnit} /><Hourly weather={weather} start={startHour} temperature={temperature} unit={tempUnit} /></section>

              <section className="panel conditions-panel"><div className="section-heading"><div><span className="section-kicker">RIGHT NOW</span><h2>Current Conditions</h2></div><span className="condition-live"><i /> Live</span></div><div className="conditions-grid">
                <Metric icon="🌡" label="FEELS LIKE" value={`${temperature(current!.apparent_temperature)}${tempUnit}`} note="Apparent temperature" />
                <Metric icon="💧" label="HUMIDITY" value={`${current!.relative_humidity_2m}%`} note="Relative humidity" />
                <Metric icon="🌬" label="WIND" value={`${windSpeed(current!.wind_speed_10m)} ${windUnit}`} note={`${direction(current!.wind_direction_10m)} · ${current!.wind_direction_10m}°`} />
                <Metric icon="▤" label="PRESSURE" value={current!.pressure_msl === undefined ? '—' : `${Math.round(current!.pressure_msl)} hPa`} note="Sea-level pressure" />
                <Metric icon="◉" label="VISIBILITY" value={current!.visibility === undefined ? '—' : `${(current!.visibility / 1000).toFixed(1)} km`} note="Horizontal visibility" />
                <Metric icon="☁" label="CLOUD COVER" value={`${current!.cloud_cover}%`} note="Cloud coverage" />
                <Metric icon="☔" label="RAINFALL" value={`${current!.precipitation} mm`} note="Current precipitation" />
                <Metric icon="☀" label="UV INDEX" value={current!.uv_index?.toFixed(1) ?? '—'} note={current!.uv_index === undefined ? 'Not available' : uvDescription(current!.uv_index)} />
              </div></section>

              <AdvisoryPanel items={advisories} />

              <section className="panel favourites-panel"><div className="section-heading"><div><span className="section-kicker">QUICK ACCESS</span><h2>Favourites</h2></div><button className="text-action" onClick={() => setPage('locations')}>Manage <span>→</span></button></div>
                {saved.length ? <div className="favourite-list">{saved.slice(0, 5).map(s => <div className="favourite-row" key={`${s.latitude}-${s.longitude}`}><span className="favourite-pin">⌖</span><button onClick={() => void loadPlace(s)}><strong>{s.name}</strong><small>{s.admin1 || 'South Africa'}</small></button><button className="remove-favourite" onClick={() => toggleSaved(s)} aria-label={`Remove ${s.name} from favourites`}>♥</button></div>)}</div> : <div className="favourites-empty"><span>♡</span><p>Save places you check often and they’ll appear here.</p><button onClick={() => toggleSaved()}>Save {place.name}</button></div>}
              </section>
            </div>
          </> : <section className="welcome-card"><div className="welcome-art">🌤️</div><div><span className="section-kicker">MADE FOR SOUTH AFRICA</span><h2>Find your forecast.</h2><p>Search any South African city, suburb or town, or use your current location to get started.</p><div className="popular-places">{['Johannesburg','Cape Town','Durban','Pretoria','Polokwane','Gqeberha'].map(name => <button key={name} onClick={() => { const p = Object.values(provinceLocations).flat().find(x => x.name === name); if (p) void loadPlace(p) }}>{name}</button>)}</div></div></section>}
        </>}

        {page === 'forecast' && <section className="page-section"><PageHeading kicker="PLAN AHEAD" title="Your 7-day forecast" subtitle={place ? `${place.name}${place.admin1 ? `, ${place.admin1}` : ''} · Updated ${timeUpdated} · Model valid ${weatherValidAt} SAST` : 'Search for a South African location to see its forecast.'} />
          {weather ? <><section className="panel"><div className="section-heading"><div><span className="section-kicker">UPCOMING WEATHER</span><h2>Daily outlook</h2></div><div className="forecast-heading-actions"><span className="panel-hint">High / Low · Peak daylight rain</span><button className="text-action" onClick={() => place && void loadPlace(place)} disabled={loading}>↻ Refresh</button></div></div><div className="forecast-list">{weather.daily.time.map((date, i) => { const summary = summarizeDay(weather, i); return <div className="forecast-row" key={date}><span className="forecast-day">{i === 0 ? 'Today' : dateLabel(date, { weekday: 'long' })}</span><span className="forecast-date">{dateLabel(date, { day: 'numeric', month: 'short' })}</span><span className="forecast-icon">{summary.info.icon}</span><span className="forecast-condition">{summary.info.label}</span><div className="temp-range"><span>{temperature(weather.daily.temperature_2m_min[i])}°</span><div className="range-track"><i style={{ width: `${Math.max(12, Math.min(90, (weather.daily.temperature_2m_max[i] - weather.daily.temperature_2m_min[i]) * 3))}%` }} /></div><b>{temperature(weather.daily.temperature_2m_max[i])}°</b></div><span className="rain-prob" aria-label={`Peak daytime rain ${summary.dayRain === null ? 'not available' : `${summary.dayRain}%`}; overnight peak ${summary.nightRain === null ? 'not available' : `${summary.nightRain}%`}`}><strong>☂ Day {summary.dayRain === null ? '—' : `${summary.dayRain}%`}</strong><small>Night {summary.nightRain === null ? '—' : `${summary.nightRain}%`}</small></span></div>})}</div></section><section className="panel"><div className="section-heading"><div><span className="section-kicker">HOUR BY HOUR</span><h2>Next 24 hours</h2></div></div><Hourly weather={weather} start={startHour} temperature={temperature} unit={tempUnit} /></section><AdvisoryPanel items={advisories} /></> : <EmptyState onHome={() => setPage('home')} />}
        </section>}

        {page === 'locations' && <section className="page-section"><PageHeading kicker="EXPLORE THE COUNTRY" title="South African locations" subtitle="Browse popular cities and towns across all nine provinces." />
          {saved.length > 0 && <section className="panel"><div className="section-heading"><div><span className="section-kicker">YOUR SHORTLIST</span><h2>Favourite locations</h2></div></div><div className="location-grid">{saved.map(p => <LocationCard key={`${p.latitude}-${p.longitude}`} place={p} active={place?.latitude === p.latitude && place?.longitude === p.longitude} onChoose={() => { void loadPlace(p); setPage('home') }} onRemove={() => toggleSaved(p)} saved />)}</div></section>}
          {recent.length > 0 && <section className="panel"><div className="section-heading"><div><span className="section-kicker">RECENTLY VIEWED</span><h2>Recent searches</h2></div></div><div className="chip-list">{recent.map(p => <button key={`${p.latitude}-${p.longitude}`} className="favourite-chip" onClick={() => { void loadPlace(p); setPage('home') }}>{p.name}</button>)}</div></section>}
          <div className="province-list">{Object.entries(provinceLocations).map(([province, places]) => <section className="panel province-panel" key={province}><div className="section-heading"><div><span className="section-kicker">PROVINCE</span><h2>{province}</h2></div><span className="panel-hint">{places.length} featured locations</span></div><div className="location-grid">{places.map(p => <LocationCard key={p.name} place={p} active={place?.name === p.name} onChoose={() => { void loadPlace(p); setPage('home') }} onRemove={() => toggleSaved(p)} saved={saved.some(s => s.latitude === p.latitude && s.longitude === p.longitude)} onSave={() => toggleSaved(p)} />)}</div></section>)}</div>
        </section>}

        {page === 'settings' && <section className="page-section"><PageHeading kicker="MAKE IT YOURS" title="Settings" subtitle="Choose how WeatherSA displays and updates your weather." />
          <section className="panel settings-panel"><Setting title="Temperature" description="Choose your preferred temperature unit."><div className="segmented"><button className={prefs.temperature === 'C' ? 'selected' : ''} onClick={() => updatePrefs({ temperature: 'C' })}>Celsius (°C)</button><button className={prefs.temperature === 'F' ? 'selected' : ''} onClick={() => updatePrefs({ temperature: 'F' })}>Fahrenheit (°F)</button></div></Setting>
            <Setting title="Wind speed" description="Choose how wind speed is shown."><div className="segmented"><button className={prefs.wind === 'kmh' ? 'selected' : ''} onClick={() => updatePrefs({ wind: 'kmh' })}>km/h</button><button className={prefs.wind === 'mph' ? 'selected' : ''} onClick={() => updatePrefs({ wind: 'mph' })}>mph</button></div></Setting>
            <Setting title="Appearance" description="Switch between black and lime dark mode or light mode."><div className="segmented"><button className={prefs.theme === 'dark' ? 'selected' : ''} onClick={() => updatePrefs({ theme: 'dark' })}>Dark</button><button className={prefs.theme === 'light' ? 'selected' : ''} onClick={() => updatePrefs({ theme: 'light' })}>Light</button></div></Setting>
            <Setting title="Automatic refresh" description="Refresh the selected location every 15 minutes."><Toggle checked={prefs.autoRefresh} onChange={v => updatePrefs({ autoRefresh: v })} /></Setting>
            <Setting title="Automatic location" description="Ask for your location when WeatherSA opens."><Toggle checked={prefs.autoLocation} onChange={v => updatePrefs({ autoLocation: v })} /></Setting>
            <Setting title="Weather notifications" description="Show a browser notification when forecast-based advisories are detected."><Toggle checked={prefs.notifications} onChange={v => v ? void enableNotifications() : updatePrefs({ notifications: false })} /></Setting>
          </section>
          <section className="panel about-panel"><span className="section-kicker">ABOUT</span><h2>WeatherSA</h2><p>Real Weather. Real South Africa.</p><div className="about-row"><span>Version</span><strong>1.0.0</strong></div><div className="about-row"><span>Weather data</span><strong>Open-Meteo</strong></div><div className="about-row"><span>Location search</span><strong>Open-Meteo Geocoding</strong></div><div className="about-row"><span>Last successful update</span><strong>{timeUpdated}</strong></div><p className="disclaimer">WeatherSA is an independent weather interface. Forecast-based advisories are not official SAWS warnings.</p></section>
        </section>}
        <footer className="footer"><span>☀ WEATHER SA</span><span>Model-based weather data by Open-Meteo · Search restricted to South Africa</span></footer>
      </div>
    </div>
    <nav className="mobile-nav" aria-label="Main navigation">{navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
  </main>
}

function HeroStat({ icon, label, value }: { icon: string; label: string; value: string }) { return <div className="hero-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div> }
function HourlyChart({ weather, start, temperature, unit }: { weather: WeatherResponse; start: number; temperature: (n: number) => number; unit: string }) {
  const available = Math.min(24, weather.hourly.time.length - start)
  const indices = Array.from({ length: Math.min(6, available) }, (_, i) => start + Math.round(i * Math.max(0, available - 1) / Math.max(1, Math.min(6, available) - 1)))
  const values = indices.map(i => temperature(weather.hourly.temperature_2m[i]))
  const min = values.length ? Math.min(...values) : 0; const max = values.length ? Math.max(...values) : 1; const spread = Math.max(1, max - min)
  const points = values.map((v, i) => ({ x: 18 + i * (464 / Math.max(1, values.length - 1)), y: 108 - ((v - min) / spread) * 72, value: v, label: hourLabel(weather.hourly.time[indices[i]], weather.timezone) }))
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${points.at(-1)?.x ?? 482} 126 L 18 126 Z`
  return <div className="hourly-chart"><svg viewBox="0 0 500 145" role="img" aria-label="Temperature trend over the next 24 hours"><defs><linearGradient id="lime-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a8ff00" stopOpacity=".32"/><stop offset="100%" stopColor="#a8ff00" stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#lime-area)"/><path d={path} fill="none" stroke="#b6ff00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p, i) => <g key={`${p.x}-${i}`}><circle cx={p.x} cy={p.y} r="5.5" fill="#b6ff00" stroke="#17200c" strokeWidth="2"/><text x={p.x} y={p.y - 13} textAnchor="middle" fill="#f2f8e9" fontSize="12" fontWeight="700">{p.value}°</text></g>)}</svg><div className="chart-times">{points.map((p, i) => <span key={i}>{i === 0 ? 'Now' : p.label}</span>)}</div><p className="chart-note">Temperature trend · {unit}</p></div>
}

function buildAdvisories(weather: WeatherResponse) {
  const c = weather.current; const daily = weather.daily
  const alerts: { title: string; detail: string; level: 'high' | 'moderate' }[] = []
  if (c.weather_code >= 95) alerts.push({ title: 'Thunderstorm conditions', detail: 'The current weather code indicates thunderstorms. Consider delaying exposed outdoor activities.', level: 'high' })
  if (c.wind_speed_10m >= 50) alerts.push({ title: 'Strong winds', detail: `Current wind speed is ${Math.round(c.wind_speed_10m)} km/h. Secure loose outdoor items.`, level: 'high' })
  const daySummaries = daily.time.map((_, index) => summarizeDay(weather, index))
  const daytimeRainPeak = Math.max(0, ...daySummaries.map(day => day.dayRain ?? 0))
  const overnightRainPeak = Math.max(0, ...daySummaries.map(day => day.nightRain ?? 0))
  if (daytimeRainPeak >= 75) alerts.push({ title: 'High daytime rain probability', detail: `Peak hourly rain probability during daylight reaches ${daytimeRainPeak}% on at least one forecast day.`, level: 'moderate' })
  if (overnightRainPeak >= 75) alerts.push({ title: 'High overnight rain probability', detail: `Peak hourly rain probability overnight reaches ${overnightRainPeak}% on at least one forecast night.`, level: 'moderate' })
  if (Math.max(...daily.uv_index_max) >= 8) alerts.push({ title: 'Very high UV forecast', detail: 'Use sun protection and limit prolonged exposure during peak sunlight.', level: 'moderate' })
  if (Math.max(...daily.temperature_2m_max) >= 38) alerts.push({ title: 'High temperature forecast', detail: 'Forecast temperatures reach at least 38°C. Stay hydrated and avoid heat exposure.', level: 'high' })
  return alerts
}
function Metric({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) { return <article className="metric-card"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article> }
function PageHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) { return <div className="page-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{subtitle}</p></div> }
function Hourly({ weather, start, temperature, unit }: { weather: WeatherResponse; start: number; temperature: (n: number) => number; unit: string }) { return <div className="hourly-scroll">{weather.hourly.time.slice(start, start + 24).map((time, index) => { const i = start + index; const info = getWeatherInfo(weather.hourly.weather_code[i]); return <div className="hour-item" key={time}><span className="hour-time">{index === 0 ? 'Now' : hourLabel(time, weather.timezone)}</span><span className="hour-icon">{info.icon}</span><strong>{temperature(weather.hourly.temperature_2m[i])}{unit}</strong><span className="hour-rain">☂ {weather.hourly.precipitation_probability[i] ?? 0}%</span></div> })}</div> }
function AdvisoryPanel({ items }: { items: ReturnType<typeof buildAdvisories> }) { return <section className="panel alerts-panel"><div className="section-heading"><div><span className="section-kicker">WEATHER WATCH</span><h2>Weather advisories</h2></div><span className="panel-hint">Based on forecast data</span></div>{items.length ? <div className="advisory-list">{items.map((a, i) => <article className={`advisory-card ${a.level}`} key={`${a.title}-${i}`}><span>{a.level === 'high' ? '⚠' : 'ⓘ'}</span><div><strong>{a.title}</strong><p>{a.detail}</p></div></article>)}</div> : <p className="no-alerts">No forecast-based advisories detected for this location at the moment.</p>}<p className="disclaimer">These are automated indicators from forecast data, not official South African Weather Service warnings.</p></section> }
function LocationCard({ place, active, saved, onChoose, onRemove, onSave }: { place: SavedPlace; active: boolean; saved: boolean; onChoose: () => void; onRemove: () => void; onSave?: () => void }) { return <article className={`location-card ${active ? 'selected' : ''}`}><button className="location-select" onClick={onChoose}><span className="location-pin">⌖</span><span><strong>{place.name}</strong><small>{place.admin1}</small></span><span className="location-arrow">→</span></button>{saved ? <button className="location-save saved" onClick={onRemove} aria-label={`Remove ${place.name} from favourites`}>♥</button> : <button className="location-save" onClick={onSave} aria-label={`Save ${place.name}`} disabled={!onSave}>♡</button>}</article> }
function Setting({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <div className="setting-row"><div><strong>{title}</strong><p>{description}</p></div>{children}</div> }
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) { return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span /></button> }
function LoadingSkeleton() { return <section className="loading-skeleton" aria-label="Loading weather"><div className="skeleton-block skeleton-title"/><div className="skeleton-block skeleton-hero"/><div className="skeleton-metrics">{[1,2,3,4].map(n => <div className="skeleton-block" key={n}/>)}</div><div className="skeleton-block skeleton-panel"/></section> }
function EmptyState({ onHome }: { onHome: () => void }) { return <div className="empty-state"><div>🌦️</div><h2>No forecast loaded yet</h2><p>Search for a South African city or town to view its weather.</p><button onClick={onHome}>Go to search</button></div> }
function uvDescription(uv: number) { return uv >= 8 ? 'Very high · Protect your skin' : uv >= 6 ? 'High · Sun protection advised' : uv >= 3 ? 'Moderate · Take care' : 'Low UV exposure' }
export default App
