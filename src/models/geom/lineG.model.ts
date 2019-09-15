import * as GeomUtil from "./geom.util";
import { ILine } from "./line.interface";
import { Line } from "./line.model";
import { Vector } from "./vector.model";

export class LineG implements ILine {
  // general notation of a linear equation:
  // ax + by + c = 0
  constructor(
    public a: number,
    public b: number,
    public c: number
  ) { }

  public angleDeg(): number {
    return GeomUtil.slopeToAngleDeg(this.slope());
  }
  public angleRad(): number {
    return GeomUtil.slopeToAngleRad(this.slope());
  }
  public slope(): number {
    return this.delta().slope();
  }
  public delta(): Vector {
    return new Vector(-this.b, this.a);
  }
  public unit(): Vector {
    return this.delta().unit();
  }
  public normalize(): LineG {
    const dist = this.delta().dist();
    return new LineG(this.a / dist, this.b / dist, this.c / dist);
  }
  public isVertical(): boolean {
    return GeomUtil.equals(this.b, 0);
  }
  public isHorizontal(): boolean {
    return GeomUtil.equals(this.a, 0);
  }
  public constant(): number {
    if (this.isVertical()) {
      return (-this.c) / this.a;
    }
    return (-this.c) / this.b;
  }
  public line(): Line {
    return new Line(this.slope(), this.constant());
  }
  public intersectLine(line: LineG): Vector | undefined {
    // using homogeneous coordinates
    const l1 = this;
    const l2 = line;
    const z: number = l1.a * l2.b - l2.a * l1.b;
    if (GeomUtil.equals(z, 0)) {
      return undefined;
    }
    const x = (l1.b * l2.c - l2.b * l1.c) / z;
    const y = (l2.a * l1.c - l1.a * l2.c) / z;
    return new Vector(x, y);
  }
  public equals(line: LineG): boolean {
    return this.unit().equals(line.unit());
  }
}