import React from 'react';
import { Outlet } from 'react-router-dom';

export const SecretariaLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};