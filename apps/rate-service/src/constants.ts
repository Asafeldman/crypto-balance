export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
export const COINGECKO_API_KEY = 'CG-c2jsaSaSe4h4JbCPQgtykoLA';
export const CACHE_TTL_MS = 60000;
export const PORT = process.env.RATE_SERVICE_PORT || 3001;
export const RATE_REFRESH_INTERVAL = process.env.RATE_REFRESH_INTERVAL || '0 */5 * * * *'; // Run every 5 minutes