import type { DailyForecast } from '../types/weather'
import { getWeatherInfo } from '../utils/weatherCodes'

interface ForecastProps {
  data: DailyForecast
}

function Forecast({ data }: ForecastProps) {
  const days = data.time.slice(0, 6)

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        6-Day Forecast
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {days.map((date, i) => {
          const info = getWeatherInfo(data.weather_code[i])
          const d = new Date(date)
          const isToday = i === 0

          return (
            <div
              key={date}
              className={`bg-white rounded-xl p-4 text-center shadow-sm ${
                isToday ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                {isToday
                  ? 'Today'
                  : d.toLocaleDateString('en', { weekday: 'short' })}
              </p>
              <p className="text-3xl mb-2">{info.icon}</p>
              <p className="text-sm font-bold text-gray-900">
                {Math.round(data.temperature_2m_max[i])}°
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(data.temperature_2m_min[i])}°
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Forecast