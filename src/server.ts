import express from "express";
import {
  Countries,
  fetchAndProcessCountries,
} from "../controllers/countryController";
import mysql from "mysql2/promise";
import { generateSummaryImage } from "./imageGenerator";

const app = express();
const port = 3000;

export const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "00000000",
  database: "countries_db",
});

app.get("/countries", async (req, res) => {
  const { region, currency, sort } = req.query;

  let query = "SELECT * FROM countries";
  const params: any = [];
  const whereClauses: string[] = [];

  if (region) {
    whereClauses.push("region = ?");
    params.push(region);
  }

  if (currency) {
    whereClauses.push("currency_code = ?");
    params.push(currency);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  if (sort) {
    const allowedSorts = {
      gdp_desc: "estimated_gdp DESC",
      gdp_asc: "estimated_gdp ASC",
      name_asc: "name ASC",
      name_desc: "name DESC",
      pop_desc: "population DESC",
      pop_asc: "population ASC",
    };

    if (allowedSorts[sort as string]) {
      query += ` ORDER BY ${allowedSorts[sort as string]}`;
    }
  }

  try {
    const [row] = await pool.execute(query, params);
    res.status(200).json(row);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.get("/countries/:name", async (req, res) => {
  try {
    const name = req.params.name;

    const query = "SELECT * FROM countries WHERE name = ?";

    const [rows] = await pool.execute(query, [name]);

    if ((rows as Countries[])?.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({
        error: "Country not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.delete("/countries/:name", async (req, res) => {
  const { name } = req.params;

  const query = "DELETE FROM countries where name = ?";

  try {
    const [result] = await pool.execute(query, [name]);

    if (result?.affectedRows > 0) {
      res.status(200).json({
        message: "Country deleted successfully",
      });
    } else {
      res.status(404).json({
        error: "Country not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error deleting country",
    });
  }
});

app.get("/status", async (req, res) => {
  // const query = "SELECT * FROM countries";
  //
  const query = `
      SELECT
        (SELECT COUNT(*) FROM countries) AS total_countries,
        (SELECT MAX(last_refreshed_at) FROM countries) AS last_refreshed_at;
    `;

  try {
    const [rows] = await pool.execute(query);
    const status = rows[0];

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.post("/countries/refresh", async (req, res) => {
  try {
    const data = await fetchAndProcessCountries();

    const globalRefreshTime = new Date();

    for (const country of data) {
      const query = `
         INSERT INTO countries
         (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           capital = VALUES(capital),
           region = VALUES(region),
           population = VALUES(population),
           currency_code = VALUES(currency_code),
           exchange_rate = VALUES(exchange_rate),
           estimated_gdp = VALUES(estimated_gdp),
           flag_url = VALUES(flag_url),
           last_refreshed_at = VALUES(last_refreshed_at)
       `;

      await pool.query(query, [
        country.name,
        country.capital,
        country.region,
        country.population,
        country.currency_code,
        country.exchange_rate,
        country.estimated_gdp,
        country.flag_url,
        globalRefreshTime,
      ]);
    }

    const [top5]: any = await pool.execute(
      "SELECT name, currency_code, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5",
    );

    const [statusRows]: any = await pool.execute(`
            SELECT
              (SELECT COUNT(*) FROM countries) AS total_countries,
              (SELECT MAX(last_refreshed_at) FROM countries) AS last_refreshed_at;
        `);
    const { total_countries, last_refreshed_at } = statusRows[0];

    await generateSummaryImage({
      totalCountries: total_countries,
      topCountries: top5,
      lastRefreshed: last_refreshed_at,
    });

    res.status(200).json({
      message: "Countries store updated successfully",
      total_countries: data?.length,
      last_refreshed_at: globalRefreshTime.toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      error: "External data source unavailable",
      details: `Could not fetch data from ${error.message}`,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
