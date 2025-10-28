import { createCanvas } from "canvas";
import fs from "fs/promises";
import path from "path";

/**
 * Generate a summary image with country statistics
 * @param {Object} data - Summary data object
 * @param {number} data.totalCountries - Total number of countries
 * @param {Array} data.topCountries - Array of top 5 countries by GDP
 * @param {string} data.lastRefreshed - ISO timestamp of last refresh
 * @returns {Promise<string>} - Path to the generated image
 */

interface GenerateSummaryImage {
  totalCountries: number;
  topCountries: Array<{
    name: string;
    estimated_gdp: number;
    currency_code: string;
  }>;
  lastRefreshed: string;
}

export async function generateSummaryImage(data: GenerateSummaryImage) {
  const { totalCountries, topCountries, lastRefreshed } = data;

  // Canvas dimensions
  const width = 800;
  const height = 600;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1e3a8a");
  gradient.addColorStop(1, "#3b82f6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Country Data Summary", width / 2, 60);

  // Total countries section
  ctx.font = "bold 24px Arial";
  ctx.fillText(`Total Countries: ${totalCountries}`, width / 2, 120);

  // Top 5 countries by GDP
  ctx.font = "bold 28px Arial";
  ctx.fillText("Top 5 Countries by GDP", width / 2, 180);

  // Draw top countries list
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  let yPosition = 230;

  topCountries.forEach((country, index) => {
    const gdp = formatGDP(country.estimated_gdp);
    const rank = index + 1;

    // Rank circle
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(80, yPosition, 18, 0, Math.PI * 2);
    ctx.fill();

    // Rank number
    ctx.fillStyle = "#1e3a8a";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(rank.toString(), 80, yPosition + 6);

    // Country name and GDP
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${country.name}`, 120, yPosition + 5);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(`GDP: $${gdp}`, 120, yPosition + 28);

    // Currency code
    ctx.font = "16px Arial";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(`(${country.currency_code})`, 450, yPosition + 5);

    yPosition += 65;
  });

  // Last refreshed timestamp
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  const formattedDate = new Date(lastRefreshed).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  ctx.fillText(`Last Refreshed: ${formattedDate}`, width / 2, height - 40);

  // Save image to disk
  const cacheDir = path.join(__dirname, "cache");
  const imagePath = path.join(cacheDir, "summary.png");

  // Ensure cache directory exists
  await fs.mkdir(cacheDir, { recursive: true });

  // Write image buffer to file
  const buffer = canvas.toBuffer("image/png");
  await fs.writeFile(imagePath, buffer);

  console.log(`Summary image generated at: ${imagePath}`);
  return imagePath;
}

/**
 * Format GDP number for display
 * @param {number} gdp - GDP value
 * @returns {string} - Formatted GDP string
 */
function formatGDP(gdp: number) {
  if (!gdp) return "0";

  if (gdp >= 1e12) {
    return (gdp / 1e12).toFixed(2) + "T";
  } else if (gdp >= 1e9) {
    return (gdp / 1e9).toFixed(2) + "B";
  } else if (gdp >= 1e6) {
    return (gdp / 1e6).toFixed(2) + "M";
  } else {
    return gdp.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

/**
 * Check if summary image exists
 * @returns {Promise<boolean>}
 */
async function imageExists() {
  try {
    const imagePath = path.join(__dirname, "cache", "summary.png");
    await fs.access(imagePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get path to summary image
 * @returns {string}
 */
function getImagePath() {
  return path.join(__dirname, "cache", "summary.png");
}
