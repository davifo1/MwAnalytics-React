/**
 * Service for analyzing OTBM map files and counting item/tileid occurrences
 */

const fs = require('fs');
const path = require('path');

/**
 * Analyzes OTBM map file and counts occurrences of specified IDs
 * @param {string} otbmPath - Absolute path to the OTBM file
 * @param {number[]} targetIds - Array of IDs to search for
 * @returns {Object} Analysis result with counts per ID
 */
function analyzeMapOccurrences(otbmPath, targetIds) {
  // Lazy load otbm2json only when needed (CommonJS module)
  const otbm2json = require('../lib/juice/otbm2json/otbm2json.cjs');

  // Validate file exists
  if (!fs.existsSync(otbmPath)) {
    throw new Error(`OTBM file not found at: ${otbmPath}`);
  }

  console.log(`Analyzing OTBM map: ${otbmPath}`);
  console.log(`Looking for IDs: ${targetIds.join(', ')}`);

  // Read and parse OTBM file
  const mapData = otbm2json.read(otbmPath);
  const features = mapData.data.nodes?.[0]?.features || [];

  // Initialize counters
  const idCounts = {};
  targetIds.forEach(id => idCounts[id] = 0);

  let totalTilesAnalyzed = 0;

  // Iterate through all tile areas
  for (const feature of features) {
    if (!feature.tiles || feature.type !== 4) continue;

    for (const tile of feature.tiles) {
      totalTilesAnalyzed++;

      // Check tileid
      if (tile.tileid && targetIds.includes(tile.tileid)) {
        idCounts[tile.tileid]++;
      }

      // Check items in tile
      if (Array.isArray(tile.items)) {
        for (const item of tile.items) {
          if (item.id && targetIds.includes(item.id)) {
            idCounts[item.id]++;
          }
        }
      }
    }
  }

  console.log(`Map analysis complete. Tiles analyzed: ${totalTilesAnalyzed}`);
  console.log('Results:', idCounts);

  return {
    success: true,
    mapPath: otbmPath,
    tilesAnalyzed: totalTilesAnalyzed,
    results: idCounts
  };
}

/**
 * Gets OTBM map path from settings
 * @param {string} settingsPath - Path to settings.js
 * @returns {string} Absolute path to forgotten.otbm
 */
function getOtbmMapPath(settingsPath) {
  const settings = require(settingsPath).default;
  const worldPath = settings.database?.worldPath;

  if (!worldPath) {
    throw new Error('worldPath not found in settings.js');
  }

  return path.join(worldPath, 'forgotten.otbm');
}

/**
 * Converts full tile position to 2048x2048 image position
 * @param {Object} tilePos - Tile position {x, y}
 * @returns {Object} Image position {x, y}
 */
function fullTilePositionToImage2048(tilePos) {
  const DrawnCenter = {x: 32598, y: 32233};
  const VisionSize = 2048;
  const x = Math.round(tilePos.x - DrawnCenter.x + (VisionSize / 2));
  const y = Math.round(tilePos.y - DrawnCenter.y + (VisionSize / 2));
  return {x, y};
}

/**
 * Loads regions from regions.xml
 * @param {string} regionsPath - Path to regions.xml
 * @returns {Map} Map of color -> region info
 */
function loadRegionsFromXml(regionsPath) {
  const xml2js = require('xml2js');
  const xmlContent = fs.readFileSync(regionsPath, 'utf-8');
  const colorToRegion = new Map();

  xml2js.parseString(xmlContent, (err, result) => {
    if (err) throw err;
    const regions = result.regions.region || [];

    for (const region of regions) {
      const color = region.$.color.toUpperCase();
      const description = region.$.description;
      colorToRegion.set(color, description);
    }
  });

  return colorToRegion;
}

/**
 * Loads region bounds image and creates position -> region map
 * @param {string} imagePath - Path to regions-bounds.png
 * @param {Map} colorToRegion - Map of color -> region name
 * @returns {Promise<Map>} Map of "x,y" -> region name
 */
async function loadRegionBoundsImage(imagePath, colorToRegion) {
  const Jimp = require('jimp');
  const image = await Jimp.read(imagePath);
  const positionToRegion = new Map();

  const DrawnCenter = {x: 32598, y: 32233};
  const VisionSize = 2048;

  for (let imgX = 0; imgX < 2048; imgX++) {
    for (let imgY = 0; imgY < 2048; imgY++) {
      const color = Jimp.intToRGBA(image.getPixelColor(imgX, imgY));

      // Ignore transparent pixels
      if (color.a === 0) continue;

      const hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1).toUpperCase()}`;
      const regionName = colorToRegion.get(hexColor);

      if (regionName) {
        // Convert image position to tile position
        const tileX = Math.round(imgX + DrawnCenter.x - (VisionSize / 2));
        const tileY = Math.round(imgY + DrawnCenter.y - (VisionSize / 2));
        const key = `${tileX},${tileY}`;
        positionToRegion.set(key, regionName);
      }
    }
  }

  return positionToRegion;
}

/**
 * Analyzes OTBM map file and counts item occurrences by region
 * @param {string} otbmPath - Absolute path to the OTBM file
 * @param {string} regionsXmlPath - Absolute path to regions.xml
 * @param {string} regionsPngPath - Absolute path to regions-bounds.png
 * @param {number[]} targetIds - Array of IDs to search for
 * @returns {Promise<Object>} Analysis result grouped by itemId -> regions
 */
async function analyzeMapOccurrencesByRegion(otbmPath, regionsXmlPath, regionsPngPath, targetIds) {
  const otbm2json = require('../lib/juice/otbm2json/otbm2json.cjs');

  // Validate files exist
  if (!fs.existsSync(otbmPath)) {
    throw new Error(`OTBM file not found at: ${otbmPath}`);
  }
  if (!fs.existsSync(regionsXmlPath)) {
    throw new Error(`Regions XML not found at: ${regionsXmlPath}`);
  }
  if (!fs.existsSync(regionsPngPath)) {
    throw new Error(`Regions PNG not found at: ${regionsPngPath}`);
  }

  console.log(`Analyzing OTBM map by region: ${otbmPath}`);
  console.log(`Loading regions from: ${regionsXmlPath}`);
  console.log(`Loading region bounds from: ${regionsPngPath}`);
  console.log(`Looking for IDs: ${targetIds.join(', ')}`);

  // Load regions
  const colorToRegion = loadRegionsFromXml(regionsXmlPath);
  console.log(`Loaded ${colorToRegion.size} regions from XML`);

  // Load region bounds image
  const positionToRegion = await loadRegionBoundsImage(regionsPngPath, colorToRegion);
  console.log(`Loaded ${positionToRegion.size} position mappings from image`);

  // Read and parse OTBM file
  const mapData = otbm2json.read(otbmPath);
  const features = mapData.data.nodes?.[0]?.features || [];

  // Initialize result: itemId -> { regionName: count }
  const results = {};
  targetIds.forEach(id => results[id] = {});

  let totalTilesAnalyzed = 0;
  let tilesWithRegion = 0;
  let tilesWithoutRegion = 0;

  // Iterate through all tile areas
  for (const feature of features) {
    if (!feature.tiles || feature.type !== 4) continue;

    for (const tile of feature.tiles) {
      totalTilesAnalyzed++;

      // Calculate absolute position
      const absoluteX = feature.x + tile.x;
      const absoluteY = feature.y + tile.y;
      const posKey = `${absoluteX},${absoluteY}`;

      // Get region for this position
      const regionName = positionToRegion.get(posKey);

      if (!regionName) {
        tilesWithoutRegion++;
        continue;
      }

      tilesWithRegion++;

      // Check tileid
      if (tile.tileid && targetIds.includes(tile.tileid)) {
        if (!results[tile.tileid][regionName]) {
          results[tile.tileid][regionName] = 0;
        }
        results[tile.tileid][regionName]++;
      }

      // Check items in tile
      if (Array.isArray(tile.items)) {
        for (const item of tile.items) {
          if (item.id && targetIds.includes(item.id)) {
            if (!results[item.id][regionName]) {
              results[item.id][regionName] = 0;
            }
            results[item.id][regionName]++;
          }
        }
      }
    }
  }

  console.log(`Map analysis by region complete.`);
  console.log(`Total tiles analyzed: ${totalTilesAnalyzed}`);
  console.log(`Tiles with region: ${tilesWithRegion}`);
  console.log(`Tiles without region: ${tilesWithoutRegion}`);
  console.log('Results:', JSON.stringify(results, null, 2));

  return {
    success: true,
    mapPath: otbmPath,
    tilesAnalyzed: totalTilesAnalyzed,
    tilesWithRegion,
    tilesWithoutRegion,
    results
  };
}

module.exports = {
  analyzeMapOccurrences,
  analyzeMapOccurrencesByRegion,
  getOtbmMapPath
};
