import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SecretariaSidebar } from '@/components/SecretariaSidebar'; // Importar o novo sidebar
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

export const SecretariaLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <SecretariaSidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebarCollapse={toggleSidebarCollapse} 
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} user={user} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};