// Check if we can use freeze
    // Get week of this date
    if getWeek(date) == current_week:
      if freezes_used < 1:
        // Check if the next chronological day is logged (which is previous in our reverse iteration)
        // Actually, we need to look ahead in reverse (which is yesterday chronologically)
        // If yesterday was logged, we can use freeze?
        // No, the rule says: "allows 1 missed day per week without breaking streak if following day is logged"
        // Following day = tomorrow. If tomorrow is logged, then missing today is okay?
        // That doesn't make sense for a streak (which looks backward).
        // Interpretation: If you miss Monday but log Tuesday, the streak continues through Monday using the freeze.
        
        // So in reverse iteration:
        // We are at Monday (missing). Tuesday (which we already processed in reverse) was logged.
        // So we can apply freeze to Monday.
        if previous_date_in_iteration_was_logged: // which is tomorrow chronologically
          streak++
          freezes_used++
          continue
    break

This makes sense.

- Compliance rate: days where all critical variables (weight, calories, sleep) are logged / total days
- Data density: actual entries / expected entries (expected = days since account creation capped at 90, or just 90? "accounting for account creation date" - so if account created 30 days ago, expected is 30, not 90)

- Points: (streak_length * 10) + (compliance_rate * 100)
- Levels: Bronze (7), Silver (30), Gold (90), Platinum (180)
- Next milestone: next threshold - current_streak

Database queries:
I need to query DailyLog table. I'll assume a SQL client `sql` from '@vercel/postgres' or similar.

Code structure: