import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * Modal that shows detailed breakdown of validation issues
 */
export const ValidationDetailsModal = ({ isOpen, onClose, monsters, severity }) => {
  const issuesByField = useMemo(() => {
    if (!monsters || monsters.length === 0) return [];

    const fieldMap = {};

    monsters.forEach(monster => {
      if (!monster.validation || !monster.validation.issues) return;

      // Get all issues from monsters with this status
      const allIssues = monster.validation.issues.all || [];

      if (!Array.isArray(allIssues)) return;

      allIssues.forEach(issue => {
        const fieldKey = issue.field;
        if (!fieldMap[fieldKey]) {
          fieldMap[fieldKey] = {
            field: issue.field,
            label: issue.label,
            count: 0
          };
        }
        fieldMap[fieldKey].count++;
      });
    });

    // Sort by count descending
    return Object.values(fieldMap).sort((a, b) => b.count - a.count);
  }, [monsters, severity]);

  const totalIssues = useMemo(() => {
    if (!Array.isArray(issuesByField)) return 0;
    return issuesByField.reduce((sum, field) => sum + field.count, 0);
  }, [issuesByField]);

  const isCritical = severity === 'critical';
  const iconColor = isCritical ? 'text-red-400' : 'text-yellow-400';
  const bgColor = isCritical ? 'bg-red-500/10' : 'bg-yellow-500/10';
  const borderColor = isCritical ? 'border-red-500/30' : 'border-yellow-500/30';
  const titleColor = isCritical ? 'text-red-300' : 'text-yellow-300';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-gray-900 border-gray-700 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isCritical ? (
              <AlertCircle className={`h-5 w-5 ${iconColor}`} />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${iconColor}`} />
            )}
            <span className={titleColor}>
              {isCritical ? 'Critical' : 'Warning'} Issues Breakdown
            </span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Detailed analysis of {severity} validation issues across {monsters?.length || 0} monsters
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          <div className="space-y-3">
            {/* Summary */}
            <Card className={`${bgColor} ${borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Issues</p>
                    <p className={`text-2xl font-bold ${titleColor}`}>{totalIssues}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Affected Monsters</p>
                    <p className={`text-2xl font-bold ${titleColor}`}>{monsters?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Issue Types</p>
                    <p className={`text-2xl font-bold ${titleColor}`}>
                      {Array.isArray(issuesByField) ? issuesByField.length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues by field */}
            {Array.isArray(issuesByField) && issuesByField.map((fieldData, idx) => (
              <Card key={fieldData.field} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-gray-200">
                          {fieldData.label}
                        </h4>
                        <p className="text-xs text-gray-500">
                          (<code className="text-gray-400">{fieldData.field}</code>)
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-sm px-3 py-1 ${
                        isCritical
                          ? 'border-red-500/50 text-red-400 bg-red-500/10'
                          : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                      }`}
                    >
                      {fieldData.count} issue{fieldData.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!Array.isArray(issuesByField) || issuesByField.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No {severity} issues found
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
