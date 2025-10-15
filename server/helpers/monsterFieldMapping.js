/**
 * Generic bidirectional field mapping for monster XML read/write operations
 *
 * This module provides a centralized configuration for mapping between:
 * - UI field names (camelCase, used in React components)
 * - XML attributes and elements (as they appear in monster XML files)
 *
 * Easy to extend: Just add new entries to the appropriate mapping section
 */

/**
 * Field mapping configuration
 *
 * Structure:
 * - uiField: Field name used in UI/React components
 * - xmlPath: Path to the XML element/attribute
 * - xmlAttr: Attribute name in XML
 * - type: Data type (string, number, boolean, float)
 * - default: Default value if not present
 * - required: If true, field must have a non-null/non-undefined value (optional)
 * - omitIfZero: If true, don't write attribute if value is 0/false (optional)
 */

// Root <monster> attributes
export const MONSTER_ROOT_FIELDS = [
  { uiField: 'monsterName', xmlPath: 'monster', xmlAttr: 'name', type: 'string', default: '', required: true },
  { uiField: 'nameDescription', xmlPath: 'monster', xmlAttr: 'nameDescription', type: 'string', default: '', required: true },
  { uiField: 'race', xmlPath: 'monster', xmlAttr: 'race', type: 'string', default: '', required: true },
  { uiField: 'experience', xmlPath: 'monster', xmlAttr: 'experience', type: 'number', default: 0, required: true },
  { uiField: 'classXpPerLevel', xmlPath: 'monster', xmlAttr: 'vocationpoints', type: 'number', default: 0, required: true },
  { uiField: 'ignoreAreaLevel', xmlPath: 'monster', xmlAttr: 'ignoreAreaLevel', type: 'boolean', default: false, omitIfZero: true, required: false },
  { uiField: 'ignoreDarkAndHorde', xmlPath: 'monster', xmlAttr: 'ignoreDarkAndHorde', type: 'boolean', default: false, omitIfZero: true, required: false },
  { uiField: 'egg-id', xmlPath: 'monster', xmlAttr: 'egg-id', type: 'number', default: 0, omitIfZero: true, required: false },
  { uiField: 'egg-chance', xmlPath: 'monster', xmlAttr: 'egg-chance', type: 'number', default: 0, omitIfZero: true, required: false },
];

// <balance> element attributes
export const BALANCE_FIELDS = [
  { uiField: 'power', xmlPath: 'balance', xmlAttr: 'power', type: 'float', default: 0, required: true },
  { uiField: 'hp', xmlPath: 'balance', xmlAttr: 'hp', type: 'number', default: 0, required: true },
  { uiField: 'atk', xmlPath: 'balance', xmlAttr: 'atk', type: 'number', default: 0, required: true },
  { uiField: 'def', xmlPath: 'balance', xmlAttr: 'def', type: 'number', default: 0, required: true },
  { uiField: 'satk', xmlPath: 'balance', xmlAttr: 'satk', type: 'number', default: 0, required: true },
  { uiField: 'sdef', xmlPath: 'balance', xmlAttr: 'sdef', type: 'number', default: 0, required: true },
  { uiField: 'speed', xmlPath: 'balance', xmlAttr: 'speed', type: 'number', default: 0, required: true },
  { uiField: 'defaultLevel', xmlPath: 'balance', xmlAttr: 'defaultLevel', type: 'number', default: 0, required: true },
  { uiField: 'mapRole', xmlPath: 'balance', xmlAttr: 'mapRole', type: 'string', default: 'None', required: true },
  { uiField: 'speedType', xmlPath: 'balance', xmlAttr: 'speedType', type: 'string', default: '', required: true },
];

// Resource balance requires special handling (UI -> XML conversion)
// resourceBalance: "Loot3" -> extraLoot: 3, extraXp: 0
// resourceBalance: "Exp2" -> extraLoot: 0, extraXp: 2
// resourceBalance: "Equals" -> extraLoot: 0, extraXp: 0
export function convertResourceBalanceToXml(resourceBalance) {
  if (!resourceBalance || resourceBalance === 'Equals') {
    return { extraLoot: 0, extraXp: 0 };
  }

  if (resourceBalance.startsWith('Loot')) {
    const value = parseInt(resourceBalance.replace('Loot', '')) || 0;
    return { extraLoot: value, extraXp: 0 };
  }

  if (resourceBalance.startsWith('Exp')) {
    const value = parseInt(resourceBalance.replace('Exp', '')) || 0;
    return { extraLoot: 0, extraXp: value };
  }

  return { extraLoot: 0, extraXp: 0 };
}

// <attributesBase> element attributes
export const ATTRIBUTES_BASE_FIELDS = [
  { uiField: 'baseHealth', xmlPath: 'attributesBase', xmlAttr: 'health', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseSpeed', xmlPath: 'attributesBase', xmlAttr: 'speed', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseAtk', xmlPath: 'attributesBase', xmlAttr: 'atk', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseAtks', xmlPath: 'attributesBase', xmlAttr: 'atks', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseMagicPen', xmlPath: 'attributesBase', xmlAttr: 'magicPen', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'basePhysicalPen', xmlPath: 'attributesBase', xmlAttr: 'physicalPen', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseArmor', xmlPath: 'attributesBase', xmlAttr: 'armor', type: 'float', default: 0, omitIfZero: false, required: true },
  { uiField: 'baseMagicResist', xmlPath: 'attributesBase', xmlAttr: 'magicResist', type: 'float', default: 0, omitIfZero: false, required: true },
];

// <attributesPerLevel> element attributes
export const ATTRIBUTES_PER_LEVEL_FIELDS = [
  { uiField: 'healthPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'healthPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'speedPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'speedPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'maxAtkPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'maxAtkPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'maxAtkSPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'maxAtkSPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'magicPenPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'magicPenPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'physicalPenPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'physicalPenPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'armorPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'armorPerLevel', type: 'float', default: 0, required: true },
  { uiField: 'magicResistPerLevel', xmlPath: 'attributesPerLevel', xmlAttr: 'magicResistPerLevel', type: 'float', default: 0, required: true },
];

// <look> element attributes
export const LOOK_FIELDS = [
  { uiField: 'lookType', xmlPath: 'look', xmlAttr: 'type', type: 'number', default: 0, required: true },
  { uiField: 'lookTypeEx', xmlPath: 'look', xmlAttr: 'typeex', type: 'number', default: 0, required: true },
  { uiField: 'corpse', xmlPath: 'look', xmlAttr: 'corpse', type: 'number', default: 0, required: false },
];

// <loot> element attributes
export const LOOT_FIELDS = [
  { uiField: 'goldCoinsPerKillPerLvl', xmlPath: 'loot', xmlAttr: 'goldCoinsPerKillPerLvl', type: 'float', default: 0, required: false },
  { uiField: 'baseGoldCoinsPerKill', xmlPath: 'loot', xmlAttr: 'baseGoldCoinsPerKill', type: 'float', default: 0, required: false },
  { uiField: 'noLoot', xmlPath: 'loot', xmlAttr: 'noLoot', type: 'boolean', default: false, omitIfZero: true, required: false },
];

// <targetchange> element attributes
export const TARGET_CHANGE_FIELDS = [
  { uiField: 'targetChangeInterval', xmlPath: 'targetchange', xmlAttr: 'interval', type: 'number', default: 0, required: false },
  { uiField: 'targetChangeChance', xmlPath: 'targetchange', xmlAttr: 'chance', type: 'number', default: 0, required: false },
];

// <flags> <flag> attributes (all in one <flag> element)
export const FLAG_FIELDS = [
  // Comportamento
  { uiField: 'attackable', xmlAttr: 'attackable', type: 'boolean', default: false, required: false },
  { uiField: 'hostile', xmlAttr: 'hostile', type: 'boolean', default: false, required: false },
  { uiField: 'hostileWhenAttacked', xmlAttr: 'hostileWhenAttacked', type: 'boolean', default: false, required: false },
  { uiField: 'pushable', xmlAttr: 'pushable', type: 'boolean', default: false, required: false },
  { uiField: 'canpushitems', xmlAttr: 'canpushitems', type: 'boolean', default: false, required: false },
  { uiField: 'canpushcreatures', xmlAttr: 'canpushcreatures', type: 'boolean', default: false, required: false },
  { uiField: 'challengeable', xmlAttr: 'challengeable', type: 'boolean', default: false, required: false },
  { uiField: 'notMove', xmlAttr: 'notMove', type: 'boolean', default: false, required: false },

  // Especiais
  { uiField: 'isboss', xmlAttr: 'isboss', type: 'boolean', default: false, required: false },
  { uiField: 'hidehealth', xmlAttr: 'hidehealth', type: 'boolean', default: false, required: false },
  { uiField: 'ignorespawnblock', xmlAttr: 'ignorespawnblock', type: 'boolean', default: false, required: false },

  // Movimento em Fields
  { uiField: 'canwalkonenergy', xmlAttr: 'canwalkonenergy', type: 'boolean', default: false, required: false },
  { uiField: 'canwalkonfire', xmlAttr: 'canwalkonfire', type: 'boolean', default: false, required: false },
  { uiField: 'canwalkonpoison', xmlAttr: 'canwalkonpoison', type: 'boolean', default: false, required: false },

  // Comportamento em Combate
  { uiField: 'targetdistance', xmlAttr: 'targetdistance', type: 'number', default: 1, required: false },
  { uiField: 'staticattack', xmlAttr: 'staticattack', type: 'number', default: 0, required: false },
  { uiField: 'runonhealth', xmlAttr: 'runonhealth', type: 'number', default: 0, required: false },
];

// <elements> <element> attributes (all in one <element> element)
export const ELEMENT_FIELDS = [
  { uiField: 'physicalPercent', xmlAttr: 'physicalPercent', type: 'number', default: 0, required: false },
  { uiField: 'deathPercent', xmlAttr: 'deathPercent', type: 'number', default: 0, required: false },
  { uiField: 'energyPercent', xmlAttr: 'energyPercent', type: 'number', default: 0, required: false },
  { uiField: 'earthPercent', xmlAttr: 'earthPercent', type: 'number', default: 0, required: false },
  { uiField: 'icePercent', xmlAttr: 'icePercent', type: 'number', default: 0, required: false },
  { uiField: 'holyPercent', xmlAttr: 'holyPercent', type: 'number', default: 0, required: false },
  { uiField: 'firePercent', xmlAttr: 'firePercent', type: 'number', default: 0, required: false },
  { uiField: 'arcanePercent', xmlAttr: 'arcanePercent', type: 'number', default: 0, required: false },
];

// All possible immunities
export const IMMUNITY_TYPES = [
  'fire', 'ice', 'death', 'holy', 'earth', 'energy', 'physical', 'arcane',
  'drown', 'lifedrain', 'manadrain', 'paralyze', 'invisible', 'pacified', 'rooted', 'outfit', 'drunk'
];

/**
 * Check if a field should be omitted based on its value
 */
export function shouldOmitField(value, type, omitIfZero) {
  if (!omitIfZero) return false;

  switch (type) {
    case 'boolean':
      return !value; // Omit if false
    case 'number':
    case 'float':
      return value === 0 || value === '0'; // Omit if zero
    default:
      return false;
  }
}

/**
 * Convert value to appropriate XML format
 */
export function valueToXml(value, type) {
  if (value === undefined || value === null) return '';

  switch (type) {
    case 'boolean':
      return value ? '1' : '0';
    case 'number':
      return Math.round(value).toString();
    case 'float':
      return parseFloat(value).toString();
    case 'string':
    default:
      return value.toString();
  }
}

/**
 * Convert XML value to appropriate JS type
 */
export function valueFromXml(value, type) {
  if (value === undefined || value === null || value === '') {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'float': return 0;
      case 'string': return '';
      default: return '';
    }
  }

  switch (type) {
    case 'boolean':
      return value === '1' || value === 'true';
    case 'number':
      return parseInt(value) || 0;
    case 'float':
      return parseFloat(value) || 0;
    case 'string':
    default:
      return value.toString();
  }
}

/**
 * Get all field mappings grouped by XML path
 */
export function getAllFieldMappings() {
  return {
    monsterRoot: MONSTER_ROOT_FIELDS,
    balance: BALANCE_FIELDS,
    attributesBase: ATTRIBUTES_BASE_FIELDS,
    attributesPerLevel: ATTRIBUTES_PER_LEVEL_FIELDS,
    look: LOOK_FIELDS,
    targetChange: TARGET_CHANGE_FIELDS,
    flags: FLAG_FIELDS,
    elements: ELEMENT_FIELDS,
  };
}
