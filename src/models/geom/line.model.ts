import * as GeomUtil from "./geom.util";
import { ILine } from "./line.interface";
import { LineG } from "./lineG.model";
import { Vector } from "./vector.model";

export class Line implements ILine {
  // slope-intercept notation of a linear equation
  // y = ax + b, (or x = b for vertical line)
  // a is slope, is +/- 0 for horizontal line, is +/- Infinity for vertical line
  // b is constant is y-intercept, (or x-intercept for vertical line)
  constructor(
    // tslint:disable-next-line:variable-name
    readonly _slope: number,
    // tslint:disable-next-line:variable-name
    readonly _constant: number,
  ) {
    if (_slope === undefined) {
      this._slope = Infinity;
    }
  }
  public angleDeg(): number {
    return GeomUtil.slopeToAngleDeg(this._slope);
  }
  public angleRad(): number {
    return GeomUtil.slopeToAngleRad(this._slope);
  }
  public slope(): number {
    return this._slope;
  }
  public isVertical(): boolean {
    return GeomUtil.isVerticalSlope(this._slope);
  }
  public isHorizontal(): boolean {
    return GeomUtil.isHorizontalSlope(this._slope);
  }
  public unit(): Vector {
    return Vector.fromSlope(this._slope);
  }
  public constant(): number {
    return this._constant;
  }
  public containsPoint(point: Vector): boolean {
    if (this.isVertical()) {
      return GeomUtil.equals(point.x, this._constant);
    } else if (this.isHorizontal()) {
      return GeomUtil.equals(point.y, this._constant);
    }
    const y = this._slope * point.x + this._constant;
    return GeomUtil.equals(y, point.y);
  }
  public lineG(): LineG {
    const unit = this.unit();
    const a = unit.y;
    const b = -unit.x;
    let c;
    if (this.isVertical()) {
      c = -this._constant * a;
    }
    c = -this._constant * b;
    return new LineG(a, b, c);
  }
  public intersectLine(line: Line): Vector | undefined {
    // ax + c = bx + d
    const a = this.slope();
    const b = line.slope();
    const c = this.constant();
    const d = line.constant();
    let x: number;
    let y: number;
    if (this.isVertical() && line.isVertical()) {
      return undefined;
    } else if (this.isVertical()) {
      x = c;
      y = b * x + d;
      return new Vector(x, y);
    } else if (line.isVertical()) {
      x = d;
      y = a * x + c;
      return new Vector(x, y);
    }
    if (GeomUtil.equals(a, b)) {
      // parallel or identical
      return undefined;
    }
    y = (a * d - c * b) / (a - b);
    x = (d - c) / (a - b);
    return new Vector(x, y);
  }
  public pointAtIntercept(): Vector {
    if (this.isVertical()) {
      return new Vector(this._constant, 0);
    }
    return new Vector(0, this._constant);
  }
  public closestPoint(point: Vector): Vector {
    const p = this.pointAtIntercept();
    const vectorA = p.deltaTo(point);
    const vectorB = this.unit();
    const factor = vectorA.projectionFactorOn(vectorB);
    return p.add(vectorB.multiply(factor));
  }
}
