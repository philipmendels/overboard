import * as GeomUtil from "./geom.util";

export type VectorData = {
  x: number;
  y: number;
};

export const V = (data: VectorData) => new Vector(data.x, data.y);

export class Vector {
  public static fromData(data: VectorData): Vector {
    return new Vector(data.x, data.y);
  }

  public static fromAngleDeg = (
    deg: number,
    fixError: boolean = true
  ): Vector => {
    if (fixError) {
      deg = GeomUtil.normalizeDeg(deg);
      if (GeomUtil.equals(Math.abs(deg), 90)) {
        return new Vector(0, Math.sign(deg));
      } else if (GeomUtil.equals(deg, 180)) {
        return new Vector(-1, 0);
      }
    }
    const rad = GeomUtil.degToRad(deg);
    return Vector.fromAngleRad(rad, false);
  };

  public static fromAngleRad = (
    rad: number,
    fixError: boolean = true
  ): Vector => {
    if (fixError) {
      rad = GeomUtil.normalizeRad(rad);
      if (GeomUtil.equals(Math.abs(rad), GeomUtil.HALF_PI)) {
        return new Vector(0, Math.sign(rad));
      } else if (GeomUtil.equals(rad, Math.PI)) {
        return new Vector(-1, 0);
      }
    }
    return new Vector(Math.cos(rad), Math.sin(rad));
  };

  public static fromSlope = (slope: number): Vector => {
    if (slope === undefined || slope === Infinity) {
      return new Vector(0, 1);
    } else if (slope === -Infinity) {
      return new Vector(0, -1);
    }
    return new Vector(1, 1 * slope).normalize();
  };

  constructor(readonly x: number, readonly y: number) {}

  public toData(): VectorData {
    return {
      x: this.x,
      y: this.y
    };
  }

  public clone(): Vector {
    return Vector.fromData(this);
  }
  // public toSegment(): Segment {
  //     return new Segment(new Vector(0, 0), this);
  // }
  public dist(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  public magnitude(): number {
    return this.dist();
  }
  public deltaTo(v2: Vector): Vector {
    return new Vector(v2.x - this.x, v2.y - this.y);
  }
  public subtract(v2: Vector): Vector {
    return v2.deltaTo(this);
  }
  public distToPoint(point: Vector): number {
    return this.deltaTo(point).dist();
  }
  public add(v2: Vector): Vector {
    return new Vector(this.x + v2.x, this.y + v2.y);
  }
  public multiply(amount: number): Vector {
    return new Vector(this.x * amount, this.y * amount);
  }
  public divide(amount: number): Vector {
    return new Vector(this.x / amount, this.y / amount);
  }
  public addLength(amount: number) {
    const length = this.dist();
    const factor = (length + amount) / length;
    return this.multiply(factor);
  }
  public subtractLength(amount: number) {
    return this.addLength(-amount);
  }
  public abs(): Vector {
    return new Vector(Math.abs(this.x), Math.abs(this.y));
  }
  public round(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }
  public dot(v2: Vector): number {
    return this.x * v2.x + this.y * v2.y;
  }
  public perpDot(v2: Vector): number {
    return this.x * v2.y - this.y * v2.x;
  }
  public perpendicularCW(): Vector {
    return new Vector(this.y, -this.x);
  }
  public perpendicularCCW(): Vector {
    return new Vector(-this.y, this.x);
  }
  public cross(vector: Vector): Vector {
    const x = this.x * vector.y - this.y * vector.x;
    const y = this.y * vector.x + this.x * vector.y;
    return new Vector(x, y);
  }
  public multiplyV(vector: Vector): Vector {
    return this.cross(vector);
  }
  public rotateV(v: Vector): Vector {
    const x = this.x * v.x - this.y * v.y;
    const y = this.y * v.x + this.x * v.y;
    return new Vector(x, y);
  }
  // public rotateRad(rad: number): Vector {
  //   return this.rotateV(GeomUtil.angleRadToVector(rad));
  // }
  // public rotateDeg(deg: number): Vector {
  //   return this.rotateV(GeomUtil.angleDegToVector(deg));
  // }
  public reverse(): Vector {
    return this.multiply(-1);
  }
  public reverseY(): Vector {
    return new Vector(this.x, -this.y);
  }
  public reverseX(): Vector {
    return new Vector(-this.x, this.y);
  }
  public unit(): Vector {
    return this.divide(this.dist());
  }
  public normalize(): Vector {
    return this.unit();
  }
  public projectionFactorOn(v2: Vector): number {
    return this.dot(v2) / v2.dot(v2);
  }
  public projectOn(v2: Vector): Vector {
    const factor = this.projectionFactorOn(v2);
    return v2.multiply(factor);
  }
  public angleRad(): number {
    return Math.atan2(this.y, this.x);
  }
  public angleDeg(): number {
    return GeomUtil.radToDeg(this.angleRad());
  }
  public angleBetweenRad(v2: Vector): number {
    const magnitudeProduct = this.dist() * v2.dist();
    return Math.acos(this.dot(v2) / magnitudeProduct);
  }
  public angleBetweenDeg(v2: Vector): number {
    return GeomUtil.radToDeg(this.angleBetweenRad(v2));
  }
  public isHorizontal(): boolean {
    return GeomUtil.equals(this.y, 0);
  }
  public isVertical(): boolean {
    return GeomUtil.equals(this.x, 0);
  }
  public slope(): number {
    if (this.isHorizontal()) {
      // TODO: is signed zero safe to use? Or better keep a very small number?
      return Math.sign(this.x) * 0;
    } else if (this.isVertical()) {
      return Math.sign(this.y) * Infinity;
    }
    return this.y / this.x;
  }
  public equals(v2: Vector): boolean {
    return GeomUtil.equals(this.x, v2.x) && GeomUtil.equals(this.y, v2.y);
  }
}
