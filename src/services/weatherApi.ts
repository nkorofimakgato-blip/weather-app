import type { GeoResponse, SavedPlace, WeatherResponse } from '../types/weather'

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'
const timeoutFetch = async (url: string, signal?: AbortSignal) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12000)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort)
  try { return await fetch(url, { signal: controller.signal }) }
  finally { window.clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}

export async function searchSouthAfricanPlaces(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ name: query, count: '15', countryCode: 'ZA', language: 'en', format: 'json' })
  const response = await timeoutFetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal)
  if (!response.ok) throw new Error('Location search is temporarily unavailable. Please try again.')
  const data = await response.json() as GeoResponse
  return (data.results ?? []).filter(p => p.country_code?.toUpperCase() === 'ZA')
}

export async function getWeather(place: SavedPlace, signal?: AbortSignal): Promise<WeatherResponse> {
  const { latitude, longitude } = place
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Invalid location coordinates.')
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation,is_day,pressure_msl,surface_pressure,cloud_cover',
    hourly: 'temperature_2m,precipitation_probability,weather_code,uv_index,visibility',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    forecast_days: '7', forecast_hours: '168', timezone: 'auto', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm',
  })
  let response: Response | undefined
  for (let attempt = 0; attempt < 2; attempt++) {
    try { response = await timeoutFetch(`${WEATHER_BASE}?${params}`, signal); if (response.ok) break; if (response.status !== 429 && response.status < 500) break }
    catch (error) { if (signal?.aborted) throw error; if (attempt === 1) throw new Error('Weather request timed out. Check your connection and retry.') }
  }
  if (!response?.ok) throw new Error(response?.status === 429 ? 'Weather service is busy. Please try again shortly.' : 'Weather data is temporarily unavailable.')
  const data = await response.json() as WeatherResponse
  if (!data.current || !data.hourly?.time?.length || !data.daily?.time?.length) throw new Error('The weather service returned incomplete data.')
  // UV and visibility are requested as hourly variables; use the hour nearest the API's current timestamp.
  const currentTime = new Date(data.current.time).getTime()
  const nearestHour = data.hourly.time.reduce((best, value, index) => Math.abs(new Date(value).getTime() - currentTime) < Math.abs(new Date(data.hourly.time[best]).getTime() - currentTime) ? index : best, 0)
  data.current.uv_index = data.hourly.uv_index[nearestHour]
  data.current.visibility = data.hourly.visibility[nearestHour]
  return data
}

export async function reverseGeocodeSouthAfrica(latitude: number, longitude: number): Promise<SavedPlace> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: 'en' })
  const response = await timeoutFetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`)
  if (!response.ok) throw new Error('Could not verify your country. Search for a South African place instead.')
  const data = await response.json() as { countryCode?: string; city?: string; locality?: string; principalSubdivision?: string }
  if (data.countryCode?.toUpperCase() !== 'ZA') throw new Error('Your current location is outside South Africa.')
  return { name: [data.city || data.locality, data.principalSubdivision].filter(Boolean).join(', ') || 'My location', latitude, longitude }
}
