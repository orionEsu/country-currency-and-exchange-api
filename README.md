# Country Currency & Exchange API

A RESTful API built with Node.js that fetches country data from external APIs, stores it in MySQL with currency exchange rates, computes estimated GDP, and generates visual summary reports. Features comprehensive CRUD operations with advanced filtering and sorting capabilities.

## Project Files

- `server.js` — main server implementation with all API endpoints
- `imageGenerator.js` — image generation module for summary reports
- `database.js` — MySQL database connection and schema
- `package.json` — dependencies and scripts
- `README.md` — this file

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm

**Note:** This project uses Express.js for the REST API, MySQL2 for database operations, Axios for external API calls, and Canvas for image generation. All data is persisted in MySQL database.

## System Dependencies (for Canvas)

The Canvas library requires some system-level dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

**Windows:**
Follow instructions at: https://github.com/Automattic/node-canvas/wiki/Installation:-Windows

## Install Dependencies

Open a terminal in the project root and run:
```bash
npm install
```

This installs the following dependencies declared in `package.json`:
- `express` — Web framework for Node.js
- `mysql2` — MySQL client for Node.js
- `axios` — HTTP client for API requests
- `canvas` — Image generation library
- `dotenv` — Environment variable management

## Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE country_exchange_db;
```

2. Create a `.env` file in the project root:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=country_exchange_db
```

3. The database schema will be created automatically on first run with the following structure:
```sql
CREATE TABLE countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  capital VARCHAR(255),
  region VARCHAR(100),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(15, 6),
  estimated_gdp DECIMAL(20, 2),
  flag_url TEXT,
  last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Run Locally

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### 1. Refresh Country Data

**POST** `/countries/refresh`

Fetches all countries and exchange rates from external APIs, then caches them in the database. Generates a summary image upon successful completion.

**Request:**
```bash
curl -X POST http://localhost:3000/countries/refresh
```

**Response (200 OK):**
```json
{
  "message": "Countries refreshed successfully",
  "total_countries": 250,
  "last_refreshed_at": "2025-10-28T18:00:00.000Z"
}
```

**Error responses:**
- `503 Service Unavailable` — External API failure
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from REST Countries API"
}
```

**Behavior:**
- Fetches data from `https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies`
- Fetches exchange rates from `https://open.er-api.com/v6/latest/USD`
- Matches currency codes with exchange rates
- Computes `estimated_gdp = population × random(1000-2000) ÷ exchange_rate`
- Updates existing countries or inserts new ones (case-insensitive name matching)
- Generates summary image at `cache/summary.png`

**Currency Handling:**
- Multiple currencies: Only first currency code is stored
- Empty currencies: `currency_code`, `exchange_rate` set to `null`, `estimated_gdp` set to `0`
- Missing exchange rate: `exchange_rate` and `estimated_gdp` set to `null`

### 2. Get All Countries

**GET** `/countries?region=Africa&currency=NGN&sort=gdp_desc`

Returns all countries from the database with optional filtering and sorting.

**Query parameters:**
- `region` — Filter by region (e.g., Africa, Europe, Asia)
- `currency` — Filter by currency code (e.g., NGN, USD, EUR)
- `sort` — Sort results:
  - `gdp_desc` — Highest to lowest GDP
  - `gdp_asc` — Lowest to highest GDP
  - `population_desc` — Highest to lowest population
  - `population_asc` — Lowest to highest population
  - `name_asc` — Alphabetical A-Z
  - `name_desc` — Alphabetical Z-A

**Example:**
```bash
curl "http://localhost:3000/countries?region=Africa&sort=gdp_desc"
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 25767448125.2,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-28T18:00:00Z"
  },
  {
    "id": 2,
    "name": "Ghana",
    "capital": "Accra",
    "region": "Africa",
    "population": 31072940,
    "currency_code": "GHS",
    "exchange_rate": 15.34,
    "estimated_gdp": 3029834520.6,
    "flag_url": "https://flagcdn.com/gh.svg",
    "last_refreshed_at": "2025-10-28T18:00:00Z"
  }
]
```

### 3. Get Specific Country

**GET** `/countries/:name`

Retrieves a single country by name (case-insensitive).

**Example:**
```bash
curl http://localhost:3000/countries/Nigeria
```

**Response (200 OK):** Same structure as individual country object above

**Error responses:**
- `404 Not Found`
```json
{
  "error": "Country not found"
}
```

### 4. Delete Country

**DELETE** `/countries/:name`

Removes a country record from the database.

**Example:**
```bash
curl -X DELETE http://localhost:3000/countries/Nigeria
```

**Response (204 No Content):** Empty response body

**Error responses:**
- `404 Not Found`
```json
{
  "error": "Country not found"
}
```

### 5. Get System Status

**GET** `/status`

Shows total number of countries and last refresh timestamp.

**Example:**
```bash
curl http://localhost:3000/status
```

**Response (200 OK):**
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-28T18:00:00Z"
}
```

### 6. Get Summary Image

**GET** `/countries/image`

Serves the generated summary image containing total countries, top 5 by GDP, and last refresh timestamp.

**Example:**
```bash
curl http://localhost:3000/countries/image --output summary.png
```

**Response (200 OK):** PNG image file

**Error responses:**
- `404 Not Found`
```json
{
  "error": "Summary image not found"
}
```

**Image contains:**
- Total number of countries
- Top 5 countries by estimated GDP with rankings
- Currency codes
- Last refresh timestamp
- Professional gradient design with gold rank badges

## Validation Rules

All create/update operations validate:
- `name` — required, non-empty string
- `population` — required, positive integer
- `currency_code` — required (unless currencies array is empty)

**Error response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": {
    "currency_code": "is required"
  }
}
```

## External APIs

- **Countries:** `https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies`
- **Exchange Rates:** `https://open.er-api.com/v6/latest/USD`

Both APIs are called during the `/countries/refresh` endpoint execution.

## Error Handling

All endpoints return consistent JSON error responses:

- `400 Bad Request` — Validation failure
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Unexpected server error
- `503 Service Unavailable` — External API failure

## Project Structure

```
country-exchange-api/
├── server.js              # Main Express server and routes
├── imageGenerator.js      # Canvas-based image generation
├── database.js            # MySQL connection and queries
├── cache/                 # Generated images directory
│   └── summary.png        # Auto-generated summary image
├── .env                   # Environment variables (not in git)
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Notes

- The random multiplier (1000-2000) for GDP calculation is regenerated on each refresh
- Country names are matched case-insensitively during updates
- The `cache/` directory is created automatically if it doesn't exist
- Summary image is regenerated on every successful refresh
- All timestamps are in ISO 8601 format (UTC)
- Exchange rates are based on USD as the base currency