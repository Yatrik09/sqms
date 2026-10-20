/**
 * Utility functions for user name sanitization and real-time live clock estimations.
 */

/**
 * Strips all bracketed role mentions (e.g. "(Customer)", "(Branch Manager)", "(Technician)")
 * from any displayed name.
 */
export const cleanDisplayName = (name?: string | null): string => {
  if (!name) return 'User';
  // Remove any parenthetical text like (Customer), (Branch Manager), (Floor Tech), etc.
  return name.replace(/\s*\([^)]*\)/g, '').trim();
};

/**
 * Format a Date object or timestamp into 12-hour format with AM/PM (e.g. "03:40 PM")
 */
export const formatClockTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Calculates live estimated turn time from current time and wait minutes
 * e.g., if current time is 3:25 PM and wait is 15 mins -> "3:40 PM"
 */
export const calculateTurnTime = (currentTime: Date, waitMinutes: number): string => {
  const safeMinutes = Math.max(0, Number(waitMinutes) || 0);
  const target = new Date(currentTime.getTime() + safeMinutes * 60 * 1000);
  return formatClockTime(target);
};

/**
 * Calculates live estimated completion time from current time and duration minutes
 * e.g., if current time is 3:25 PM and total duration is 60 mins -> "4:25 PM"
 */
export const calculateCompletionTime = (currentTime: Date, durationMinutes: number): string => {
  const safeMinutes = Math.max(0, Number(durationMinutes) || 0);
  const target = new Date(currentTime.getTime() + safeMinutes * 60 * 1000);
  return formatClockTime(target);
};

/**
 * Human friendly duration formatting (e.g., "15 mins", "1 hour", "1 hr 15 mins")
 */
export const formatDurationHuman = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (safeMinutes < 60) {
    return `${safeMinutes} min${safeMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (remaining === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${hours}h ${remaining}m`;
};
