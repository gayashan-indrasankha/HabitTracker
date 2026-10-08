import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export function scheduledInstant(date: string, time: string, timezone: string): Date | null {
  const wallTime = `${date}T${time}:00`;
  const instant = fromZonedTime(wallTime, timezone);
  if (Number.isNaN(instant.getTime())) return null;
  const local = toZonedTime(instant, timezone);
  const reconstructed = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}T${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}:00`;
  if (reconstructed !== wallTime) return null;
  // A repeated wall-clock time represents two instants; reject it rather than guess.
  const hourLater = toZonedTime(new Date(instant.getTime() + 60 * 60_000), timezone);
  const hourEarlier = toZonedTime(new Date(instant.getTime() - 60 * 60_000), timezone);
  const sameWall = (value: Date) =>
    value.getFullYear() === local.getFullYear() &&
    value.getMonth() === local.getMonth() &&
    value.getDate() === local.getDate() &&
    value.getHours() === local.getHours() &&
    value.getMinutes() === local.getMinutes();
  if (sameWall(hourLater) || sameWall(hourEarlier)) return null;
  return instant;
}

export function statusTimeError(
  status: 'started' | 'completed',
  date: string,
  start: string,
  end: string,
  timezone: string,
  now: Date,
): string | null {
  const startInstant = scheduledInstant(date, start, timezone);
  const endInstant = scheduledInstant(date, end, timezone);
  if (!startInstant || !endInstant || endInstant <= startInstant)
    return 'This scheduled time is invalid or ambiguous in your timezone.';
  if (now < (status === 'started' ? startInstant : endInstant))
    return status === 'started'
      ? 'This session has not started yet.'
      : 'This session has not finished yet.';
  return null;
}
