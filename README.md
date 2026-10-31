# WeatherSA

**Real Weather. Real South Africa.**

A mobile-first React + TypeScript + Vite weather application for South African cities and towns, using a black-and-lime premium dashboard design.

## Features

- Black and near-black interface with vivid lime accents, responsive left navigation, mobile bottom navigation and redesigned weather dashboard.
- Search South African cities, suburbs and towns with country-code validation.
- Current conditions, feels-like temperature, humidity, wind direction/speed, precipitation, UV, pressure, visibility, cloud cover, sunrise and sunset.
- Next 24 hours and seven-day forecasts from Open-Meteo, with 168 hourly forecast steps for daytime/night-time summaries.
- Nine-province location browser with popular locations, favourites and recent searches.
- Celsius/Fahrenheit and km/h/mph preferences, dark/light themes, automatic refresh, optional geolocation and browser notifications.
- Forecast-based weather advisories that distinguish daytime and overnight rain peaks. These are not official South African Weather Service alerts.
- Last successful forecast and preferences stored locally. Cached forecasts are revalidated when the app opens online; the service worker caches the app shell for offline reopening and stale data is labelled as potentially out of date.
- Installable PWA manifest and Android-friendly layout.

## Run locally

Requirements: Node.js 22.12+ (Vite 8 requirement) and npm.

```bash
npm ci
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Forecast interpretation

- Daily condition icons are based on the most common hourly weather code between sunrise and sunset. This avoids using the API's daily `weather_code` as if it were the dominant daytime condition; Open-Meteo defines that daily code as the most severe condition during the day.
- Rain values are split into the peak hourly probability during daylight and the peak overnight probability. These are peak hourly probabilities, not a promise that rain will occur for the whole day.
- WeatherSA uses Open-Meteo's best-match model output. It will not always match Google's proprietary weather display or another provider's chosen model. Compare location, local valid time and metric before judging a difference.

## Data services

- Forecast: Open-Meteo Forecast API (`https://api.open-meteo.com/v1/forecast`)
- Location autocomplete: Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`)
- Reverse geocoding for current location: BigDataCloud reverse geocode client.

The selected location and browser geolocation are checked against South Africa (`ZA`). These public endpoints currently require no API key. No private API keys are embedded in the frontend.

## Offline and alerts

The service worker caches same-origin app resources and the app shell. The last successful weather response is stored in local storage, so it can be displayed when offline. Weather API requests still require a network connection; offline data is not represented as live.

Weather advisories are transparent threshold-based indicators using forecast values (for example, high UV, wind, rain probability and thunderstorm weather codes). They are not official warnings. An official SAWS warning feed has not been connected, so the app must not be used as an emergency alert source.

## Deployment

### Vercel

Import the GitHub repository into Vercel and keep the project root set to `weather-app` (or the repository root if the contents of this folder are at the repository root). Vercel uses `npm run build` and publishes the `dist/` directory, as configured in `vercel.json`. No environment variables are required for the current public weather and geocoding endpoints.

### Other static hosts

Run `npm run build` and deploy the `dist/` directory to a static host that serves HTTPS. Service workers and geolocation require a secure context (localhost is allowed for development).
