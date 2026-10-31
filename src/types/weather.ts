export interface GeoResult {
  id: number; name: string; country: string; country_code?: string; admin1?: string;
  latitude: number; longitude: number;
}
export interface GeoResponse { results?: GeoResult[] }
export interface CurrentWeather {
  time: string; temperature_2m: number; apparent_temperature: number; weather_code: number;
  wind_speed_10m: number; wind_direction_10m: number; relative_humidity_2m: number;
  precipitation: number; is_day: number; uv_index?: number; pressure_msl?: number; surface_pressure: number;
  visibility?: number; cloud_cover: number;
}
export interface HourlyForecast {
  time: string[]; temperature_2m: number[]; precipitation_probability: number[];
  weather_code: number[]; uv_index: number[]; visibility: number[];
}
export interface DailyForecast {
  time: string[]; weather_code: number[]; temperature_2m_max: number[];
  temperature_2m_min: number[]; precipitation_probability_max: number[];
  uv_index_max: number[]; sunrise: string[]; sunset: string[];
}
export interface WeatherResponse { current: CurrentWeather; hourly: HourlyForecast; daily: DailyForecast; timezone?: string }
export interface SavedPlace { name: string; admin1?: string; latitude: number; longitude: number }
export interface WeatherSnapshot { place: SavedPlace; weather: WeatherResponse; updatedAt: number }
