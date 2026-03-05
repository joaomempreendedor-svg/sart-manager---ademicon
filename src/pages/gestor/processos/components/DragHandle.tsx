import React from 'react';
import { GripVertical } from 'lucide-react';

export const DragHandle: React.FC<{ dragHandleProps: any }> = ({ dragHandleProps }) => {
  return (
    <div
      {...dragHandleProps}
      className="flex items-center justify-center w-6 h-6 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-grab"
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
};