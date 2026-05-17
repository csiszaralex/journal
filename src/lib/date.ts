import { formatInTimeZone } from 'date-fns-tz';

export const APP_TZ = 'Europe/Budapest';

export function todayInAppTZ(): string {
  return formatInTimeZone(new Date(), APP_TZ, 'yyyy-MM-dd');
}
