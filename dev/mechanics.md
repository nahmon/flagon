# FlagOn Core Mechanics

## Flag Holding Rules

### 1. Claiming a Peak
- Any crew that physically reaches a peak (GPS-verified) and plants a flag becomes the holder
- Holding starts a **7-day protection window**

### 2. During the 7-Day Protection Window
- Only a crew with a **faster ascent time** than the current holder can steal the flag
- Stealing resets the 7-day window for the new holder

### 3. After the 7-Day Window
- The flag remains held (no auto-expiry)
- Any crew that reaches the peak **within 120% of the holder's time** can steal the flag
- Example: holder's record is 3h 00m → any crew finishing in ≤ 3h 36m can take it
- Stealing resets the 7-day window for the new crew

### 4. Summary Table

| Phase | Who can steal? |
|-------|----------------|
| 0–7 days | Faster time only |
| 7+ days | Within 120% of holder's time |
| On steal | New 7-day window begins |

### Design Intent
- Fresh flags are competitive (speed-gated) → rewards strong crews early
- Old flags are accessible (120% threshold) → keeps the map active, lets casual crews participate
- No permanent lockout → any peak is always contestable

---

## Personal Flags (Planned)

In addition to crew flags, individual users can plant a **personal flag** on peaks they've summited.

- Personal flags are non-competitive (no stealing mechanic)
- Used for personal achievement tracking / "I was here" record
- Separate from the crew flag layer on the map

*Decision logged: 2026-05-19*
