import { format } from "date-fns"

export interface OperatingHours {
    isOpen: boolean;
    open: string;
    close: string;
}

export interface WeeklyHours {
    [key: string]: OperatingHours;
}

/**
 * Validates if the current time is within the operating hours for a given day.
 * @param hours The weekly schedule
 * @param date The date to check against (defaults to now)
 */
export function isWithinOperatingHours(hours: WeeklyHours, date: Date = new Date()): { isValid: boolean; reason?: string } {
    if (!hours) return { isValid: true }; // If no hours set, assume open

    const dayName = format(date, "EEEE").toLowerCase();
    const daySchedule = hours[dayName];

    if (!daySchedule || !daySchedule.isOpen) {
        return { isValid: false, reason: `The workplace is closed on ${format(date, "EEEE")}.` };
    }

    const currentTime = format(date, "HH:mm");

    // Simple string comparison for "HH:mm" works fine for daily hours
    if (currentTime < daySchedule.open) {
        return {
            isValid: false,
            reason: `The workplace doesn't open until ${formatTime(daySchedule.open)}.`
        };
    }

    if (currentTime > daySchedule.close) {
        return {
            isValid: false,
            reason: `The workplace closed at ${formatTime(daySchedule.close)}.`
        };
    }

    return { isValid: true };
}

function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}
