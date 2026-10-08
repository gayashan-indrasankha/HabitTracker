# Calendar and progress policy

Habit completion dates are `YYYY-MM-DD` calendar values in the user's chosen IANA timezone. They are not timestamps and are not rewritten when the timezone setting changes. Event audit times and task completion times use timezone-aware timestamps.

Fixed schedules are `daily`, `weekdays`, `weekends`, and `custom:XXXXXXX` (Monday through Sunday bits). An eligible fixed occurrence is within the habit's start/end dates, on a selected weekday, and not in the future. A rest day, a pre-start day, and a future day are outside the denominator. Archived habits stay in storage but are omitted from current analytics. A zero-denominator rate is shown as no eligible occurrences rather than 0% adherence.

`weekly:N` is a flexible quota. Any date in the habit's active range can record an eligible completion; no individual calendar day is required. A full calendar week starts on the user's configured week-start day for Today quota display. Weekly attainment is `completed through the cutoff >= min(N, active dates in the full week)`. Completions above the quota remain recorded. Weeks can cross month and year boundaries. Today reads the complete week, including dates from adjacent months.

Calendar-month percentages, daily charts, weekly bars, and the top-habits ranking include **fixed schedules only**. They do not divide a weekly quota across partial month weeks. The monthly tracker shows a flexible habit's weekly count for the displayed cutoff week and its separate raw count of checks within that month. The optional activity streak means consecutive calendar days with at least one eligible completion; it is not an all-habits streak.

Time blocks use local wall-clock start and end times and the user's current timezone. Their weekdays use a Monday-first mask. A per-date exception stores a skip, move, start, or completion without changing later occurrences. Fixed commitments cannot be skipped or moved through the occurrence controls. Recorded tasks and block sessions are separate output counts; a linked task is counted once in the task count.

Limitations: the current habit table stores the latest schedule and start/end range, not schedule-version history. Editing a habit schedule can therefore recalculate historical adherence under the new rule. Block times are local wall-clock values; a future timezone change affects their displayed local interpretation. The planner does not resolve daylight-saving ambiguity for a time that does not exist or occurs twice.
