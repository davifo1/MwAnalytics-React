/**
 * Cores para cada Base Stats Role
 */
export const baseStatsRoleColors = {
  'None': 'text-gray-400',
  'MixedAttacker': 'text-blue-400',
  'PhysicalAttacker': 'text-red-400',
  'SpecialAttacker': 'text-purple-400',
  'PhysicalTank': 'text-green-400',
  'SpecialTank': 'text-cyan-400',
  'GlassCannon': 'text-orange-400',
  'Speedster': 'text-yellow-400',
  'StallOrSupport': 'text-indigo-400',
  'BulkyOffense': 'text-emerald-400',
};

/**
 * Calcula Base Stats Role automaticamente baseado nos stats
 * @param {number} hp - Health Points
 * @param {number} attack - Attack stat
 * @param {number} spAttack - Special Attack stat
 * @param {number} defense - Defense stat
 * @param {number} spDefense - Special Defense stat
 * @param {number} speed - Speed value (already converted from speedType)
 * @returns {string} Base Stats Role
 */
export const calculateBaseStatsRole = (hp, attack, spAttack, defense, spDefense, speed) => {

  // Evita divisão por zero
  const max = Math.max(1, Math.max(hp, attack, spAttack, defense, spDefense, speed));

  // Calcula proporções normalizadas (0.0 a 1.0)
  const nhp = hp / max;
  const natk = attack / max;
  const nspAtk = spAttack / max;
  const ndef = defense / max;
  const nspDef = spDefense / max;
  const nspeed = speed / max;

  // Glass Cannon: ataque alto, defesa e hp bem baixos
  if ((natk >= 0.9 || nspAtk >= 0.9) && nhp < 0.4 && ndef < 0.4 && nspDef < 0.4)
    return 'GlassCannon';

  // Speedster
  if (nspeed >= 0.9 && (natk >= 0.6 || nspAtk >= 0.6))
    return 'Speedster';

  // Physical Attacker
  if (natk >= nspAtk + 0.4)
    return 'PhysicalAttacker';

  // Special Attacker
  if (nspAtk >= natk + 0.4)
    return 'SpecialAttacker';

  // Physical Tank
  if (ndef >= 0.85 && nhp >= 0.6)
    return 'PhysicalTank';

  // Special Tank
  if (nspDef >= 0.85 && nhp >= 0.6)
    return 'SpecialTank';

  // Stall/Support (ataque fraco, defesa alta)
  if (natk <= 0.4 && nspAtk <= 0.4 && (ndef >= 0.6 || nspDef >= 0.6))
    return 'StallOrSupport';

  // Bulky Offense
  if ((natk >= 0.6 || nspAtk >= 0.6) && (ndef >= 0.6 || nspDef >= 0.6) && nhp >= 0.6)
    return 'BulkyOffense';

  // Default fallback
  return 'MixedAttacker';
};