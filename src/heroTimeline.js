export const ROUTE_STAGE_COUNT = 4
export const ROUTE_STAGE_SPACING = 6
export const ROUTE_LENGTH = ROUTE_STAGE_COUNT * ROUTE_STAGE_SPACING
export const ROUTE_CRUISE_SPEED = 0.72
export const ROUTE_PAUSE_SECONDS = 10
export const DISC_RADIUS = 9.35

export const wrapRouteDistance = (distance) =>
  ((distance + ROUTE_LENGTH / 2) % ROUTE_LENGTH + ROUTE_LENGTH) %
    ROUTE_LENGTH -
  ROUTE_LENGTH / 2
