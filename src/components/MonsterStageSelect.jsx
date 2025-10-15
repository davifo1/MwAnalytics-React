import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Componente reutilizável para seleção de Monster Stage
 * @param {Object} props
 * @param {string} props.value - Valor selecionado
 * @param {Function} props.onValueChange - Callback quando valor mudar
 * @param {Array} props.stages - Array de stages do monsterStages.json
 * @param {boolean} props.disabled - Se o select está desabilitado
 * @param {string} props.className - Classes CSS adicionais
 */
export function MonsterStageSelect({
  value,
  onValueChange,
  stages = [],
  disabled = false,
  className = ""
}) {
  // Encontrar o stage selecionado para mostrar descrição no trigger
  const selectedStage = stages.find(s => s.stage === value);

  return (
    <Select
      value={value || 'none'}
      onValueChange={(val) => onValueChange(val === 'none' ? '' : val)}
      disabled={disabled}
    >
      <SelectTrigger className={`h-auto min-h-[32px] py-1 bg-gray-900 border-gray-700 text-gray-200 ${className}`}>
        {value && selectedStage ? (
          <div className="flex flex-col items-start gap-0.5 text-xs w-full">
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedStage.stage}</span>
              <span className="text-gray-500">({selectedStage.level_range})</span>
            </div>
            <div className="text-gray-600 text-[10px]">{selectedStage.description}</div>
          </div>
        ) : (
          <SelectValue placeholder="Selecione" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum</SelectItem>
        {stages.map((stage) => (
          <SelectItem key={stage.stage} value={stage.stage}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{stage.stage}</span>
              <span className="text-xs text-gray-500">({stage.level_range})</span>
              <span className="text-xs text-gray-600">• {stage.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
