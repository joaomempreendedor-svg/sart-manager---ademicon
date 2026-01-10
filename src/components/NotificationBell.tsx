import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  notificationCount: number;
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notificationCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      aria-label={`Você tem ${notificationCount} notificações`}
    >
      <Bell className="w-6 h-6" />
      {notificationCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
          {notificationCount}
        </span>
      )}
    </button>
  );
};