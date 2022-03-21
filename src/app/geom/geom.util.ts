const TWO_PI: number = 2 * Math.PI;
export const HALF_PI: number = 0.5 * Math.PI;

export const equals = (num: number, num2: number): boolean => {
  return Math.abs(num - num2) < Number.EPSILON;
};
export const normalizeRad = (rad: number) => {
  return rad - TWO_PI * Math.floor((rad + Math.PI) / TWO_PI);
};
export const normalizeDeg = (deg: number) => {
  return deg - 360 * Math.floor((deg + 180) / 360);
};
export const degRadFactor = Math.PI / 180;
export const degToRad = (deg: number): number => {
  return deg * degRadFactor;
};
export const radDegFactor = 180 / Math.PI;
export const radToDeg = (rad: number): number => {
  return rad * radDegFactor;
};
export const angleDegToSlope = (deg: number, fixError = true) => {
  if (fixError) {
    deg = normalizeDeg(deg);
    if (equals(Math.abs(deg), 90)) {
      return Math.sign(deg) * Infinity;
    } else if (equals(deg, 180)) {
      // TODO: is signed zero safe to use? Or better keep a very small number?
      return -0;
    }
  }
  const rad = degToRad(deg);
  return angleRadToSlope(rad, false);
};
export const angleRadToSlope = (rad: number, fixError = true): number => {
  if (fixError) {
    rad = normalizeRad(rad);
    if (equals(Math.abs(rad), HALF_PI)) {
      return Math.sign(rad) * Infinity;
    } else if (equals(rad, Math.PI)) {
      // TODO: is signed zero safe to use? Or better keep a very small number?
      return -0;
    }
  }
  return Math.tan(rad);
};
export const isVerticalSlope = (slope: number): boolean => {
  return slope === undefined || slope === Infinity || slope === -Infinity;
};
export const isHorizontalSlope = (slope: number): boolean => {
  return equals(slope, 0);
};
export const slopeToAngleRad = (slope: number): number => {
  if (slope === undefined) {
    slope = Infinity;
  }
  return Math.tan(slope);
};
export const slopeToAngleDeg = (slope: number): number => {
  return radToDeg(slopeToAngleRad(slope));
};
export const arrayMin = (array: number[]): number => {
  return Math.min(...array);
};
export const arrayMax = (array: number[]): number => {
  return Math.max(...array);
};
