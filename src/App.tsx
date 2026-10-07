import { useState } from 'react'
import SearchBar from './components/SearchBar'
import CurrentWeather from './components/CurrentWeather'
import Forecast from './components/Forecast'
import type { GeoResponse, WeatherResponse } from './types/weather'

function App() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [cityName, setCityName] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchWeather(lat: number, lon: number) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch weather')
    return (await res.json()) as WeatherResponse
  }

  async function handleSearch(city: string) {
    setLoading(true)
    setError(null)
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      )
      const geo: GeoResponse = await geoRes.json()
      if (!geo.results || geo.results.length === 0) {
        throw new Error(`City "${city}" not found`)
      }
      const place = geo.results[0]
      const data = await fetchWeather(place.latitude, place.longitude)
      setWeather(data)
      setCityName(place.name)
      setCountry(place.country)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleGeolocate() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await fetchWeather(
            pos.coords.latitude,
            pos.coords.longitude
          )
          setWeather(data)
          setCityName('Your location')
          setCountry('')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Could not get your location')
        setLoading(false)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Weather
          </h1>
          <p className="text-gray-600">
            Search any city or use your current location
          </p>
        </header>

        <SearchBar
          onSearch={handleSearch}
          onGeolocate={handleGeolocate}
          loading={loading}
        />

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500">Loading weather...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {weather && !loading && !error && (
          <>
            <CurrentWeather
              data={weather.current}
              city={cityName}
              country={country}
            />
            <Forecast data={weather.daily} />
          </>
        )}

        {!weather && !loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-6xl mb-4">🌤️</p>
            <p className="text-gray-500">
              Search a city to see the weather
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App