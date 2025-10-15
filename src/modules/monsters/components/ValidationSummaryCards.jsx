import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Summary cards showing validation statistics
 */
export const ValidationSummaryCards = ({ stats, onFilterByStatus, onShowDetails }) => {
  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {/* Critical Issues Card */}
      <Card
        className="border-red-500/50 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
        onClick={() => onFilterByStatus('critical')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Critical Issues</h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-red-300">{stats.criticalIssueTypes}</div>
            <div className="text-xs text-red-400/70">
              issue types
            </div>
            <div className="text-xs text-red-400/50 mt-1">
              {stats.totalCriticalIssues} total issues
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onFilterByStatus('critical');
            }}
          >
            Filter Critical
          </Button>
        </CardContent>
      </Card>

      {/* Warning Issues Card */}
      <Card
        className="border-yellow-500/50 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors"
        onClick={() => onFilterByStatus('warning')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <h3 className="text-sm font-semibold text-yellow-400">Warning Issues</h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-yellow-300">{stats.warningIssueTypes}</div>
            <div className="text-xs text-yellow-400/70">
              issue types
            </div>
            <div className="text-xs text-yellow-400/50 mt-1">
              {stats.totalWarningIssues} total issues
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-7 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onFilterByStatus('warning');
            }}
          >
            Filter Warnings
          </Button>
        </CardContent>
      </Card>

      {/* Total Issues Card */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-400">Total</h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-blue-300">{stats.totalIssueTypes}</div>
            <div className="text-xs text-blue-400/70">
              issue types
            </div>
            <div className="text-xs text-blue-400/50 mt-1">
              affecting {stats.totalAffectedMonsters} monsters
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onFilterByStatus('all');
            }}
          >
            Show All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
