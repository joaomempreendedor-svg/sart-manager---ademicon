import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { CalendarView } from '@/components/CalendarView';
import { EventModal } from '@/components/EventModal';
import { Loader2, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, UserRound, BellRing } from 'lucide-react';
import { LeadTask, ConsultantEvent, TeamMember } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationCenter } from '@/components/NotificationCenter';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'lead_meeting' | 'consultant_event';
  leadId?: string;
  consultantId?: string;
  managerId?: string;
  status?: 'pending' | 'accepted' | 'declined'; // For manager invitation status
  description?: string;
};

const CalendarPage = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    leadTasks, 
    crmLeads, 
    teamMembers, 
    consultantEvents, 
    isDataLoading,
    notifications,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const consultants = useMemo(() => {
    return teamMembers.filter(m => m.isActive && (m.roles.includes('CONSULTOR') || m.roles.includes('Prévia') || m.roles.includes('Autorizado')));
  }, [teamMembers]);

  useEffect(() => {
    if (user?.role === 'CONSULTOR' && !selectedConsultantId) {
      setSelectedConsultantId(user.id);
    } else if ((user?.role === 'GESTOR' || user?.role === 'ADMIN') && consultants.length > 0 && !selectedConsultantId) {
      setSelectedConsultantId(consultants[0].id); // Default to the first consultant for managers
    }
  }, [user, consultants, selectedConsultantId]);

  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add Lead Meetings
    leadTasks.forEach(task => {
      if (task.type === 'meeting' && task.meeting_start_time && task.meeting_end_time) {
        const lead = crmLeads.find(l => l.id === task.lead_id);
        events.push({
          id: task.id,
          title: task.title,
          start: new Date(task.meeting_start_time),
          end: new Date(task.meeting_end_time),
          type: 'lead_meeting',
          leadId: task.lead_id,
          consultantId: task.user_id,
          managerId: task.manager_id,
          status: task.manager_invitation_status,
          description: task.description,
        });
      }
    });

    // Add Consultant Personal Events
    consultantEvents.forEach(event => {
      if (event.start_time && event.end_time) {
        events.push({
          id: event.id,
          title: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          type: 'consultant_event',
          consultantId: event.user_id,
          description: event.description,
        });
      }
    });

    return events;
  }, [leadTasks, crmLeads, consultantEvents]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    setIsModalOpen(true);
  };

  const handleSlotClick = (start: Date, end: Date) => {
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  const handleOpenNotifications = () => {
    setIsNotificationCenterOpen(true);
  };

  const handleCloseNotifications = () => {
    setIsNotificationCenterOpen(false);
  };

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.16))]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] max-h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <CalendarIcon className="w-6 h-6 text-brand-500" />
          <span>Agenda</span>
        </h1>
        <div className="flex items-center space-x-4">
          <NotificationBell
            notificationCount={notifications.length}
            onClick={handleOpenNotifications}
          />
          <NotificationCenter
            isOpen={isNotificationCenterOpen}
            onClose={handleCloseNotifications}
            notifications={notifications}
          />
        </div>
      </div>

      <CalendarView
        events={allEvents} // Pass all events
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
        selectedConsultantId={selectedConsultantId}
        consultants={consultants}
        onSelectConsultant={setSelectedConsultantId}
        userRole={user?.role || 'CONSULTOR'}
      />

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        selectedSlot={selectedSlot}
        selectedConsultantId={selectedConsultantId}
        userRole={user?.role || 'CONSULTOR'}
      />
    </div>
  );
};

export default CalendarPage;