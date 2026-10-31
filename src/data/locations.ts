import type { SavedPlace } from '../types/weather'
export const provinceLocations: Record<string, SavedPlace[]> = {
  Gauteng: [
    { name: 'Johannesburg', admin1: 'Gauteng', latitude: -26.2041, longitude: 28.0473 },
    { name: 'Pretoria', admin1: 'Gauteng', latitude: -25.7479, longitude: 28.2293 },
    { name: 'Soweto', admin1: 'Gauteng', latitude: -26.2485, longitude: 27.8540 },
    { name: 'Vanderbijlpark', admin1: 'Gauteng', latitude: -26.7117, longitude: 27.8379 },
  ],
  'Western Cape': [
    { name: 'Cape Town', admin1: 'Western Cape', latitude: -33.9249, longitude: 18.4241 },
    { name: 'Stellenbosch', admin1: 'Western Cape', latitude: -33.9321, longitude: 18.8602 },
    { name: 'George', admin1: 'Western Cape', latitude: -33.9630, longitude: 22.4617 },
    { name: 'Worcester', admin1: 'Western Cape', latitude: -33.6465, longitude: 19.4485 },
  ],
  'KwaZulu-Natal': [
    { name: 'Durban', admin1: 'KwaZulu-Natal', latitude: -29.8587, longitude: 31.0218 },
    { name: 'Pietermaritzburg', admin1: 'KwaZulu-Natal', latitude: -29.6006, longitude: 30.3794 },
    { name: 'Newcastle', admin1: 'KwaZulu-Natal', latitude: -27.7579, longitude: 29.9318 },
  ],
  'Eastern Cape': [
    { name: 'Gqeberha', admin1: 'Eastern Cape', latitude: -33.9608, longitude: 25.6022 },
    { name: 'East London', admin1: 'Eastern Cape', latitude: -33.0153, longitude: 27.9116 },
    { name: 'Mthatha', admin1: 'Eastern Cape', latitude: -31.5889, longitude: 28.7844 },
  ],
  'Free State': [
    { name: 'Bloemfontein', admin1: 'Free State', latitude: -29.0852, longitude: 26.1596 },
    { name: 'Welkom', admin1: 'Free State', latitude: -27.9774, longitude: 26.7351 },
    { name: 'Bethlehem', admin1: 'Free State', latitude: -28.2308, longitude: 28.3071 },
  ],
  Limpopo: [
    { name: 'Polokwane', admin1: 'Limpopo', latitude: -23.9045, longitude: 29.4689 },
    { name: 'Thohoyandou', admin1: 'Limpopo', latitude: -22.9456, longitude: 30.4849 },
    { name: 'Tzaneen', admin1: 'Limpopo', latitude: -23.8332, longitude: 30.1635 },
  ],
  Mpumalanga: [
    { name: 'Mbombela', admin1: 'Mpumalanga', latitude: -25.4753, longitude: 30.9694 },
    { name: 'Witbank', admin1: 'Mpumalanga', latitude: -25.8713, longitude: 29.2332 },
    { name: 'Secunda', admin1: 'Mpumalanga', latitude: -26.5167, longitude: 29.2000 },
  ],
  'North West': [
    { name: 'Rustenburg', admin1: 'North West', latitude: -25.6676, longitude: 27.2421 },
    { name: 'Mahikeng', admin1: 'North West', latitude: -25.8652, longitude: 25.6442 },
    { name: 'Klerksdorp', admin1: 'North West', latitude: -26.8521, longitude: 26.6667 },
  ],
  'Northern Cape': [
    { name: 'Kimberley', admin1: 'Northern Cape', latitude: -28.7282, longitude: 24.7499 },
    { name: 'Upington', admin1: 'Northern Cape', latitude: -28.4478, longitude: 21.2561 },
    { name: 'Springbok', admin1: 'Northern Cape', latitude: -29.6643, longitude: 17.8865 },
  ],
}
