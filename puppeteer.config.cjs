const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to a local directory.
  // This ensures the browser is downloaded into our project folder,
  // solving cache issues on platforms like Render.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
