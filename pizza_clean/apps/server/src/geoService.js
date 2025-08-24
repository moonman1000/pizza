import { config } from './config.js';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
export async function geocode(address) {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
  const resp = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), { headers: { 'User-Agent': 'pizzaria/1.0 (educational)' } });
  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Endereço não encontrado');
  const { lat, lon, display_name } = data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), normalizedAddress: display_name };
}
export async function route(fromLat, fromLon, toLat, toLon) {
  if (config.routingProvider === 'ORS') {
    const url = new URL('https://api.openrouteservice.org/v2/directions/driving-car');
    url.searchParams.set('api_key', config.orsApiKey);
    url.searchParams.set('start', `${fromLon},${fromLat}`);
    url.searchParams.set('end', `${toLon},${toLat}`);
    const resp = await fetch(url.toString());
    const data = await resp.json();
    const coords = data.features[0].geometry.coordinates.map(([x, y]) => [y, x]);
    const etaMin = Math.ceil(data.features[0].properties.segments[0].duration / 60);
    return { coords, etaMin };
  } else {
    const url = `${OSRM_URL}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const resp = await fetch(url);
    const data = await resp.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error('Rota não encontrada');
    const coords = route.geometry.coordinates.map(([x, y]) => [y, x]);
    const etaMin = Math.ceil(route.duration / 60);
    return { coords, etaMin };
  }
}