import type { WeatherResponse } from '../types/weather'
import { getWeatherInfo } from './weatherCodes'

/**
 * Builds a daily list summary from daylight-hour data.
 * Open-Meteo's daily weather_code is the most severe condition over the day,
 * and precipitation_probability_max is the maximum hourly probability.
 * Those are useful risk indicators, but can overstate the daytime summary.
 */
export function summarizeDay(weather: WeatherResponse, dayIndex: number) {
  const date = weather.daily.time[dayIndex]
  const sunrise = weather.daily.sunrise?.[dayIndex]?.slice(11, 16) ?? '06:00'
  const sunset = weather.daily.sunset?.[dayIndex]?.slice(11, 16) ?? '18:00'
  const dayHours: { code: number; rain: number }[] = []
  const nightHours: number[] = []

  weather.hourly.time.forEach((time, index) => {
    if (time.slice(0, 10) !== date) return
    const clock = time.slice(11, 16)
    const rain = weather.hourly.precipitation_probability[index] ?? 0
    if (clock >= sunrise && clock <= sunset) {
      dayHours.push({ code: weather.hourly.weather_code[index], rain })
    } else {
      nightHours.push(rain)
    }
  })

  const counts = new Map<number, number>()
  dayHours.forEach(hour => counts.set(hour.code, (counts.get(hour.code) ?? 0) + 1))
  const dominantCode = dayHours.length
    ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : weather.daily.weather_code[dayIndex]
  const peak = (values: number[]) => values.length ? Math.max(...values) : 0

  return {
    info: getWeatherInfo(dominantCode),
    dayRain: dayHours.length ? peak(dayHours.map(hour => hour.rain)) : null,
    nightRain: nightHours.length ? peak(nightHours) : null,
  }
}
