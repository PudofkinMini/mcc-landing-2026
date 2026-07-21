export const LINEN_TIMELINE = {
  end: 0.39,
  initialMiddleProgress: 0.03,
  spacing: 0.03,
  processEnd: 0.78,
}

export const TRUCK_TIMELINE = {
  middleDeparture: 0.37,
  departureSpacing: 0.03,
  driveEnd: 0.9,
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
