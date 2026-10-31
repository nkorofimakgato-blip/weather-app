import type { CurrentWeather as CurrentWeatherType } from '../types/weather'
import { getWeatherInfo } from '../utils/weatherCodes'

interface CurrentWeatherProps {
  data: CurrentWeatherType
  city: string
  country: string
}

function CurrentWeather({ data, city, country }: CurrentWeatherProps) {
  const info = getWeatherInfo(data.weather_code)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{city}</h2>
          <p className="text-sm text-gray-500">{country}</p>
        </div>
        <span className="text-6xl">{info.icon}</span>
      </div>

      <p className="text-5xl font-bold text-gray-900 mb-2">
        {Math.round(data.temperature_2m)}°C
      </p>
      <p className="text-gray-600 mb-6">{info.label}</p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 mb-1">Humidity</p>
          <p className="font-medium text-gray-900">
            {data.relative_humidity_2m}%
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 mb-1">Wind</p>
          <p className="font-medium text-gray-900">
            {data.wind_speed_10m} km/h
          </p>
        </div>
      </div>
    </div>
  )
}

export default CurrentWeather