import React from 'react';
import { X, Bell, Gift, FileText, DollarSign, CheckCircle2, CalendarDays, UserRound } from 'lucide-react';
import { Notification } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DialogFooter } from '@/components/ui/dialog';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'birthday': return <Gift className="w-5 h-5 text-pink-500" />;
      case 'form_submission': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'new_sale': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'onboarding_complete': return <CheckCircle2 className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-200 dark:border-slate-700 sm:max-w-xl">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center space-x-2">
            <Bell className="w-6 h-6 text-brand-500" />
            <span>Notificações ({notifications.length})</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <ScrollArea className="max-h-[70vh] py-4 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <Bell className="mx-auto w-12 h-12 mb-3" />
              <p>Nenhuma notificação nova.</p>
            </div>
          ) : (
            <div className="space-y-3 px-4">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-gray-200 dark:border-slate-700 flex-col sm:flex-row"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{notification.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-1">
                      <CalendarDays className="w-3 h-3" />
                      <span>{new Date(notification.date).toLocaleDateString('pt-BR')}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 px-6 py-4 bg-gray-50 dark:bg-slate-700/50 flex-col sm:flex-row">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};