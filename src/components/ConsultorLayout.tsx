import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ConsultorSidebar } from '@/components/ConsultorSidebar';
import { Header } from '@/components/Header';

export const ConsultorLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <ConsultorSidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 md:ml-64 flex flex-col">
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};