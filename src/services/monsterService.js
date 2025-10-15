// Service to load and parse monster XML files
import { calculateBaseStatsRole } from '@/utils/baseStatsRoleCalculator';

// Helper function to convert speed type to numeric value
const getSpeedValue = (speedType) => {
  const speedMap = {
    'Slow': 1,
    'NoBoot': 2,
    'Boot1': 3,
    'Boot2': 4,
    'BOH': 5,
    'VeryFast': 6,
    'None': 0
  };
  return speedMap[speedType] || 0;
};

export async function loadMonsterFromXML(monsterName) {
  try {
    const response = await fetch(`/api/monsters/xml/${monsterName.toLowerCase()}.xml`);
    if (!response.ok) {
      throw new Error(`Failed to load monster XML: ${monsterName}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');

    // Check for malformed tags (like <balance ... defaultLevel="150" / mapRole="None">)
    const hasMalformedTags = /\s\/\s+[a-zA-Z]/.test(xmlText);

    const monsterElement = xmlDoc.querySelector('monster');
    if (!monsterElement) {
      throw new Error('Invalid monster XML format');
    }

    // Parse basic attributes
    const monsterData = {
      monsterName: monsterElement.getAttribute('name') || '',
      // Add flag for malformed XML
      _xmlMalformed: parserError !== null || hasMalformedTags,
      nameDescription: monsterElement.getAttribute('nameDescription') || '',
      race: monsterElement.getAttribute('race') || '',
      experience: parseInt(monsterElement.getAttribute('experience')) || 0,
      vocationpoints: parseInt(monsterElement.getAttribute('vocationpoints')) || 0,
      ignoreAreaLevel: monsterElement.getAttribute('ignoreAreaLevel') === '1',
      ignoreDarkAndHorde: monsterElement.getAttribute('ignoreDarkAndHorde') === '1',
      xmlFileName: monsterName, // Store the XML filename without extension
      // Map vocationpoints to classXpPerLevel for the UI
      classXpPerLevel: parseInt(monsterElement.getAttribute('vocationpoints')) || 0,
      // Parse egg attributes
      'egg-id': parseInt(monsterElement.getAttribute('egg-id')) || 0,
      'egg-chance': parseInt(monsterElement.getAttribute('egg-chance')) || 0,
    };

    // Parse balance attributes
    const balanceElement = xmlDoc.querySelector('balance');
    if (balanceElement) {
      monsterData.power = parseFloat(balanceElement.getAttribute('power')) || 0;
      monsterData.hp = parseInt(balanceElement.getAttribute('hp')) || 0;
      monsterData.atk = parseInt(balanceElement.getAttribute('atk')) || 0;
      monsterData.def = parseInt(balanceElement.getAttribute('def')) || 0;
      monsterData.satk = parseInt(balanceElement.getAttribute('satk')) || 0;
      monsterData.sdef = parseInt(balanceElement.getAttribute('sdef')) || 0;
      monsterData.speed = parseInt(balanceElement.getAttribute('speed')) || 0;
      monsterData.extraLoot = parseInt(balanceElement.getAttribute('extraLoot')) || 0;
      monsterData.extraXp = parseInt(balanceElement.getAttribute('extraXp')) || 0;
      monsterData.defaultLevel = parseInt(balanceElement.getAttribute('defaultLevel')) || 0;
      monsterData.mapRole = balanceElement.getAttribute('mapRole') || 'None';
      monsterData.speedType = balanceElement.getAttribute('speedType') || '';

      // Calculate resourceBalance based on extraLoot and extraXp
      const extraLoot = parseInt(balanceElement.getAttribute('extraLoot')) || 0;
      const extraXp = parseInt(balanceElement.getAttribute('extraXp')) || 0;

      if (extraXp > 0) {
        monsterData.resourceBalance = `Exp${extraXp}`;
      } else if (extraLoot > 0) {
        monsterData.resourceBalance = `Loot${extraLoot}`;
      } else {
        monsterData.resourceBalance = 'Equals';
      }

      // Calculate base stats role
      monsterData.baseStatsRole = calculateBaseStatsRole(
        monsterData.hp || 0,
        monsterData.atk || 0,
        monsterData.satk || 0,
        monsterData.def || 0,
        monsterData.sdef || 0,
        getSpeedValue(monsterData.speedType || 'None')
      );
    }

    // Parse attributesBase
    const attributesBaseElement = xmlDoc.querySelector('attributesBase');
    if (attributesBaseElement) {
      monsterData.baseHealth = parseFloat(attributesBaseElement.getAttribute('health')) || 0;
      monsterData.baseSpeed = parseFloat(attributesBaseElement.getAttribute('speed')) || 0;
      monsterData.baseAtk = parseFloat(attributesBaseElement.getAttribute('atk')) || 0;
      monsterData.baseAtks = parseFloat(attributesBaseElement.getAttribute('atks')) || 0;
      monsterData.baseMagicPen = parseFloat(attributesBaseElement.getAttribute('magicPen')) || 0;
      monsterData.basePhysicalPen = parseFloat(attributesBaseElement.getAttribute('physicalPen')) || 0;
      monsterData.baseArmor = parseFloat(attributesBaseElement.getAttribute('armor')) || 0;
      monsterData.baseMagicResist = parseFloat(attributesBaseElement.getAttribute('magicResist')) || 0;
    }

    // Parse attributesPerLevel
    const attributesPerLevelElement = xmlDoc.querySelector('attributesPerLevel');
    if (attributesPerLevelElement) {
      // Legacy support: read baseHealth and baseSpeed from attributesPerLevel if attributesBase doesn't exist
      if (!attributesBaseElement) {
        monsterData.baseHealth = parseInt(attributesPerLevelElement.getAttribute('baseHealth')) || 0;
        monsterData.baseSpeed = parseInt(attributesPerLevelElement.getAttribute('baseSpeed')) || 0;
      }

      monsterData.healthPerLevel = parseFloat(attributesPerLevelElement.getAttribute('healthPerLevel')) || 0;
      monsterData.speedPerLevel = parseFloat(attributesPerLevelElement.getAttribute('speedPerLevel')) || 0;
      monsterData.maxAtkPerLevel = parseFloat(attributesPerLevelElement.getAttribute('maxAtkPerLevel')) || 0;
      monsterData.maxAtkSPerLevel = parseFloat(attributesPerLevelElement.getAttribute('maxAtkSPerLevel')) || 0;
      monsterData.magicPenPerLevel = parseFloat(attributesPerLevelElement.getAttribute('magicPenPerLevel')) || 0;
      monsterData.physicalPenPerLevel = parseFloat(attributesPerLevelElement.getAttribute('physicalPenPerLevel')) || 0;
      monsterData.armorPerLevel = parseFloat(attributesPerLevelElement.getAttribute('armorPerLevel')) || 0;
      monsterData.magicResistPerLevel = parseFloat(attributesPerLevelElement.getAttribute('magicResistPerLevel')) || 0;
    }

    // Parse look attributes
    const lookElement = xmlDoc.querySelector('look');
    if (lookElement) {
      monsterData.lookType = parseInt(lookElement.getAttribute('type')) || 0;
      monsterData.lookTypeEx = parseInt(lookElement.getAttribute('typeex')) || 0;
      monsterData.corpse = parseInt(lookElement.getAttribute('corpse')) || 0;
    }

    // Parse targetchange element (separate from flags)
    const targetChangeElement = xmlDoc.querySelector('targetchange');
    if (targetChangeElement) {
      monsterData.targetChangeInterval = parseInt(targetChangeElement.getAttribute('interval')) || 0;
      monsterData.targetChangeChance = parseInt(targetChangeElement.getAttribute('chance')) || 0;
    }

    // Parse flags
    const flags = xmlDoc.querySelectorAll('flags flag');
    flags.forEach(flag => {
      // Flags are structured as <flag attackable="1" /> not <flag name="attackable" value="1" />
      // So we need to check all attributes of the flag element
      const attributes = flag.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        const name = attr.name;
        const value = attr.value;

        // Flags de Comportamento
        if (name === 'attackable') monsterData.attackable = value === '1';
        if (name === 'hostile') monsterData.hostile = value === '1';
        if (name === 'hostileWhenAttacked') monsterData.hostileWhenAttacked = value === '1';
        if (name === 'pushable') monsterData.pushable = value === '1';
        if (name === 'canpushitems') monsterData.canpushitems = value === '1';
        if (name === 'canpushcreatures') monsterData.canpushcreatures = value === '1';
        if (name === 'challengeable') monsterData.challengeable = value === '1';
        if (name === 'notMove') monsterData.notMove = value === '1';

        // Flags Especiais
        if (name === 'isboss') monsterData.isboss = value === '1';
        if (name === 'hidehealth') monsterData.hidehealth = value === '1';
        if (name === 'ignorespawnblock') monsterData.ignorespawnblock = value === '1';

        // Movimento em Fields
        if (name === 'canwalkonenergy') monsterData.canwalkonenergy = value === '1';
        if (name === 'canwalkonfire') monsterData.canwalkonfire = value === '1';
        if (name === 'canwalkonpoison') monsterData.canwalkonpoison = value === '1';

        // Comportamento em Combate
        if (name === 'targetdistance') monsterData.targetdistance = parseInt(value) || 1;
        if (name === 'staticattack') monsterData.staticattack = parseInt(value) || 0;
        if (name === 'runonhealth') monsterData.runonhealth = parseInt(value) || 0;
      }
    });

    // Parse elements
    const elements = {};
    const elementNodes = xmlDoc.querySelectorAll('elements element');
    elementNodes.forEach(element => {
      if (element.hasAttribute('physicalPercent'))
        elements.physicalPercent = parseInt(element.getAttribute('physicalPercent')) || 0;
      if (element.hasAttribute('deathPercent'))
        elements.deathPercent = parseInt(element.getAttribute('deathPercent')) || 0;
      if (element.hasAttribute('energyPercent'))
        elements.energyPercent = parseInt(element.getAttribute('energyPercent')) || 0;
      if (element.hasAttribute('earthPercent'))
        elements.earthPercent = parseInt(element.getAttribute('earthPercent')) || 0;
      if (element.hasAttribute('icePercent'))
        elements.icePercent = parseInt(element.getAttribute('icePercent')) || 0;
      if (element.hasAttribute('holyPercent'))
        elements.holyPercent = parseInt(element.getAttribute('holyPercent')) || 0;
      if (element.hasAttribute('firePercent'))
        elements.firePercent = parseInt(element.getAttribute('firePercent')) || 0;
      if (element.hasAttribute('arcanePercent'))
        elements.arcanePercent = parseInt(element.getAttribute('arcanePercent')) || 0;
    });
    monsterData.elements = elements;

    // Parse immunities
    const immunities = xmlDoc.querySelectorAll('immunities immunity');
    const immunitiesList = [];
    immunities.forEach(immunity => {
      // Check all possible immunity attributes
      const attributes = immunity.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.value === '1') {
          // Capitalize first letter for consistency
          const immunityName = attr.name.charAt(0).toUpperCase() + attr.name.slice(1);
          immunitiesList.push(immunityName);
        }
      }
    });
    monsterData.immunities = immunitiesList;

    // Parse loot table
    const lootElement = xmlDoc.querySelector('loot');

    // Create _validation object to store validation-related flags
    if (!monsterData._validation) {
      monsterData._validation = {};
    }

    // Check if loot tag exists
    monsterData._validation.lootTagExists = lootElement !== null;

    if (lootElement) {
      // Parse loot attributes
      monsterData.noLoot = lootElement.getAttribute('noLoot') === '1';
      monsterData.goldCoinsPerKillPerLvl = parseFloat(lootElement.getAttribute('goldCoinsPerKillPerLvl')) || 0;
      monsterData.baseGoldCoinsPerKill = parseFloat(lootElement.getAttribute('baseGoldCoinsPerKill')) || 0;
    }

    const lootItems = xmlDoc.querySelectorAll('loot item');
    const lootList = [];
    const itemsWithMissingAttributes = [];

    lootItems.forEach(item => {
      const lootItem = {
        name: item.getAttribute('name') || '',
        chance: parseFloat(item.getAttribute('chance')) || 0,
        countMax: parseInt(item.getAttribute('countmax')) || 1,
        ratio: parseFloat(item.getAttribute('bko_ratio')) || 0,
        rarity: item.getAttribute('bko_rarity') || 'None',
        origin: item.getAttribute('bko_origin') || 'None',
        source: item.getAttribute('bko_source') || '',
        unlockLevel: item.getAttribute('unlock_level') ? parseInt(item.getAttribute('unlock_level')) : undefined
      };

      // Verificar se o item tem todos os atributos necessários
      // Apenas para monstros que não são noLoot e têm power > 0
      if (!monsterData.noLoot && monsterData.power > 0) {
        const missingAttrs = [];

        if (!item.hasAttribute('name')) missingAttrs.push('name');
        if (!item.hasAttribute('chance')) missingAttrs.push('chance');
        if (!item.hasAttribute('bko_origin')) missingAttrs.push('bko_origin');
        if (!item.hasAttribute('bko_source')) missingAttrs.push('bko_source');
        if (!item.hasAttribute('unlock_level')) missingAttrs.push('unlock_level');

        if (missingAttrs.length > 0) {
          itemsWithMissingAttributes.push({
            name: lootItem.name || 'Unknown',
            missingAttributes: missingAttrs
          });
        }
      }

      // Convert chance to percentage (value from XML is always divided by 1000)
      // Example: 85000 becomes 85.000%, 602 becomes 0.602%
      lootItem.chance = lootItem.chance / 1000;

      lootList.push(lootItem);
    });
    monsterData.loot = lootList;

    // Adicionar validações ao _validation
    // 1. Verificar se há items com atributos faltando
    monsterData._validation.lootItemsWithMissingAttributes = itemsWithMissingAttributes;

    // 2. Verificar se baseGoldCoinsPerKill e goldCoinsPerKillPerLvl existem quando noLoot != 1
    const hasBaseGold = lootElement && lootElement.hasAttribute('baseGoldCoinsPerKill');
    const hasGoldPerLevel = lootElement && lootElement.hasAttribute('goldCoinsPerKillPerLvl');

    monsterData._validation.missingGoldAttributes = [];
    if (!monsterData.noLoot && monsterData.power > 0) {
      if (!hasBaseGold) monsterData._validation.missingGoldAttributes.push('baseGoldCoinsPerKill');
      if (!hasGoldPerLevel) monsterData._validation.missingGoldAttributes.push('goldCoinsPerKillPerLvl');
    }

    // Parse summons
    const summonsElement = xmlDoc.querySelector('summons');
    if (summonsElement) {
      monsterData.maxSummons = parseInt(summonsElement.getAttribute('maxSummons')) || 0;

      const summonItems = summonsElement.querySelectorAll('summon');
      const summonsList = [];
      summonItems.forEach(summon => {
        summonsList.push({
          name: summon.getAttribute('name') || '',
          interval: parseInt(summon.getAttribute('interval')) || 2000,
          chance: parseInt(summon.getAttribute('chance')) || 0
        });
      });
      monsterData.summons = summonsList;
    } else {
      monsterData.maxSummons = 0;
      monsterData.summons = [];
    }

    return monsterData;
  } catch (error) {
    console.error('Error loading monster XML:', error);
    return null;
  }
}

// Get list of all monster XML files dynamically from server
async function getMonsterFilesList() {
  try {
    // Fetch fresh list from server API without cache
    const response = await fetch('/api/monsters/list', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch monster list');
    }

    const files = await response.json();
    console.log(`Found ${files.length} monster XML files from disk`);
    return files;
  } catch (error) {
    console.error('Error fetching monster list:', error);
    return [];
  }
}

// Load a monster XML directly from server
async function loadMonsterFromServer(monsterName) {
  try {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const response = await fetch(`/api/monsters/xml/${monsterName}.xml?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load monster XML: ${monsterName}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');

    // Check for malformed tags (like <balance ... defaultLevel="150" / mapRole="None">)
    const hasMalformedTags = /\s\/\s+[a-zA-Z]/.test(xmlText);

    const monsterElement = xmlDoc.querySelector('monster');
    if (!monsterElement) {
      throw new Error('Invalid monster XML format');
    }

    // Parse basic attributes
    const monsterData = {
      monsterName: monsterElement.getAttribute('name') || '',
      // Add flag for malformed XML
      _xmlMalformed: parserError !== null || hasMalformedTags,
      nameDescription: monsterElement.getAttribute('nameDescription') || '',
      race: monsterElement.getAttribute('race') || '',
      experience: parseInt(monsterElement.getAttribute('experience')) || 0,
      vocationpoints: parseInt(monsterElement.getAttribute('vocationpoints')) || 0,
      ignoreAreaLevel: monsterElement.getAttribute('ignoreAreaLevel') === '1',
      ignoreDarkAndHorde: monsterElement.getAttribute('ignoreDarkAndHorde') === '1',
      xmlFileName: monsterName, // Store the XML filename without extension
      // Map vocationpoints to classXpPerLevel for the UI
      classXpPerLevel: parseInt(monsterElement.getAttribute('vocationpoints')) || 0,
      // Parse egg attributes
      'egg-id': parseInt(monsterElement.getAttribute('egg-id')) || 0,
      'egg-chance': parseInt(monsterElement.getAttribute('egg-chance')) || 0,
    };

    // Parse balance attributes
    const balanceElement = xmlDoc.querySelector('balance');
    if (balanceElement) {
      monsterData.power = parseFloat(balanceElement.getAttribute('power')) || 0;
      monsterData.hp = parseInt(balanceElement.getAttribute('hp')) || 0;
      monsterData.atk = parseInt(balanceElement.getAttribute('atk')) || 0;
      monsterData.def = parseInt(balanceElement.getAttribute('def')) || 0;
      monsterData.satk = parseInt(balanceElement.getAttribute('satk')) || 0;
      monsterData.sdef = parseInt(balanceElement.getAttribute('sdef')) || 0;
      monsterData.speed = parseInt(balanceElement.getAttribute('speed')) || 0;
      monsterData.extraLoot = parseInt(balanceElement.getAttribute('extraLoot')) || 0;
      monsterData.extraXp = parseInt(balanceElement.getAttribute('extraXp')) || 0;
      monsterData.defaultLevel = parseInt(balanceElement.getAttribute('defaultLevel')) || 0;
      monsterData.mapRole = balanceElement.getAttribute('mapRole') || 'None';
      monsterData.speedType = balanceElement.getAttribute('speedType') || '';

      // Calculate resourceBalance based on extraLoot and extraXp
      const extraLoot = parseInt(balanceElement.getAttribute('extraLoot')) || 0;
      const extraXp = parseInt(balanceElement.getAttribute('extraXp')) || 0;

      if (extraXp > 0) {
        monsterData.resourceBalance = `Exp${extraXp}`;
      } else if (extraLoot > 0) {
        monsterData.resourceBalance = `Loot${extraLoot}`;
      } else {
        monsterData.resourceBalance = 'Equals';
      }

      // Calculate base stats role
      monsterData.baseStatsRole = calculateBaseStatsRole(
        monsterData.hp || 0,
        monsterData.atk || 0,
        monsterData.satk || 0,
        monsterData.def || 0,
        monsterData.sdef || 0,
        getSpeedValue(monsterData.speedType || 'None')
      );
    }

    // Parse attributesBase
    const attributesBaseElement = xmlDoc.querySelector('attributesBase');
    if (attributesBaseElement) {
      monsterData.baseHealth = parseFloat(attributesBaseElement.getAttribute('health')) || 0;
      monsterData.baseSpeed = parseFloat(attributesBaseElement.getAttribute('speed')) || 0;
      monsterData.baseAtk = parseFloat(attributesBaseElement.getAttribute('atk')) || 0;
      monsterData.baseAtks = parseFloat(attributesBaseElement.getAttribute('atks')) || 0;
      monsterData.baseMagicPen = parseFloat(attributesBaseElement.getAttribute('magicPen')) || 0;
      monsterData.basePhysicalPen = parseFloat(attributesBaseElement.getAttribute('physicalPen')) || 0;
      monsterData.baseArmor = parseFloat(attributesBaseElement.getAttribute('armor')) || 0;
      monsterData.baseMagicResist = parseFloat(attributesBaseElement.getAttribute('magicResist')) || 0;
    }

    // Parse attributesPerLevel
    const attributesPerLevelElement = xmlDoc.querySelector('attributesPerLevel');
    if (attributesPerLevelElement) {
      // Legacy support: read baseHealth and baseSpeed from attributesPerLevel if attributesBase doesn't exist
      if (!attributesBaseElement) {
        monsterData.baseHealth = parseInt(attributesPerLevelElement.getAttribute('baseHealth')) || 0;
        monsterData.baseSpeed = parseInt(attributesPerLevelElement.getAttribute('baseSpeed')) || 0;
      }

      monsterData.healthPerLevel = parseFloat(attributesPerLevelElement.getAttribute('healthPerLevel')) || 0;
      monsterData.speedPerLevel = parseFloat(attributesPerLevelElement.getAttribute('speedPerLevel')) || 0;
      monsterData.maxAtkPerLevel = parseFloat(attributesPerLevelElement.getAttribute('maxAtkPerLevel')) || 0;
      monsterData.maxAtkSPerLevel = parseFloat(attributesPerLevelElement.getAttribute('maxAtkSPerLevel')) || 0;
      monsterData.magicPenPerLevel = parseFloat(attributesPerLevelElement.getAttribute('magicPenPerLevel')) || 0;
      monsterData.physicalPenPerLevel = parseFloat(attributesPerLevelElement.getAttribute('physicalPenPerLevel')) || 0;
      monsterData.armorPerLevel = parseFloat(attributesPerLevelElement.getAttribute('armorPerLevel')) || 0;
      monsterData.magicResistPerLevel = parseFloat(attributesPerLevelElement.getAttribute('magicResistPerLevel')) || 0;
    }

    // Parse look attributes
    const lookElement = xmlDoc.querySelector('look');
    if (lookElement) {
      monsterData.lookType = parseInt(lookElement.getAttribute('type')) || 0;
      monsterData.lookTypeEx = parseInt(lookElement.getAttribute('typeex')) || 0;
      monsterData.corpse = parseInt(lookElement.getAttribute('corpse')) || 0;
    }

    // Parse targetchange element (separate from flags)
    const targetChangeElement = xmlDoc.querySelector('targetchange');
    if (targetChangeElement) {
      monsterData.targetChangeInterval = parseInt(targetChangeElement.getAttribute('interval')) || 0;
      monsterData.targetChangeChance = parseInt(targetChangeElement.getAttribute('chance')) || 0;
    }

    // Parse flags
    const flags = xmlDoc.querySelectorAll('flags flag');
    flags.forEach(flag => {
      // Flags are structured as <flag attackable="1" /> not <flag name="attackable" value="1" />
      // So we need to check all attributes of the flag element
      const attributes = flag.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        const name = attr.name;
        const value = attr.value;

        // Flags de Comportamento
        if (name === 'attackable') monsterData.attackable = value === '1';
        if (name === 'hostile') monsterData.hostile = value === '1';
        if (name === 'hostileWhenAttacked') monsterData.hostileWhenAttacked = value === '1';
        if (name === 'pushable') monsterData.pushable = value === '1';
        if (name === 'canpushitems') monsterData.canpushitems = value === '1';
        if (name === 'canpushcreatures') monsterData.canpushcreatures = value === '1';
        if (name === 'challengeable') monsterData.challengeable = value === '1';
        if (name === 'notMove') monsterData.notMove = value === '1';

        // Flags Especiais
        if (name === 'isboss') monsterData.isboss = value === '1';
        if (name === 'hidehealth') monsterData.hidehealth = value === '1';
        if (name === 'ignorespawnblock') monsterData.ignorespawnblock = value === '1';

        // Movimento em Fields
        if (name === 'canwalkonenergy') monsterData.canwalkonenergy = value === '1';
        if (name === 'canwalkonfire') monsterData.canwalkonfire = value === '1';
        if (name === 'canwalkonpoison') monsterData.canwalkonpoison = value === '1';

        // Comportamento em Combate
        if (name === 'targetdistance') monsterData.targetdistance = parseInt(value) || 1;
        if (name === 'staticattack') monsterData.staticattack = parseInt(value) || 0;
        if (name === 'runonhealth') monsterData.runonhealth = parseInt(value) || 0;
      }
    });

    // Parse elements
    const elements = {};
    const elementNodes = xmlDoc.querySelectorAll('elements element');
    elementNodes.forEach(element => {
      if (element.hasAttribute('physicalPercent'))
        elements.physicalPercent = parseInt(element.getAttribute('physicalPercent')) || 0;
      if (element.hasAttribute('deathPercent'))
        elements.deathPercent = parseInt(element.getAttribute('deathPercent')) || 0;
      if (element.hasAttribute('energyPercent'))
        elements.energyPercent = parseInt(element.getAttribute('energyPercent')) || 0;
      if (element.hasAttribute('earthPercent'))
        elements.earthPercent = parseInt(element.getAttribute('earthPercent')) || 0;
      if (element.hasAttribute('icePercent'))
        elements.icePercent = parseInt(element.getAttribute('icePercent')) || 0;
      if (element.hasAttribute('holyPercent'))
        elements.holyPercent = parseInt(element.getAttribute('holyPercent')) || 0;
      if (element.hasAttribute('firePercent'))
        elements.firePercent = parseInt(element.getAttribute('firePercent')) || 0;
      if (element.hasAttribute('arcanePercent'))
        elements.arcanePercent = parseInt(element.getAttribute('arcanePercent')) || 0;
    });
    monsterData.elements = elements;

    // Parse immunities
    const immunities = xmlDoc.querySelectorAll('immunities immunity');
    const immunitiesList = [];
    immunities.forEach(immunity => {
      // Check all possible immunity attributes
      const attributes = immunity.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.value === '1') {
          // Capitalize first letter for consistency
          const immunityName = attr.name.charAt(0).toUpperCase() + attr.name.slice(1);
          immunitiesList.push(immunityName);
        }
      }
    });
    monsterData.immunities = immunitiesList;

    // Parse loot table
    const lootElement = xmlDoc.querySelector('loot');

    // Create _validation object to store validation-related flags
    if (!monsterData._validation) {
      monsterData._validation = {};
    }

    // Check if loot tag exists
    monsterData._validation.lootTagExists = lootElement !== null;

    if (lootElement) {
      // Parse loot attributes
      monsterData.noLoot = lootElement.getAttribute('noLoot') === '1';
      monsterData.goldCoinsPerKillPerLvl = parseFloat(lootElement.getAttribute('goldCoinsPerKillPerLvl')) || 0;
      monsterData.baseGoldCoinsPerKill = parseFloat(lootElement.getAttribute('baseGoldCoinsPerKill')) || 0;
    }

    const lootItems = xmlDoc.querySelectorAll('loot item');
    const lootList = [];
    const itemsWithMissingAttributes = [];

    lootItems.forEach(item => {
      const lootItem = {
        name: item.getAttribute('name') || '',
        chance: parseFloat(item.getAttribute('chance')) || 0,
        countMax: parseInt(item.getAttribute('countmax')) || 1,
        ratio: parseFloat(item.getAttribute('bko_ratio')) || 0,
        rarity: item.getAttribute('bko_rarity') || 'None',
        origin: item.getAttribute('bko_origin') || 'None',
        source: item.getAttribute('bko_source') || '',
        unlockLevel: item.getAttribute('unlock_level') ? parseInt(item.getAttribute('unlock_level')) : undefined
      };

      // Verificar se o item tem todos os atributos necessários
      // Apenas para monstros que não são noLoot e têm power > 0
      if (!monsterData.noLoot && monsterData.power > 0) {
        const missingAttrs = [];

        if (!item.hasAttribute('name')) missingAttrs.push('name');
        if (!item.hasAttribute('chance')) missingAttrs.push('chance');
        if (!item.hasAttribute('bko_origin')) missingAttrs.push('bko_origin');
        if (!item.hasAttribute('bko_source')) missingAttrs.push('bko_source');
        if (!item.hasAttribute('unlock_level')) missingAttrs.push('unlock_level');

        if (missingAttrs.length > 0) {
          itemsWithMissingAttributes.push({
            name: lootItem.name || 'Unknown',
            missingAttributes: missingAttrs
          });
        }
      }

      // Convert chance to percentage (value from XML is always divided by 1000)
      // Example: 85000 becomes 85.000%, 602 becomes 0.602%
      lootItem.chance = lootItem.chance / 1000;

      lootList.push(lootItem);
    });
    monsterData.loot = lootList;

    // Adicionar validações ao _validation
    // 1. Verificar se há items com atributos faltando
    monsterData._validation.lootItemsWithMissingAttributes = itemsWithMissingAttributes;

    // 2. Verificar se baseGoldCoinsPerKill e goldCoinsPerKillPerLvl existem quando noLoot != 1
    const hasBaseGold = lootElement && lootElement.hasAttribute('baseGoldCoinsPerKill');
    const hasGoldPerLevel = lootElement && lootElement.hasAttribute('goldCoinsPerKillPerLvl');

    monsterData._validation.missingGoldAttributes = [];
    if (!monsterData.noLoot && monsterData.power > 0) {
      if (!hasBaseGold) monsterData._validation.missingGoldAttributes.push('baseGoldCoinsPerKill');
      if (!hasGoldPerLevel) monsterData._validation.missingGoldAttributes.push('goldCoinsPerKillPerLvl');
    }

    // Parse summons
    const summonsElement = xmlDoc.querySelector('summons');
    if (summonsElement) {
      monsterData.maxSummons = parseInt(summonsElement.getAttribute('maxSummons')) || 0;

      const summonItems = summonsElement.querySelectorAll('summon');
      const summonsList = [];
      summonItems.forEach(summon => {
        summonsList.push({
          name: summon.getAttribute('name') || '',
          interval: parseInt(summon.getAttribute('interval')) || 2000,
          chance: parseInt(summon.getAttribute('chance')) || 0
        });
      });
      monsterData.summons = summonsList;
    } else {
      monsterData.maxSummons = 0;
      monsterData.summons = [];
    }

    return monsterData;
  } catch (error) {
    console.error(`Error loading monster ${monsterName}:`, error);
    return null;
  }
}

// Load all available monsters
export async function loadAllMonsters() {
  // Always fetch fresh list from server
  const monsterFiles = await getMonsterFilesList();
  console.log(`Loading ${monsterFiles.length} monster files from disk...`);

  const monsters = [];

  // Load monsters in batches to avoid overwhelming the browser
  const batchSize = 10;
  for (let i = 0; i < monsterFiles.length; i += batchSize) {
    const batch = monsterFiles.slice(i, i + batchSize);
    const batchPromises = batch.map(async (fileName, index) => {
      const monsterData = await loadMonsterFromServer(fileName);
      if (monsterData) {
        return {
          ...monsterData,
          id: i + index + 1, // Add ID for table management
          fileName: `${fileName}.xml`, // Add full fileName with extension
        };
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    monsters.push(...batchResults.filter(m => m !== null));
  }

  return monsters;
}

/**
 * Ordena loot items por unlock_level (menor para maior)
 * Items sem unlock_level vêm primeiro
 * @param {Array} lootItems - Array de items do loot
 * @returns {Array} Array ordenado
 */
export function sortLootByUnlockLevel(lootItems) {
  return [...lootItems].sort((a, b) => {
    const levelA = a.unlockLevel ?? -1;
    const levelB = b.unlockLevel ?? -1;

    // Items sem unlock_level (-1) vêm primeiro
    if (levelA === -1 && levelB !== -1) return -1;
    if (levelA !== -1 && levelB === -1) return 1;

    // Se ambos não têm ou ambos têm, ordena por unlock_level
    return levelA - levelB;
  });
}

/**
 * Formata um loot item como XML com indentação correta
 * @param {Object} item - Loot item object
 * @returns {string} XML formatado
 */
export function formatLootItemAsXML(item) {
  const attributes = [];

  // Nome sempre em lowercase
  if (item.name) {
    attributes.push(`name="${item.name.toLowerCase()}"`);
  }

  // Adicionar outros atributos na ordem correta
  if (item.chance !== undefined) attributes.push(`chance="${item.chance}"`);
  if (item.countMax !== undefined) attributes.push(`countmax="${item.countMax}"`);
  if (item.priority !== undefined) attributes.push(`priority="${item.priority}"`);
  if (item.origin) attributes.push(`bko_origin="${item.origin}"`);
  if (item.unlockLevel !== undefined && item.unlockLevel !== null) {
    attributes.push(`unlock_level="${item.unlockLevel}"`);
  }

  return `<item ${attributes.join(' ')} />`;
}

/**
 * Atualiza a seção de loot em um XML de monstro
 * @param {string} xmlContent - Conteúdo XML completo
 * @param {Array} lootItems - Array de items para salvar
 * @returns {string} XML atualizado
 */
export function updateLootInXML(xmlContent, lootItems) {
  // Ordenar loot por unlock_level
  const sortedLoot = sortLootByUnlockLevel(lootItems);

  // Formatar cada item como XML com 4 espaços de indentação (2 níveis)
  const formattedItems = sortedLoot.map(item =>
    '    ' + formatLootItemAsXML(item)
  );

  // Criar novo conteúdo de loot com indentação correta
  // 2 espaços para <loot> e </loot>
  const newLootContent = '\n' + formattedItems.join('\n') + '\n  ';

  // Substituir seção de loot no XML, removendo qualquer indentação existente, mas preservando atributos
  const lootRegex = /\s*<loot([^>]*)>([\s\S]*?)<\/loot>/;
  return xmlContent.replace(lootRegex, (match, lootAttributes) => `\n  <loot${lootAttributes}>${newLootContent}</loot>`);
}

/**
 * Salva um monster atualizado para o XML
 * @param {Object} monster - Monster object com dados atualizados
 * @returns {Promise<boolean>} True se salvou com sucesso
 */
export async function saveMonster(monster) {
  try {
    const fileName = monster.xmlFileName ? `${monster.xmlFileName}.xml` : monster.fileName;

    if (!fileName) {
      throw new Error('Monster must have xmlFileName or fileName');
    }

    const response = await fetch('/api/monsters/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        monsterData: monster
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to save monster: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error saving monster:', error);
    throw error;
  }
}