import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Label component that displays an info icon with tooltip when attribute has description
 * @param {string} attributeName - The attribute name to check in item_attributes.json
 * @param {string} label - The display label text
 * @param {Function} getAttributeInfo - Function from useItemAttributes hook to get attribute info
 */
export const AttributeLabel = ({ attributeName, label, getAttributeInfo }) => {
  const attributeInfo = getAttributeInfo ? getAttributeInfo(attributeName) : null;

  if (!attributeInfo || !attributeInfo.shortDesc) {
    // No tooltip available, just show the label
    return <span className="text-sm font-medium text-gray-700">{label}</span>;
  }

  // Check if example contains XML tags
  const isXmlExample = attributeInfo.example && /<[^>]+>/.test(attributeInfo.example);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="text-sm">{attributeInfo.shortDesc}</p>
              {attributeInfo.example && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-300 mb-1">Example:</p>
                  {isXmlExample ? (
                    <pre className="text-xs text-gray-400 bg-gray-900 p-2 rounded overflow-x-auto">
                      <code>{attributeInfo.example}</code>
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-400">{attributeInfo.example}</p>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
