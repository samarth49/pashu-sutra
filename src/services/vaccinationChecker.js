/**
 * Vaccination Reminder Checker
 * Checks upcoming vaccinations and triggers SMS/WhatsApp reminders
 * at 2 days, 1 day, and same day before due date.
 *
 * Uses AsyncStorage to track sent reminders and avoid duplicates.
 */

import { getVaccinations, isReminderSent, markReminderSent } from './databaseService';
import { sendVaccinationReminder } from './notificationService';

/**
 * Parse date string in DD/MM/YYYY format to a Date object.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate the difference in days between two dates (ignoring time).
 */
function daysDifference(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Check all scheduled vaccinations and send reminders for those
 * due in 2 days, 1 day, or today. Skips already-sent reminders.
 *
 * @returns {Promise<Array>} List of reminders that were sent.
 */
export async function checkVaccinationReminders() {
  try {
    const vaccinations = await getVaccinations();
    const today = new Date();
    const sentReminders = [];

    for (const vac of vaccinations) {
      // Only check scheduled vaccinations
      if (vac.status !== 'scheduled') continue;

      const dueDate = parseDate(vac.date);
      if (!dueDate) continue;

      const daysUntil = daysDifference(today, dueDate);

      // Check for 2 days, 1 day, and same day reminders
      const checkPoints = [2, 1, 0];

      for (const checkpoint of checkPoints) {
        if (daysUntil === checkpoint) {
          const reminderKey = `${vac.id}_${checkpoint}days`;

          // Skip if already sent
          const alreadySent = await isReminderSent(reminderKey);
          if (alreadySent) continue;

          // Send the reminder
          console.log(
            `[VacChecker] Sending ${checkpoint}-day reminder for "${vac.vaccineName}" (${vac.rfidTag || 'N/A'})`
          );

          const result = await sendVaccinationReminder(
            vac.rfidTag || vac.animalId || 'N/A',
            vac.vaccineName,
            vac.date,
            checkpoint
          );

          if (result.success) {
            await markReminderSent(reminderKey);
            sentReminders.push({
              vaccineName: vac.vaccineName,
              rfidTag: vac.rfidTag,
              daysUntil: checkpoint,
              date: vac.date,
            });
          }
        }
      }
    }

    if (sentReminders.length > 0) {
      console.log(`[VacChecker] Sent ${sentReminders.length} reminder(s)`);
    } else {
      console.log('[VacChecker] No reminders due right now');
    }

    return sentReminders;
  } catch (error) {
    console.error('[VacChecker] Error checking reminders:', error);
    return [];
  }
}
