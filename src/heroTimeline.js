export const LINEN_TIMELINE = {
  end: 0.47,
  initialMiddleProgress: 0.03,
  spacing: 0.03,
  processEnd: 0.78,
}

export const TRUCK_TIMELINE = {
  middleDeparture: 0.44,
  departureSpacing: 0.035,
  driveEnd: 0.868,
}

const middleLoadingStart =
  (LINEN_TIMELINE.processEnd - LINEN_TIMELINE.initialMiddleProgress) *
  LINEN_TIMELINE.end

export const HERO_STAGE_STARTS = [
  0,
  middleLoadingStart,
  TRUCK_TIMELINE.middleDeparture,
  0.88,
]

export const HERO_TIMELINE_END = 1

export const SMILEY_TIMELINE = {
  start: HERO_STAGE_STARTS[3],
  end: HERO_TIMELINE_END - 0.01,
  stagger: 0.008,
}
