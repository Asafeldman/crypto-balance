# Crypto Balance

A microservices-based portfolio management system for cryptocurrency assets.

## Project Overview

Crypto Balance is a NestJS monorepo that allows users to manage their cryptocurrency portfolios. It provides functionality to track balances, calculate total portfolio value, rebalance holdings according to target percentages, and view current allocation distribution.

The system consists of three microservices:

1. **Balance Service**: Core service managing user balances and portfolio operations
2. **Rate Service**: Provides cryptocurrency rates and caches data from CoinGecko
3. **User Service**: (Extra) Manages user accounts

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Environment Setup

This application uses environment variables for configuration. Follow these steps to set it up:

1. Copy the example environment file to create your own:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and update the following variables:
   - `COINGECKO_API_KEY`: Your CoinGecko API key (get one at https://www.coingecko.com/en/api/pricing)
   - Service ports and URLs if needed

3. Save the file and restart the services

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/crypto-balance.git
cd crypto-balance

# Install dependencies
npm install
```

### Running the Services

Each service can be run independently:

```bash
# Start Balance Service (runs on port 3000)
npm run start:balance

# Start Rate Service (runs on port 3001)
npm run start:rate

# Start User Service (runs on port 3002)
npm run start:user
```

For development with hot-reload:

```bash
# Start all services concurrently
npm run start:all

```
## API Endpoints

### Balance Service (PORT: 3000)

#### Portfolio Management

- `GET /balances` - Get all balances for a user
  - Headers: `X-User-ID`

- `GET /balances/total` - Get total portfolio value
  - Headers: `X-User-ID`
  - Query Params: `currency` (optional, defaults to 'usd')

- `GET /balances/allocation` - Get current portfolio allocation percentages
  - Headers: `X-User-ID`

- `POST /balances/rebalance` - Rebalance portfolio based on target percentages
  - Headers: `X-User-ID`
  - Body: 
    ```json
    {
      "targetPercentages": {
        "bitcoin": 50,
        "ethereum": 30,
        "oobit": 20
      }
    }
    ```

#### Balance Operations

- `GET /balances/:balanceId` - Get specific balance by ID
  - Headers: `X-User-ID`

- `POST /balances` - Add a new balance
  - Headers: `X-User-ID`
  - Body:
    ```json
    {
      "asset": "bitcoin",
      "amount": 0.5
    }
    ```

- `PUT /balances/:balanceId` - Update a balance
  - Headers: `X-User-ID`
  - Body:
    ```json
    {
      "amount": 1.25
    }
    ```

- `DELETE /balances/:balanceId` - Remove a balance
  - Headers: `X-User-ID`

### Rate Service (PORT: 3001)

- `GET /rates` - Get rates for all coins or specific coins
  - Query Params: 
    - `ids` (optional) - Comma-separated list of coin IDs
    - `vs_currencies` (optional) - Comma-separated list of currencies (default: 'usd')

### User Service (PORT: 3002) - Optional

- `GET /users` - Get all users
- `GET /users/:userId` - Get a user by ID
- `POST /users` - Create a new user
- `PUT /users/:userId` - Update a user
- `DELETE /users/:userId` - Delete a user

## Testing

```bash
# Run Balance Service tests
npm run test:balance

# Run Rate Service tests
npm run test:rate
```

