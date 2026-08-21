import React from 'react';

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-md mb-4"></div>
      <div className="space-y-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-md"></div>
        ))}
      </div>
    </div>
  );
};