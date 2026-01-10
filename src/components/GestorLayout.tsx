import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GestorSidebar } from '@/components/GestorSidebar';
import { Header } from '@/components/Header';

export const GestorLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Novo estado para recolher/expandir
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed); // Nova função para alternar recolhimento

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <GestorSidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isSidebarCollapsed={isSidebarCollapsed} // Passa o estado
        toggleSidebarCollapse={toggleSidebarCollapse} // Passa a função
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}> {/* Ajusta margem */}
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};