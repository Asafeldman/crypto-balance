/**
 * Service Configuration
 */
export const SERVICES = {
  USER: {
    PORT: process.env.USER_SERVICE_PORT || 3002,
    URL: process.env.USER_SERVICE_URL || 'http://localhost:3002'
  },
  BALANCE: {
    PORT: process.env.BALANCE_SERVICE_PORT || 3000,
    URL: process.env.BALANCE_SERVICE_URL || 'http://localhost:3000'
  },
  RATE: {
    PORT: process.env.RATE_SERVICE_PORT || 3001,
    URL: process.env.RATE_SERVICE_URL || 'http://localhost:3001',
    REFRESH_INTERVAL: process.env.RATE_REFRESH_INTERVAL || '0 */15 * * * *' // Run every 15 minutes
  }
};

/**
 * External APIs
 */
export const EXTERNAL_APIS = {
  COINGECKO: {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    API_KEY: process.env.COINGECKO_API_KEY || 'CG-PepkyvSxxjcVBWPFG3cSDaNg'
  }
};

/**
 * Application Settings
 */
export const APP_SETTINGS = {
  CACHE: {
    TTL_MS: 60000 // 1 minute
  },
  DEFAULT_CURRENCY: 'usd'
};

/**
 * File Paths
 */
export const FILE_PATHS = {
  BALANCES: 'balances.json',
  USERS: 'users.json',
  RATES: 'rates.json'
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}; 