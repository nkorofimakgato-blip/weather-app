# Weather App

A weather app built with React, TypeScript, and Tailwind CSS. Search any city or use your current location to see current conditions and a 6-day forecast.

** Live Demo:** _(will be added after deployment)_

## Features

-  Search weather by city name
-  Geolocation support (use your current location)
-  Current temperature, humidity, and wind speed
-  6-day forecast with highs and lows
-  Loading and error states
-  Fully responsive design

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS v4** for styling
- **[Open-Meteo API](https://open-meteo.com/)** for weather data (free, no key required)
- **Vercel** for deployment

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── components/       # SearchBar, CurrentWeather, Forecast
├── types/            # TypeScript types for API responses
├── utils/            # Weather code → icon/label mapping
├── App.tsx           # Main app with API logic
└── main.tsx          # Entry point
```