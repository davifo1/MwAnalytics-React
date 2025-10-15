import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

const MonsterDetailsOptimized = ({ editingMonster }) => {
  if (!editingMonster) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p>Select a monster to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex items-center justify-center">
      <Card className="max-w-md bg-gray-800 border-gray-700">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-gray-300 font-medium">
                TODO: Metrics
              </p>
              <p className="text-xs text-gray-400">
                Monster metrics and analytics will be displayed here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonsterDetailsOptimized;
