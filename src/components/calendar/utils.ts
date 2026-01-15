export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const getWeekDays = (date: Date): Date[] => {
  const days = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Go to Sunday

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

export const getMonthDays = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = [];

  // Days from previous month
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
  for (let i = 0; i < startDayOfWeek; i++) {
    const day = new Date(year, month, 1 - (startDayOfWeek - i));
    days.push(day);
  }

  // Days of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    days.push(day);
  }

  // Days from next month to fill the last week
  const lastDayOfMonth = new Date(year, month, daysInMonth);
  const endDayOfWeek = lastDayOfMonth.getDay();
  for (let i = 1; i < (7 - endDayOfWeek); i++) {
    const day = new Date(year, month + 1, i);
    days.push(day);
  }

  return days;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};