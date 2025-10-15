import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { createRequire } from 'module';
import { sendJson, sendError } from '../helpers/requestHelpers.js';

// Create require for importing CommonJS modules
const require = createRequire(import.meta.url);

/**
 * Map routes
 */
export function mapRoutes(server) {
  // API endpoint to analyze OTBM map for item occurrences
  server.middlewares.use('/api/map/analyze', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const idsParam = url.searchParams.get('ids');

      if (!idsParam) {
        return sendError(res, 400, 'Missing ids parameter. Usage: /api/map/analyze?ids=27005,26971');
      }

      // Parse IDs from comma-separated string
      const targetIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (targetIds.length === 0) {
        return sendError(res, 400, 'No valid IDs provided');
      }

      // Load map analyzer service
      const mapAnalyzerService = require(path.join(process.cwd(), 'src/services/mapAnalyzerService.cjs'));

      // Get OTBM path from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const otbmPath = mapAnalyzerService.getOtbmMapPath(settingsPath);

      // Analyze map
      const result = mapAnalyzerService.analyzeMapOccurrences(otbmPath, targetIds);

      sendJson(res, 200, result);

    } catch (error) {
      console.error('Error analyzing map:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to get regions info
  server.middlewares.use('/api/map/regions', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const regionsXmlPath = path.join(worldPath, 'regions.xml');
      const xmlContent = fs.readFileSync(regionsXmlPath, 'utf-8');

      const result = await parseStringPromise(xmlContent);

      const regions = (result.regions?.region || []).map(region => ({
        name: region.$.name,
        description: region.$.description,
        recommendedLevel: region.$['recommended-level'],
        color: region.$.color
      }));

      sendJson(res, 200, { success: true, regions });

    } catch (error) {
      console.error('Error loading regions:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to analyze OTBM map by region - counts item occurrences per region
  server.middlewares.use('/api/map/analyze-by-region', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const idsParam = url.searchParams.get('ids');

      if (!idsParam) {
        return sendError(res, 400, 'Missing ids parameter. Usage: /api/map/analyze-by-region?ids=27005,26971');
      }

      // Parse IDs from comma-separated string
      const targetIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (targetIds.length === 0) {
        return sendError(res, 400, 'No valid IDs provided');
      }

      // Load map analyzer service
      const mapAnalyzerService = require(path.join(process.cwd(), 'src/services/mapAnalyzerService.cjs'));

      // Get paths from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const otbmPath = path.join(worldPath, 'forgotten.otbm');
      const regionsXmlPath = path.join(worldPath, 'regions.xml');
      const regionsPngPath = path.join(worldPath, 'regions-bounds.png');

      // Analyze map by region
      const result = await mapAnalyzerService.analyzeMapOccurrencesByRegion(
        otbmPath,
        regionsXmlPath,
        regionsPngPath,
        targetIds
      );

      sendJson(res, 200, result);

    } catch (error) {
      console.error('Error analyzing map by region:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to get world-spawn.xml from worldPath
  server.middlewares.use('/api/spawn', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const spawnPath = path.join(worldPath, 'world-spawn.xml');

      if (!fs.existsSync(spawnPath)) {
        console.error(`Spawn file not found at: ${spawnPath}`);
        throw new Error(`Spawn file not found at: ${spawnPath}`);
      }

      const spawnContent = fs.readFileSync(spawnPath, 'utf-8');

      res.setHeader('Content-Type', 'application/xml');
      res.statusCode = 200;
      res.end(spawnContent);
    } catch (error) {
      console.error('Error loading spawn file:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to analyze monsters by region from world-spawn.xml
  server.middlewares.use('/api/map/monsters-by-region', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const otbm2json = require(path.join(process.cwd(), 'src/lib/juice/otbm2json/otbm2json.cjs'));

      // Get paths from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;
      const monstersPath = settings.database?.monstersPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }
      if (!monstersPath) {
        throw new Error('monstersPath not found in settings.js');
      }

      const spawnPath = path.join(worldPath, 'world-spawn.xml');
      const areasPath = path.join(worldPath, 'forgotten-areas.xml');
      const otbmPath = path.join(worldPath, 'forgotten.otbm');
      const regionsXmlPath = path.join(worldPath, 'regions.xml');
      const regionsPngPath = path.join(worldPath, 'regions-bounds.png');

      // Load regions mapping
      const mapAnalyzerService = require(path.join(process.cwd(), 'src/services/mapAnalyzerService.cjs'));
      const regionsXmlContent = fs.readFileSync(regionsXmlPath, 'utf-8');
      const colorToRegion = new Map();
      const regionNameToVarLevel = new Map();
      const regionNameToRecommendedLevel = new Map();
      const regionNameToMinLevel = new Map();

      const regionsResult = await parseStringPromise(regionsXmlContent);
      const regions = regionsResult.regions.region || [];
      for (const region of regions) {
        const color = region.$.color.toUpperCase();
        const description = region.$.description;
        const levelvar = parseInt(region.$.levelvar || '0');
        const recommendedLevel = region.$['recommended-level'] || '';

        // Extract min level from recommended-level (e.g., "70-100" -> 70)
        const minLevelMatch = recommendedLevel.match(/^(\d+)/);
        const minLevel = minLevelMatch ? parseInt(minLevelMatch[1]) : 0;

        colorToRegion.set(color, description);
        regionNameToVarLevel.set(description, levelvar);
        regionNameToRecommendedLevel.set(description, recommendedLevel);
        regionNameToMinLevel.set(description, minLevel);
      }

      // Load region bounds image
      const Jimp = require('jimp');
      const image = await Jimp.read(regionsPngPath);
      const positionToRegion = new Map();
      const DrawnCenter = {x: 32598, y: 32233};
      const VisionSize = 2048;

      for (let imgX = 0; imgX < 2048; imgX++) {
        for (let imgY = 0; imgY < 2048; imgY++) {
          const color = Jimp.intToRGBA(image.getPixelColor(imgX, imgY));
          if (color.a === 0) continue;

          const hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1).toUpperCase()}`;
          const regionName = colorToRegion.get(hexColor);

          if (regionName) {
            const tileX = Math.round(imgX + DrawnCenter.x - (VisionSize / 2));
            const tileY = Math.round(imgY + DrawnCenter.y - (VisionSize / 2));
            const key = `${tileX},${tileY}`;
            positionToRegion.set(key, regionName);
          }
        }
      }

      // Load areas mapping (areaid -> area info)
      const areasXmlContent = fs.readFileSync(areasPath, 'utf-8');
      const areaIdToInfo = new Map();

      const areasResult = await parseStringPromise(areasXmlContent);
      const areas = areasResult.dreamareas?.area || [];
      for (const area of areas) {
        const areaId = parseInt(area.$.id);
        areaIdToInfo.set(areaId, {
          name: area.$.name,
          varLevel: parseInt(area.$.varLevel || '0')
        });
      }

      // Load OTBM to get tile -> areaid mapping (with 3D coordinates)
      const mapData = otbm2json.read(otbmPath);
      const features = mapData.data.nodes?.[0]?.features || [];
      const positionToAreaId = new Map(); // Key: "x,y,z" -> Value: areaId

      for (const feature of features) {
        if (!feature.tiles || feature.type !== 4) continue;
        for (const tile of feature.tiles) {
          const absoluteX = feature.x + tile.x;
          const absoluteY = feature.y + tile.y;
          const absoluteZ = feature.z + (tile.z || 0);
          const posKey = `${absoluteX},${absoluteY},${absoluteZ}`;

          if (tile.dreamAreaId) {
            positionToAreaId.set(posKey, tile.dreamAreaId);
          }
        }
      }

      // Load spawn data
      const spawnXmlContent = fs.readFileSync(spawnPath, 'utf-8');
      const spawnData = await parseStringPromise(spawnXmlContent);

      // Load all monster files and create name -> data mapping
      const monsterDataByName = new Map();
      const monsterFiles = fs.readdirSync(monstersPath).filter(f => f.endsWith('.xml'));
      const duplicateNames = new Map(); // Track duplicate monster names
      const ignoredMonsters = []; // Track monsters with ignoreOnWiki="1"

      console.log(`[Monsters by Region] Loading ${monsterFiles.length} monster files...`);

      for (const file of monsterFiles) {
        try {
          const filePath = path.join(monstersPath, file);
          const xmlContent = fs.readFileSync(filePath, 'utf-8');

          // Extract monster name from XML
          const nameMatch = xmlContent.match(/<monster[^>]+name=["']([^"']+)["']/);
          if (!nameMatch) continue;

          const monsterName = nameMatch[1];

          // Check if monster should be ignored (ignoreOnWiki="1")
          const ignoreOnWiki = xmlContent.match(/ignoreOnWiki=["']1["']/);
          if (ignoreOnWiki) {
            ignoredMonsters.push({ fileName: file, name: monsterName });
            console.log(`[Monsters by Region] 🚫 Ignoring monster with ignoreOnWiki="1": ${monsterName} (${file})`);
            continue; // Skip this monster entirely
          }

          // Detect duplicate names
          if (monsterDataByName.has(monsterName)) {
            if (!duplicateNames.has(monsterName)) {
              duplicateNames.set(monsterName, []);
            }
            duplicateNames.get(monsterName).push(file);
          }

          // Extract power, defaultLevel, and varLevel
          const powerMatch = xmlContent.match(/<balance[^>]+power=["']([^"']+)["']/);
          const defaultLevelMatch = xmlContent.match(/<balance[^>]+defaultLevel=["']([^"']+)["']/);
          const varLevelMatch = xmlContent.match(/<monster[^>]+varLevel=["']([^"']+)["']/);

          // Check for primary craft items - capture both name and unlock_level
          const primaryCraftMatch = xmlContent.match(/<item name=["']([^"']+)["'][^>]*bko_origin=["']craft primary["'][^>]*unlock_level=["'](\d+)["']/);

          // Extract all loot items with unlock_level
          const lootItems = [];
          const lootRegex = /<item\s+name=["']([^"']+)["'][^>]*unlock_level=["'](\d+)["']/g;
          let lootMatch;
          while ((lootMatch = lootRegex.exec(xmlContent)) !== null) {
            lootItems.push({
              name: lootMatch[1],
              unlockLevel: parseInt(lootMatch[2])
            });
          }

          monsterDataByName.set(monsterName, {
            fileName: file, // Store the file name for debugging
            power: powerMatch ? parseFloat(powerMatch[1]) : 0,
            defaultLevel: defaultLevelMatch ? parseInt(defaultLevelMatch[1]) : 0,
            monsterVarLevel: varLevelMatch ? parseInt(varLevelMatch[1]) : 0,
            hasPrimaryCraft: !!primaryCraftMatch,
            primaryCraftItemName: primaryCraftMatch ? primaryCraftMatch[1] : null,
            primaryCraftUnlockLevel: primaryCraftMatch ? parseInt(primaryCraftMatch[2]) : null,
            lootItems // All loot items with unlock_level
          });
        } catch (err) {
          console.error(`Error reading monster file ${file}:`, err.message);
        }
      }

      console.log(`[Monsters by Region] Loaded ${monsterDataByName.size} monsters`);

      // Health Check Summary
      console.log(`\n[Monsters by Region] 📊 HEALTH CHECK SUMMARY:`);
      console.log(`  ✅ Total files scanned: ${monsterFiles.length}`);
      console.log(`  ✅ Monsters loaded: ${monsterDataByName.size}`);
      console.log(`  🚫 Monsters ignored (ignoreOnWiki="1"): ${ignoredMonsters.length}`);

      if (ignoredMonsters.length > 0) {
        console.log(`\n[Monsters by Region] 🚫 IGNORED MONSTERS (ignoreOnWiki="1"):`);
        ignoredMonsters.forEach(({ fileName, name }) => {
          console.log(`  - "${name}" in ${fileName}`);
        });
      }

      // Log duplicate monster names (CRITICAL WARNING)
      if (duplicateNames.size > 0) {
        console.warn(`\n[Monsters by Region] ⚠️  CRITICAL: Found ${duplicateNames.size} duplicate monster names!`);
        for (const [name, files] of duplicateNames) {
          console.warn(`  - Monster name "${name}" found in files: ${files.join(', ')}`);
          console.warn(`    → Only the LAST file will be used! Previous files are IGNORED!`);
        }
      }

      // Process spawns
      const regionData = new Map(); // regionName -> Map(areaId -> Map(monsterName -> {count, power, defaultLevel, monsterVarLevel, areaVarLevel}))
      const spawns = spawnData.spawns?.spawn || [];

      console.log(`[Monsters by Region] Found ${spawns.length} spawns`);

      let totalMonsters = 0;
      let monstersWithoutRegion = 0;
      let monstersWithoutAreaId = 0;
      let monstersWithoutAreaInfo = 0;
      let monstersProcessed = 0;

      for (const spawn of spawns) {
        const centerX = parseInt(spawn.$.centerx);
        const centerY = parseInt(spawn.$.centery);
        const centerZ = parseInt(spawn.$.centerz);

        const monsters = spawn.monster || [];
        totalMonsters += monsters.length;

        for (const monster of monsters) {
          const monsterName = monster.$.name;
          const relX = parseInt(monster.$.x);
          const relY = parseInt(monster.$.y);
          const relZ = parseInt(monster.$.z);

          // Calculate absolute position
          // Note: X and Y are relative to center, but Z is already absolute
          const absoluteX = centerX + relX;
          const absoluteY = centerY + relY;
          const absoluteZ = relZ;
          const posKey2D = `${absoluteX},${absoluteY}`;
          const posKey3D = `${absoluteX},${absoluteY},${absoluteZ}`;

          // Get region name (uses 2D position from PNG)
          const regionName = positionToRegion.get(posKey2D);

          if (!regionName) {
            monstersWithoutRegion++;
            continue;
          }

          // Get area ID from OTBM using 3D position
          let areaId = positionToAreaId.get(posKey3D);
          let areaInfo = null;

          if (!areaId) {
            monstersWithoutAreaId++;
            // Use generic area ID for monsters without specific area
            areaId = `${regionName}_no_area`;
            areaInfo = {
              name: 'Sem área definida',
              varLevel: 0
            };
          } else {
            // Get area info from areas XML
            areaInfo = areaIdToInfo.get(areaId);
            if (!areaInfo) {
              monstersWithoutAreaInfo++;
              // Use generic area info if not found
              areaInfo = {
                name: `Área ${areaId}`,
                varLevel: 0
              };
            }
          }

          monstersProcessed++;

          // Get monster data from preloaded map
          const monsterData = monsterDataByName.get(monsterName);
          const power = monsterData?.power || 0;
          const defaultLevel = monsterData?.defaultLevel || 0;
          const monsterVarLevel = monsterData?.monsterVarLevel || 0;

          // Initialize nested structure if needed
          if (!regionData.has(regionName)) {
            regionData.set(regionName, new Map());
          }
          const areasMap = regionData.get(regionName);

          if (!areasMap.has(areaId)) {
            areasMap.set(areaId, new Map());
          }
          const monstersMap = areasMap.get(areaId);

          if (!monstersMap.has(monsterName)) {
            monstersMap.set(monsterName, {
              name: monsterName,
              power,
              defaultLevel,
              monsterVarLevel,
              areaVarLevel: areaInfo.varLevel,
              hasPrimaryCraft: monsterData?.hasPrimaryCraft || false,
              primaryCraftItemName: monsterData?.primaryCraftItemName || null,
              primaryCraftUnlockLevel: monsterData?.primaryCraftUnlockLevel || null,
              lootItems: monsterData?.lootItems || [], // Include all loot items
              count: 0
            });
          }

          monstersMap.get(monsterName).count++;
        }
      }

      // Convert to response format
      const regionsResponse = [];
      for (const [regionName, areasMap] of regionData) {
        const areas = [];
        const shrines = [];
        const uniqueMonsters = new Set();
        let totalSpawns = 0;

        for (const [areaId, monstersMap] of areasMap) {
          const monsters = Array.from(monstersMap.values());

          // Get area info from the first monster (they all have the same areaVarLevel)
          const firstMonster = monsters[0];
          let areaInfo = areaIdToInfo.get(areaId);

          // If not found in XML, use generic info (for monsters without areaid)
          const areaName = areaInfo?.name || (areaId.includes('_no_area') ? 'Sem área definida' : `Área ${areaId}`);
          const areaVarLevel = areaInfo?.varLevel ?? firstMonster?.areaVarLevel ?? 0;

          // Calculate available primary crafts for this area
          const regionVarLevel = regionNameToVarLevel.get(regionName) || 0;
          const totalVarLevel = regionVarLevel + areaVarLevel;

          const availablePrimaryCraftsInArea = monsters.filter(m => {
            const globalMonsterData = monsterDataByName.get(m.name);
            if (!globalMonsterData?.hasPrimaryCraft) return false;

            const effectiveLevel = Math.round(m.defaultLevel * (1 + totalVarLevel / 100));
            return globalMonsterData.primaryCraftUnlockLevel <= effectiveLevel;
          }).length;

          monsters.forEach(m => {
            uniqueMonsters.add(m.name);
            totalSpawns += m.count;
          });

          const areaData = {
            areaId,
            areaName,
            areaVarLevel,
            availablePrimaryCrafts: availablePrimaryCraftsInArea,
            monsters
          };

          // Separate shrines from regular areas
          if (areaName.toUpperCase().includes('SHRINE_')) {
            shrines.push(areaData);
          } else {
            areas.push(areaData);
          }
        }

        // Calculate unique species with min/max levels and primary craft status
        const regionVarLevel = regionNameToVarLevel.get(regionName) || 0;
        const speciesMap = new Map(); // monsterName -> {minLevel, maxLevel, defaultLevel, power, hasPrimaryCraft, primaryCraftUnlockLevel}

        for (const [areaId, monstersMap] of areasMap) {
          const areaInfo = areaIdToInfo.get(areaId);
          const areaVarLevel = areaInfo?.varLevel ?? 0;
          const totalVarLevel = regionVarLevel + areaVarLevel;

          for (const [monsterName, monsterData] of monstersMap) {
            const defaultLevel = monsterData.defaultLevel;
            const effectiveLevel = Math.round(defaultLevel * (1 + totalVarLevel / 100));
            const globalMonsterData = monsterDataByName.get(monsterName);

            if (!speciesMap.has(monsterName)) {
              speciesMap.set(monsterName, {
                name: monsterName,
                defaultLevel,
                power: monsterData.power,
                minLevel: effectiveLevel,
                maxLevel: effectiveLevel,
                hasPrimaryCraft: globalMonsterData?.hasPrimaryCraft || false,
                primaryCraftItemName: globalMonsterData?.primaryCraftItemName || null,
                primaryCraftUnlockLevel: globalMonsterData?.primaryCraftUnlockLevel || null,
                lootItems: globalMonsterData?.lootItems || [] // Include all loot items
              });
            } else {
              const species = speciesMap.get(monsterName);
              species.minLevel = Math.min(species.minLevel, effectiveLevel);
              species.maxLevel = Math.max(species.maxLevel, effectiveLevel);
            }
          }
        }

        const uniqueSpecies = Array.from(speciesMap.values());

        // Count available primary crafts (unlock_level <= maxLevel)
        const availablePrimaryCrafts = uniqueSpecies.filter(
          s => s.hasPrimaryCraft && s.primaryCraftUnlockLevel <= s.maxLevel
        ).length;

        regionsResponse.push({
          name: regionName,
          regionVarLevel: regionNameToVarLevel.get(regionName) || 0,
          recommendedLevel: regionNameToRecommendedLevel.get(regionName) || '',
          minLevel: regionNameToMinLevel.get(regionName) || 0,
          totalAreas: areas.length,
          totalShrines: shrines.length,
          totalSpawns,
          totalUniqueMonsters: uniqueMonsters.size,
          availablePrimaryCrafts,
          uniqueSpecies,
          areas,
          shrines
        });
      }

      // Sort regions by minLevel (ascending)
      regionsResponse.sort((a, b) => a.minLevel - b.minLevel);

      console.log(`[Monsters by Region] Statistics:`);
      console.log(`  Total monsters in spawns: ${totalMonsters}`);
      console.log(`  Monsters without region: ${monstersWithoutRegion}`);
      console.log(`  Monsters without areaid: ${monstersWithoutAreaId}`);
      console.log(`  Monsters without area info: ${monstersWithoutAreaInfo}`);
      console.log(`  Monsters processed: ${monstersProcessed}`);
      console.log(`  Regions found: ${regionsResponse.length}`);

      sendJson(res, 200, { success: true, regions: regionsResponse });

    } catch (error) {
      console.error('Error analyzing monsters by region:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to check dreamAreaId for a specific position in OTBM
  server.middlewares.use('/api/map/check-position-area', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const x = parseInt(url.searchParams.get('x'));
      const y = parseInt(url.searchParams.get('y'));
      const z = parseInt(url.searchParams.get('z'));

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return sendError(res, 400, 'Missing or invalid x, y, z parameters');
      }

      const otbm2json = require(path.join(process.cwd(), 'src/lib/juice/otbm2json/otbm2json.cjs'));

      // Get paths from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const otbmPath = path.join(worldPath, 'forgotten.otbm');

      // Load OTBM
      const mapData = otbm2json.read(otbmPath);
      const features = mapData.data.nodes?.[0]?.features || [];

      // Search for the tile at this position (including Z coordinate)
      const posKey = `${x},${y},${z}`;
      let foundAreaId = null;
      let foundFeature = null;
      let foundTile = null;
      const allTilesAtXY = [];

      for (const feature of features) {
        if (!feature.tiles || feature.type !== 4) continue;
        for (const tile of feature.tiles) {
          const absoluteX = feature.x + tile.x;
          const absoluteY = feature.y + tile.y;
          // tile.z is often 0 or undefined in OTBM, so absoluteZ is just feature.z
          const absoluteZ = feature.z + (tile.z || 0);

          if (absoluteX === x && absoluteY === y) {
            // Store all tiles at this X,Y for debugging
            allTilesAtXY.push({
              z: absoluteZ,
              dreamAreaId: tile.dreamAreaId || null,
              feature: { x: feature.x, y: feature.y, z: feature.z },
              tile: { x: tile.x, y: tile.y, z: tile.z }
            });

            // Only match if Z coordinate also matches
            if (absoluteZ === z) {
              foundAreaId = tile.dreamAreaId || null;
              foundFeature = {
                x: feature.x,
                y: feature.y,
                z: feature.z,
                type: feature.type
              };
              foundTile = {
                relativeX: tile.x,
                relativeY: tile.y,
                relativeZ: tile.z || 0,
                absoluteZ: absoluteZ,
                dreamAreaId: tile.dreamAreaId || null
              };
              break;
            }
          }
        }
        if (foundTile) break;
      }

      sendJson(res, 200, {
        success: true,
        position: { x, y, z },
        dreamAreaId: foundAreaId,
        feature: foundFeature,
        tile: foundTile,
        allTilesAtXY: allTilesAtXY, // Include all tiles at this X,Y for debugging
        message: foundAreaId ? `Found dreamAreaId ${foundAreaId}` : 'No dreamAreaId found for this position'
      });

    } catch (error) {
      console.error('Error checking position area:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to check region for a specific position
  server.middlewares.use('/api/map/check-position-region', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const x = parseInt(url.searchParams.get('x'));
      const y = parseInt(url.searchParams.get('y'));
      const z = parseInt(url.searchParams.get('z'));

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        return sendError(res, 400, 'Missing or invalid x, y, z parameters');
      }

      // Get paths from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const regionsXmlPath = path.join(worldPath, 'regions.xml');
      const regionsPngPath = path.join(worldPath, 'regions-bounds.png');

      // Load regions mapping
      const regionsXmlContent = fs.readFileSync(regionsXmlPath, 'utf-8');
      const colorToRegion = new Map();

      const regionsResult = await parseStringPromise(regionsXmlContent);
      const regions = regionsResult.regions.region || [];
      for (const region of regions) {
        const color = region.$.color.toUpperCase();
        const description = region.$.description;
        colorToRegion.set(color, description);
      }

      // Load region bounds image
      const Jimp = require('jimp');
      const image = await Jimp.read(regionsPngPath);
      const DrawnCenter = {x: 32598, y: 32233};
      const VisionSize = 2048;

      // Check position in PNG (2D only, Z is ignored)
      const imgX = x - DrawnCenter.x + (VisionSize / 2);
      const imgY = y - DrawnCenter.y + (VisionSize / 2);

      let regionName = null;
      let pixelColor = null;
      let hexColor = null;

      if (imgX >= 0 && imgX < 2048 && imgY >= 0 && imgY < 2048) {
        const colorInt = image.getPixelColor(Math.floor(imgX), Math.floor(imgY));
        const color = Jimp.intToRGBA(colorInt);
        pixelColor = color;

        if (color.a > 0) {
          hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1).toUpperCase()}`;
          regionName = colorToRegion.get(hexColor);
        }
      }

      sendJson(res, 200, {
        success: true,
        position: { x, y, z },
        imagePosition: { x: imgX, y: imgY },
        pixelColor,
        hexColor,
        regionName,
        foundInPng: !!regionName,
        note: 'Region detection uses 2D coordinates (X, Y) from PNG. Z coordinate is NOT used for region detection.'
      });

    } catch (error) {
      console.error('Error checking position region:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });

  // API endpoint to get spawn positions for a specific monster in a specific area
  server.middlewares.use('/api/map/monster-spawn-positions', async (req, res, next) => {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'Method not allowed');
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const monsterName = url.searchParams.get('monsterName');
      const areaId = url.searchParams.get('areaId');

      if (!monsterName) {
        return sendError(res, 400, 'Missing monsterName parameter');
      }
      if (!areaId) {
        return sendError(res, 400, 'Missing areaId parameter');
      }

      const otbm2json = require(path.join(process.cwd(), 'src/lib/juice/otbm2json/otbm2json.cjs'));

      // Get paths from settings
      const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.js');
      const settings = require(settingsPath).default;
      const worldPath = settings.database?.worldPath;

      if (!worldPath) {
        throw new Error('worldPath not found in settings.js');
      }

      const spawnPath = path.join(worldPath, 'world-spawn.xml');
      const otbmPath = path.join(worldPath, 'forgotten.otbm');
      const regionsXmlPath = path.join(worldPath, 'regions.xml');
      const regionsPngPath = path.join(worldPath, 'regions-bounds.png');

      // Load regions mapping (needed for _no_area matching)
      let positionToRegion = new Map();
      if (areaId.includes('_no_area')) {
        const regionsXmlContent = fs.readFileSync(regionsXmlPath, 'utf-8');
        const colorToRegion = new Map();

        const regionsResult = await parseStringPromise(regionsXmlContent);
        const regions = regionsResult.regions.region || [];
        for (const region of regions) {
          const color = region.$.color.toUpperCase();
          const description = region.$.description;
          colorToRegion.set(color, description);
        }

        // Load region bounds image
        const Jimp = require('jimp');
        const image = await Jimp.read(regionsPngPath);
        const DrawnCenter = {x: 32598, y: 32233};
        const VisionSize = 2048;

        for (let imgX = 0; imgX < 2048; imgX++) {
          for (let imgY = 0; imgY < 2048; imgY++) {
            const color = Jimp.intToRGBA(image.getPixelColor(imgX, imgY));
            if (color.a === 0) continue;

            const hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1).toUpperCase()}`;
            const regionName = colorToRegion.get(hexColor);

            if (regionName) {
              const tileX = Math.round(imgX + DrawnCenter.x - (VisionSize / 2));
              const tileY = Math.round(imgY + DrawnCenter.y - (VisionSize / 2));
              const key = `${tileX},${tileY}`;
              positionToRegion.set(key, regionName);
            }
          }
        }
      }

      // Load OTBM to get tile -> areaid mapping (with 3D coordinates)
      const mapData = otbm2json.read(otbmPath);
      const features = mapData.data.nodes?.[0]?.features || [];
      const positionToAreaId = new Map(); // Key: "x,y,z" -> Value: areaId

      for (const feature of features) {
        if (!feature.tiles || feature.type !== 4) continue;
        for (const tile of feature.tiles) {
          const absoluteX = feature.x + tile.x;
          const absoluteY = feature.y + tile.y;
          const absoluteZ = feature.z + (tile.z || 0);
          const posKey = `${absoluteX},${absoluteY},${absoluteZ}`;

          if (tile.dreamAreaId) {
            positionToAreaId.set(posKey, tile.dreamAreaId);
          }
        }
      }

      // Load spawn data
      const spawnXmlContent = fs.readFileSync(spawnPath, 'utf-8');
      const spawnData = await parseStringPromise(spawnXmlContent, {
        attrkey: '$',
        charkey: '_',
        explicitArray: true,
        tagNameProcessors: [],
        attrNameProcessors: [],
        valueProcessors: [],
        attrValueProcessors: []
      });

      // Split XML content into lines to get line numbers
      const xmlLines = spawnXmlContent.split('\n');

      const spawns = spawnData.spawns?.spawn || [];
      const positions = [];

      for (const spawn of spawns) {
        const centerX = parseInt(spawn.$.centerx);
        const centerY = parseInt(spawn.$.centery);
        const centerZ = parseInt(spawn.$.centerz);

        const monsters = spawn.monster || [];

        for (const monster of monsters) {
          if (monster.$.name !== monsterName) continue;

          const relX = parseInt(monster.$.x);
          const relY = parseInt(monster.$.y);
          const relZ = parseInt(monster.$.z);

          // Calculate absolute position
          // Note: X and Y are relative to center, but Z is already absolute
          const absoluteX = centerX + relX;
          const absoluteY = centerY + relY;
          const absoluteZ = relZ;
          const posKey3D = `${absoluteX},${absoluteY},${absoluteZ}`;
          const posKey2D = `${absoluteX},${absoluteY}`;

          // Get area ID from OTBM using 3D position
          const tileAreaId = positionToAreaId.get(posKey3D);

          // Check if this spawn is in the requested area
          let matchesArea = false;

          if (areaId.includes('_no_area')) {
            // For _no_area areas, check:
            // 1. Spawn has no dreamAreaId
            // 2. Spawn is in the correct region
            if (!tileAreaId) {
              const spawnRegionName = positionToRegion.get(posKey2D);
              const requestedRegionName = areaId.replace('_no_area', '');
              matchesArea = (spawnRegionName === requestedRegionName);
            }
          } else {
            // For numeric areaId, just match the dreamAreaId
            matchesArea = (tileAreaId && tileAreaId.toString() === areaId.toString());
          }

          if (matchesArea) {
            // Find line number for this monster spawn
            let lineNumber = 0;
            const monsterSearchStr = `<monster name="${monsterName}" x="${relX}" y="${relY}" z="${relZ}"`;

            for (let i = 0; i < xmlLines.length; i++) {
              if (xmlLines[i].includes(monsterSearchStr)) {
                lineNumber = i + 1; // Line numbers start at 1
                break;
              }
            }

            positions.push({
              x: absoluteX,
              y: absoluteY,
              z: absoluteZ,
              lineNumber,
              tileAreaId: tileAreaId || null // Include actual dreamAreaId from OTBM for debugging
            });
          }
        }
      }

      sendJson(res, 200, {
        success: true,
        monsterName,
        areaId,
        count: positions.length,
        positions
      });

    } catch (error) {
      console.error('Error getting monster spawn positions:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: error.message,
        stack: error.stack
      }));
    }
  });
}
