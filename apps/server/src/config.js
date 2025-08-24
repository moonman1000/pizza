import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: process.env.PORT || 3000,
  routingProvider: (process.env.ROUTING_PROVIDER || 'OSRM').toUpperCase(),
  orsApiKey: process.env.ORS_API_KEY || '',
  appBaseUrl: process.env.APP_BASE_URL || true
};