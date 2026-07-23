export const LINEN_TIMELINE = {
  end: 0.5,
  initialMiddleProgress: 0.03,
  spacing: 0.03,
  processEnd: 0.78,
}

export const LOADED_TRUCKS_PROGRESS = LINEN_TIMELINE.end

export const TRUCK_TIMELINE = {
  middleDeparture: 0.56,
  departureSpacing: 0.02,
  driveEnd: 0.89,
}

export const HERO_STAGE_STARTS = [
  0,
  LOADED_TRUCKS_PROGRESS,
  TRUCK_TIMELINE.middleDeparture,
]

export const HERO_TIMELINE_END = 1
export const HERO_SNAP_POINTS = [
  0,
  LOADED_TRUCKS_PROGRESS,
  HERO_TIMELINE_END,
]

export const SMILEY_TIMELINE = {
  start: 0.92,
  end: HERO_TIMELINE_END - 0.01,
  stagger: 0.008,
}
