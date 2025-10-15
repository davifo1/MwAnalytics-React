import { createValidator } from './validatorHelper';
import {
  MONSTER_ROOT_FIELDS,
  BALANCE_FIELDS,
  ATTRIBUTES_BASE_FIELDS,
  ATTRIBUTES_PER_LEVEL_FIELDS,
  LOOK_FIELDS,
  FLAG_FIELDS
} from '../../server/helpers/monsterFieldMapping';

/**
 * Valida um monstro enriquecido (com recommended e deviations pré-calculados)
 *
 * IMPORTANTE: O monster deve ser enriquecido com enrichMonsterWithValidationData antes de chamar esta função
 */
export const validateMonster = (enrichedMonster) => {
  const validator = createValidator();
  const { recommended, deviations, _validation } = enrichedMonster;

  // ===============================
  // XML MALFORMED (HIGHEST PRIORITY)
  // ===============================
  if (enrichedMonster._xmlMalformed) {
    validator.addError('xmlFormat', 'XML Format', {
      current: 'Malformed',
      recommended: 'Valid XML',
      deviation: null,
      extra: 'XML parsing error detected - file may be corrupted'
    });
    // Return early - no point validating other fields if XML is broken
    return validator.getResult();
  }

  // ===============================
  // REQUIRED FIELDS (HIGH PRIORITY)
  // ===============================
  const missingFields = [];

  // Collect all field mappings with required flag
  const allFieldMappings = [
    ...MONSTER_ROOT_FIELDS,
    ...BALANCE_FIELDS,
    ...ATTRIBUTES_BASE_FIELDS,
    ...ATTRIBUTES_PER_LEVEL_FIELDS,
    ...LOOK_FIELDS,
    ...FLAG_FIELDS
  ];

  // Check each required field
  allFieldMappings.forEach(field => {
    if (field.required) {
      const value = enrichedMonster[field.uiField];

      // Consider undefined and null as invalid
      if (value === undefined || value === null) {
        missingFields.push({
          uiField: field.uiField,
          label: field.xmlAttr || field.uiField,
          xmlPath: field.xmlPath
        });
      }
    }
  });

  // Check for <loot> tag existence (special case)
  // The loot tag must exist even if it has no attributes
  if (!enrichedMonster._validation || enrichedMonster._validation.lootTagExists === false) {
    missingFields.push({
      uiField: 'lootTag',
      label: '<loot> tag',
      xmlPath: 'loot'
    });
  }

  // If there are missing fields, create a single grouped error
  if (missingFields.length > 0) {
    // Group by xmlPath for better organization
    const groupedByPath = missingFields.reduce((acc, field) => {
      const path = field.xmlPath || 'root';
      if (!acc[path]) acc[path] = [];
      acc[path].push(field.label);
      return acc;
    }, {});

    const missingFieldsList = Object.entries(groupedByPath)
      .map(([path, fields]) => `${path}: ${fields.join(', ')}`)
      .join('; ');

    validator.addError('requiredFields', 'Required Fields', {
      current: `${missingFields.length} missing`,
      recommended: 'All required fields must be present',
      deviation: null,
      extra: missingFieldsList
    });

    // Don't provide auto-fix for required fields
  }

  // ===============================
  // FILE NAME SNAKE CASE (HIGH PRIORITY)
  // ===============================
  const fileName = enrichedMonster.xmlFileName;
  if (fileName) {
    // Check if filename is NOT already in snake_case
    // Valid snake_case: only lowercase letters, numbers, and underscores
    const isValidSnakeCase = /^[a-z0-9_]+$/.test(fileName);

    // Debug log for specific file
    if (fileName && fileName.toLowerCase().includes('evilwing')) {
      console.log(`[Validator] Checking ${fileName}: isValidSnakeCase=${isValidSnakeCase}, regex test=${/^[a-z0-9_]+$/.test(fileName)}`);
    }

    if (!isValidSnakeCase) {
      // Convert to snake_case with improved logic to preserve existing separators
      // Examples:
      // "Evilwing" -> "evilwing" (just lowercase)
      // "Black Griffin" -> "black_griffin"
      // "BlackGriffin" -> "black_griffin"
      // "Black-Griffin" -> "black_griffin" (hyphens treated as separators)
      // "black_griffin_2" -> "black_griffin_2" (already valid, won't enter this block)

      let snakeCaseFileName = fileName
        // First, replace hyphens and spaces with underscores
        .replace(/[-\s]+/g, '_')
        // Add underscore before uppercase letters that follow lowercase or numbers
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        // Convert to lowercase
        .toLowerCase()
        // Remove any leading underscores
        .replace(/^_+/, '')
        // Replace multiple consecutive underscores with single underscore
        .replace(/_+/g, '_')
        // Remove trailing underscores
        .replace(/_+$/, '');

      validator.addError('xmlFileName', 'File Name Format', {
        current: fileName,
        recommended: snakeCaseFileName,
        deviation: null,
        extra: 'File name should be in snake_case (lowercase with underscores)'
      }).withFix((monster) => {
        // Rename the file by updating xmlFileName
        monster._renameFile = {
          oldName: fileName,
          newName: snakeCaseFileName
        };
        monster.xmlFileName = snakeCaseFileName;
      });
    }
  }

  if(enrichedMonster.power <= 1)
    return validator.getResult();
  // ===============================
  // POWER
  // ===============================
  if (deviations.power.isCritical && Math.abs(enrichedMonster.power - recommended.power) > 0.5) {
    validator.addError('power', 'Power', {
      current: enrichedMonster.power?.toFixed(2) || 0,
      recommended: recommended.power?.toFixed(2),
      deviation: deviations.power.percent
    }).withFix((monster) => {
      monster.power = Math.round(recommended.power);
    });
  } else if (deviations.power.isWarning) {
    validator.addWarning('power', 'Power', {
      current: enrichedMonster.power?.toFixed(2) || 0,
      recommended: recommended.power?.toFixed(2),
      deviation: deviations.power.percent
    }).withFix((monster) => {
      monster.power = Math.round(recommended.power);
    });
  }

  // ===============================
  // DEFAULT LEVEL
  // ===============================
  if (deviations.defaultLevel.isCritical) {
    validator.addError('defaultLevel', 'Default Level', {
      current: enrichedMonster.defaultLevel || 0,
      recommended: recommended.defaultLevel,
      deviation: deviations.defaultLevel.percent
    }).withFix((monster) => {
      monster.defaultLevel = recommended.defaultLevel;
    });
  } else if (deviations.defaultLevel.isWarning) {
    validator.addWarning('defaultLevel', 'Default Level', {
      current: enrichedMonster.defaultLevel || 0,
      recommended: recommended.defaultLevel,
      deviation: deviations.defaultLevel.percent
    }).withFix((monster) => {
      monster.defaultLevel = recommended.defaultLevel;
    });
  }

  // ===============================
  // LAST UNLOCK LEVEL
  // ===============================
  const minRequiredUnlockLevel = Math.ceil((enrichedMonster.defaultLevel || 0) * 1.4);
  const difference = minRequiredUnlockLevel - _validation.currentLastUnlockLevel;
  const deviation =  -((difference / minRequiredUnlockLevel) * 100); //desvio
  if (deviation < -40 && !enrichedMonster.noLoot ) {
    validator.addError('lastUnlockLevel', 'Last Unlock Lvl', {
      current: _validation.currentLastUnlockLevel,
      recommended: minRequiredUnlockLevel,
      deviation: deviation,
      extra: `Missing ${difference} levels`
    });
  }

  // ===============================
  // ATTRIBUTES
  // ===============================
  const attributeFields = [
    { key: 'healthPerLevel', label: 'Health/Level' },
    { key: 'baseSpeed', label: 'Base Speed' },
    { key: 'maxAtkPerLevel', label: 'Max ATK/Level' },
    { key: 'maxAtkSPerLevel', label: 'Max SATK/Level' },
    { key: 'magicPenPerLevel', label: 'Magic Pen/Level' },
    { key: 'physicalPenPerLevel', label: 'Physical Pen/Level' },
    { key: 'armorPerLevel', label: 'Armor/Level' },
    { key: 'magicResistPerLevel', label: 'Magic Resist/Level' },
  ];

  attributeFields.forEach(field => {
    const deviation = deviations[field.key];
    const recommendedValue = recommended[field.key];

    if (!recommendedValue) return;

    if (deviation.isCritical) {
      validator.addError(field.key, field.label, {
        current: enrichedMonster[field.key] || 0,
        recommended: recommendedValue,
        deviation: deviation.percent
      }).withFix((monster) => {
        monster[field.key] = recommendedValue;
      });
    } else if (deviation.isWarning) {
      validator.addWarning(field.key, field.label, {
        current: enrichedMonster[field.key] || 0,
        recommended: recommendedValue,
        deviation: deviation.percent
      }).withFix((monster) => {
        monster[field.key] = recommendedValue;
      });
    }
  });

  // ===============================
  // EXPERIENCE (XP)
  // ===============================
  if (deviations.experience.isCritical) {
    validator.addError('experience', 'XP/Level', {
      current: enrichedMonster.experience || 0,
      recommended: recommended.experience,
      deviation: deviations.experience.percent
    }).withFix((monster) => {
      monster.experience = recommended.experience;
    });
  } else if (deviations.experience.isWarning) {
    validator.addWarning('experience', 'XP/Level', {
      current: enrichedMonster.experience || 0,
      recommended: recommended.experience,
      deviation: deviations.experience.percent
    }).withFix((monster) => {
      monster.experience = recommended.experience;
    });
  }

  // ===============================
  // CLASS XP
  // ===============================
  if (deviations.classXpPerLevel.isCritical) {
    validator.addError('classXpPerLevel', 'Class XP/Level', {
      current: enrichedMonster.classXpPerLevel || 0,
      recommended: recommended.classXpPerLevel,
      deviation: deviations.classXpPerLevel.percent
    }).withFix((monster) => {
      monster.classXpPerLevel = recommended.classXpPerLevel;
      monster.vocationpoints = recommended.classXpPerLevel; // Sync with vocationpoints
    });
  } else if (deviations.classXpPerLevel.isWarning) {
    validator.addWarning('classXpPerLevel', 'Class XP/Level', {
      current: enrichedMonster.classXpPerLevel || 0,
      recommended: recommended.classXpPerLevel,
      deviation: deviations.classXpPerLevel.percent
    }).withFix((monster) => {
      monster.classXpPerLevel = recommended.classXpPerLevel;
      monster.vocationpoints = recommended.classXpPerLevel; // Sync with vocationpoints
    });
  }

  // ===============================
  // LOOT CONFLICT
  // ===============================
  if (_validation.hasLootConflict) {
    validator.addError('resourceBalance', 'Loot Conflict', {
      current: `No Loot + ${enrichedMonster.resourceBalance}`,
      recommended: 'Remove No Loot flag or change balance',
      deviation: null,
      extra: 'Conflicting settings'
    }).withFix((monster) => {
      // Fix: remove No Loot flag
      monster.noLoot = false;
    });
  }

  // ===============================
  // LOOT ITEMS - MISSING ATTRIBUTES
  // ===============================
  if (_validation.lootItemsWithMissingAttributes && _validation.lootItemsWithMissingAttributes.length > 0) {
    const itemsList = _validation.lootItemsWithMissingAttributes
      .map(item => `${item.name} (missing: ${item.missingAttributes.join(', ')})`)
      .join('; ');

    validator.addError('lootItemsAttributes', 'Loot Items Attrs', {
      current: `${_validation.lootItemsWithMissingAttributes.length} items with missing attributes`,
      recommended: 'All items must have: name, chance, bko_origin, bko_source, unlock_level',
      deviation: null,
      extra: itemsList
    });
  }

  // ===============================
  // LOOT TAG - MISSING GOLD ATTRIBUTES
  // ===============================
  if (_validation.missingGoldAttributes && _validation.missingGoldAttributes.length > 0) {
    validator.addError('lootGoldAttributes', 'Loot Gold Attrs', {
      current: `Missing ${_validation.missingGoldAttributes.length} attributes`,
      recommended: 'Loot tag must have: baseGoldCoinsPerKill, goldCoinsPerKillPerLvl',
      deviation: null,
      extra: `Missing: ${_validation.missingGoldAttributes.join(', ')}`
    });
  }

  return validator.getResult();
};

/**
 * Calcula estatísticas gerais de validação para uma lista de monstros enriquecidos
 */
export const calculateValidationStats = (enrichedMonsters) => {
  const stats = {
    total: enrichedMonsters.length,
    critical: 0,
    warning: 0,
    good: 0,
    criticalPercent: 0,
    warningPercent: 0,
    goodPercent: 0
  };

  enrichedMonsters.forEach(monster => {
    const validation = validateMonster(monster);
    if (validation.status === 'critical') stats.critical++;
    else if (validation.status === 'warning') stats.warning++;
    else stats.good++;
  });

  stats.criticalPercent = ((stats.critical / stats.total) * 100).toFixed(1);
  stats.warningPercent = ((stats.warning / stats.total) * 100).toFixed(1);
  stats.goodPercent = ((stats.good / stats.total) * 100).toFixed(1);

  return stats;
};

// Re-export para backward compatibility
export { enrichMonsterWithValidationData } from './monsterEnricher';
export { calculateDeviation } from './validatorHelper';
