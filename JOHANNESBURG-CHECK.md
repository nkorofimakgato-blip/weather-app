# Johannesburg weather comparison and fixes

## Findings

- The app requests Open-Meteo current conditions. Open-Meteo documents these as model-based current conditions, not a direct reading from a single Johannesburg weather station.
- The app previously displayed `surface_pressure`. The pressure commonly reported in weather summaries is `pressure_msl` (mean sea-level pressure), which is adjusted for elevation. These are not interchangeable, especially at Johannesburg's elevation.
- The previous hourly strip searched from the browser's exact current time, which could skip the current hour after the hour had started.
- The app previously showed the fetch time without making the model-valid time visible.

## Changes in this package

- Request `pressure_msl` and `surface_pressure`; display `pressure_msl` as sea-level pressure.
- Explicitly request Celsius, km/h and mm from the API.
- Align hourly forecast selection to the API's current valid timestamp.
- Show the model-valid time in SAST and separately label the time the app fetched the response.
- Describe the displayed current value as an Open-Meteo model estimate rather than a station observation.
- Retain compatibility with old cached records that do not contain `pressure_msl`.

## Verification status

- TypeScript/TSX syntax transpilation: passed for all 9 source TypeScript files.
- Mocked weather-service check: passed for Johannesburg coordinates, unit parameters, sea-level pressure, UV and visibility mapping.
- Production build: not run. The environment could not install npm dependencies (`ENOTCACHED` in offline mode and no package-registry DNS access).
- Live request from this container: not available because external API DNS resolution failed. Re-test with `npm ci`, `npm run build`, and a browser with internet access.

## Important comparison note

Forecast providers may disagree. Compare the same city coordinates, local timestamp, and forecast metric (current temperature versus daily high/low). Google may use a different data provider or station than Open-Meteo.


## Follow-up fixes based on the Google and WeatherSA screenshots

- The screenshot shows daily highs/lows within about 1–2°C of Google's values. Differences of this size can occur between forecast providers.
- The previous daily row used Open-Meteo's single daily weather code and the maximum hourly rain probability for the entire day. A high evening/night probability could therefore be shown as though it were the daytime rain chance and the condition icon could overstate daytime rain/cloud.
- The hourly request now covers 168 hours, allowing the daily summary to use the dominant weather code and peak precipitation probability between sunrise and sunset. Night-time peak rain probability remains available in the rain label's tooltip.
- The forecast screen now shows the fetch time separately from the model-valid time and provides a refresh action.
- Cached weather is revalidated when the app opens while online, rather than waiting for the first 15-minute refresh interval.

These changes clarify the app's model forecast; they do not make Open-Meteo reproduce Google's proprietary forecast. Small temperature and probability differences remain expected.


## Screenshot comparison (31 October 2026, around 01:00 SAST)

- Google showed 20°C and Clear at 01:00, with a daily high near 31°C and low near 17–18°C.
- WeatherSA showed a daily high of 32°C and low of 16°C. That is a small model spread (about 1–2°C), not evidence of a Celsius/Fahrenheit conversion error.
- Foreca and Dailymet also showed about 20°C and clear at 01:00; other forecasts for the day ranged around 30–33°C for the high and 17–19°C for the low.
- The much more noticeable mismatch was the daily label/rain percentage. Open-Meteo documents daily `weather_code` as the most severe condition in the day, and `precipitation_probability_max` as the maximum probability, so presenting those as the ordinary daytime condition and all-day chance can exaggerate the summary.

The revised UI now uses the dominant hourly condition between sunrise and sunset and shows peak daytime and overnight hourly rain probabilities separately. It also exposes the last fetch time and model-valid time, refreshes cached weather on app open when online, and keeps the next-24-hour strip limited to the next 24 hours even though a full 168-hour series is requested for the week.

## Follow-up verification

- Daily-summary utility: strict TypeScript compilation passed with the available global TypeScript compiler.
- Synthetic summary test passed: a 91% overnight peak was kept separate from a 10% daylight peak; a clear daytime condition was not replaced by an overnight thunderstorm.
- TypeScript/TSX syntax parsing: all 10 source files parsed without syntax diagnostics.
- Full Vite production build and ESLint: still unverified because the available local `node_modules` is incomplete (missing Vite, React type definitions, and other packages). Run `npm ci`, `npm run build`, and `npm run lint` on a machine with package-registry access.
- Live Open-Meteo API response: not verified in this environment because DNS could not resolve `api.open-meteo.com`.
