export type Countries = {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  currencies?: {
    code: string;
    name: string;
    symbol: string;
  }[];
};

type Rates = { [currencyCode: string]: number };

type ExchangeRate = {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_utc: string;
  time_last_update_unix: number;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: Rates;
};

async function fetchCountries() {
  const response = await fetch(
    "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies",
  );

  if (!response?.ok) {
    throw new Error("Failed to fetch countries data");
  }

  return (await response.json()) as Countries[];
}

async function fetchRates() {
  const exchangeRateResponse = await fetch(
    "https://open.er-api.com/v6/latest/USD",
  );

  if (!exchangeRateResponse?.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  return (await exchangeRateResponse.json()) as ExchangeRate;
}

export async function fetchAndProcessCountries() {
  try {
    const [countries, exchangeRates] = await Promise.all([
      fetchCountries(),
      fetchRates(),
    ]);

    const rates = exchangeRates?.rates;

    const processedCountries = countries?.map((country) => {
      const currency = country?.currencies;

      const name = country?.name?.toLowerCase();
      const capital = country?.capital;
      const region = country?.region;
      const flag_url = country?.flag;
      const population = country?.population;

      let currency_code: string | null;
      let exchange_rate: number | null;
      let estimated_gdp: number | null;

      if (currency && currency.length > 0) {
        currency_code = currency?.[0]?.code;

        if (rates[currency_code]) {
          exchange_rate = rates[currency_code];
          const randomMutiplier = Math.random() * (2000 - 1000) + 1000;
          estimated_gdp =
            (population * randomMutiplier) / (exchange_rate as number);
        } else {
          exchange_rate = null;
          estimated_gdp = null;
        }
      } else {
        currency_code = null;
        exchange_rate = null;
        estimated_gdp = 0;
      }

      return {
        name,
        capital,
        population,
        region,
        flag_url,
        exchange_rate,
        estimated_gdp,
        currency_code,
      };
    });

    return processedCountries;
  } catch (error) {
    throw error;
  }
}
