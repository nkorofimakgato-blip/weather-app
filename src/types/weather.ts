export interface GeoResult {
  id: number
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
}

export interface GeoResponse {
  results?: GeoResult[]
}

export interface CurrentWeather {
  temperature_2m: number
  weather_code: number
  wind_speed_10m: number
  relative_humidity_2m: number
}

export interface DailyForecast {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
}

export interface WeatherResponse {
  current: CurrentWeather
  daily: DailyForecast
}