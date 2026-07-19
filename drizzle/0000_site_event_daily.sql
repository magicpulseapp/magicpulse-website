CREATE TABLE IF NOT EXISTS site_event_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  context TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, event, context)
);

CREATE INDEX IF NOT EXISTS site_event_daily_day_idx
  ON site_event_daily (day DESC);
