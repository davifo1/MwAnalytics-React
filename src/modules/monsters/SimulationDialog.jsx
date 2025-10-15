import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateBaseStatsRole } from '@/utils/baseStatsRoleCalculator';

const SimulationDialog = ({ monster }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(monster?.defaultLevel || 1);

  // Helper para converter speed type para valor numérico
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

  // Calcular Base Stats Role
  const baseStatsRole = useMemo(() => {
    if (!monster) return 'None';

    const speedValue = getSpeedValue(monster.speedType || 'None');

    return calculateBaseStatsRole(
      monster.hp || 0,
      monster.atk || 0,
      monster.satk || 0,
      monster.def || 0,
      monster.sdef || 0,
      speedValue
    );
  }, [monster]);

  // Calcular atributos baseados no level
  const calculatedStats = useMemo(() => {
    if (!monster) return {};

    // Health calculation (healthPerLevel * level)
    const health = (monster.healthPerLevel || 0) * level;

    // Max ATK e Max SATK (perLevel * level)
    const maxAtk = (monster.maxAtkPerLevel || 0) * level;
    const maxSatk = (monster.maxAtkSPerLevel || 0) * level;

    // Armor e Magic Resist
    const armor = (monster.armor || 0) + ((monster.armorPerLevel || 0) * level);
    const magicResist = (monster.magicResist || 0) + ((monster.magicResistPerLevel || 0) * level);

    // Physical e Magic Pen
    const physicalPen = (monster.physicalPen || 0) + ((monster.physicalPenPerLevel || 0) * level);
    const magicPen = (monster.magicPen || 0) + ((monster.magicPenPerLevel || 0) * level);

    // Speed calculation
    const baseSpeed = monster.baseSpeed || 0;
    const speedPerLevel = monster.speedPerLevel || 0;
    const totalSpeed = baseSpeed + (speedPerLevel * level);

    return {
      health: Math.round(health),
      maxAtk: Math.round(maxAtk),
      maxSatk: Math.round(maxSatk),
      speed: Math.round(totalSpeed),
      armor: armor.toFixed(2),
      magicResist: magicResist.toFixed(2),
      physicalPen: physicalPen.toFixed(2),
      magicPen: magicPen.toFixed(2)
    };
  }, [monster, level]);

  useEffect(() => {
    // Reset level quando o monster muda
    if (open && monster) {
      setLevel(monster.defaultLevel || 1);
    }
  }, [open, monster]);

  if (!monster) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs border-blue-500/50 hover:bg-blue-500/10"
        >
          <Calculator className="h-3.5 w-3.5 mr-1" />
          Simulação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulação de Atributos
            {(monster.name || monster.monsterName) && (
              <Badge variant="outline" >
                {monster.name || monster.monsterName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Level Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Level</Label>
              <Input
                type="number"
                value={level}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setLevel(Math.min(Math.max(value, 0), 500));
                }}
                min={0}
                max={500}
                className="w-20 h-7 text-sm text-center font-bold text-blue-400"
              />
            </div>
            <Slider
              value={[level]}
              onValueChange={(value) => setLevel(value[0])}
              min={0}
              max={500}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>500</span>
            </div>
          </div>

          {/* Combat Stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Atributos de Combate
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <StatDisplay label="Health" value={calculatedStats.health} color="text-red-400" />
              <StatDisplay label="Speed" value={calculatedStats.speed} color="text-yellow-400" />
              <StatDisplay label="Max ATK" value={calculatedStats.maxAtk} color="text-orange-400" />
              <StatDisplay label="Max SATK" value={calculatedStats.maxSatk} color="text-purple-400" />
            </div>
          </div>

          {/* Penetration & Resistance */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Penetração & Resistência
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <StatDisplay label="Physical Pen" value={calculatedStats.physicalPen} color="text-orange-300" />
              <StatDisplay label="Magic Pen" value={calculatedStats.magicPen} color="text-purple-300" />
              <StatDisplay label="Armor" value={calculatedStats.armor} color="text-green-300" />
              <StatDisplay label="Magic Resist" value={calculatedStats.magicResist} color="text-blue-300" />
            </div>
          </div>

          {/* Base Values Reference */}
          <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span>Default Level:</span>
              <span className="font-medium">{monster.defaultLevel || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Power:</span>
              <span className="font-medium">{monster.power || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Base Stats Role:</span>
              <span className="font-medium">{baseStatsRole}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Component for displaying individual stats
const StatDisplay = ({ label, value, color }) => (
  <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
    <span className="text-xs text-gray-400">{label}:</span>
    <span className={`text-sm font-semibold ${color}`}>
      {value !== undefined ? value : '0'}
    </span>
  </div>
);

export default SimulationDialog;