// East African Time (EAT) utilities
// EAT is UTC+3

export const EAT_TIMEZONE = 'Africa/Nairobi' // East African Time

/**
 * Get current time in East African Time
 */
export function getCurrentEATTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: EAT_TIMEZONE }))
}

/**
 * Format date to EAT timezone
 */
export function formatToEAT(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString("en-US", {
    timeZone: EAT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Format date to EAT timezone for display
 */
export function formatToEATDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString("en-US", {
    timeZone: EAT_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date to EAT timezone for date input
 */
export function formatToEATDateInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString("en-CA", { timeZone: EAT_TIMEZONE }) // YYYY-MM-DD format
}

/**
 * Format time to EAT timezone for time input
 */
export function formatToEATTimeInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toTimeString().slice(0, 5) // HH:MM format
}

/**
 * Check if an appointment is overdue
 */
export function isAppointmentOverdue(scheduledTime: string, status: string): boolean {
  // Only check overdue for scheduled, confirmed, or arrived appointments
  if (!['scheduled', 'confirmed', 'arrived'].includes(status)) {
    return false
  }

  const now = getCurrentEATTime()
  const appointmentTime = new Date(scheduledTime)
  
  // Consider appointment overdue if it's past the scheduled time by more than 15 minutes
  const overdueThreshold = new Date(appointmentTime.getTime() + 15 * 60 * 1000) // 15 minutes
  
  return now > overdueThreshold
}

/**
 * Get overdue duration in minutes
 */
export function getOverdueDuration(scheduledTime: string): number {
  const now = getCurrentEATTime()
  const appointmentTime = new Date(scheduledTime)
  const diffMs = now.getTime() - appointmentTime.getTime()
  return Math.floor(diffMs / (1000 * 60)) // Convert to minutes
}

/**
 * Format overdue duration for display
 */
export function formatOverdueDuration(scheduledTime: string): string {
  const minutes = getOverdueDuration(scheduledTime)
  
  if (minutes < 60) {
    return `${minutes}m overdue`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m overdue`
  }
}
