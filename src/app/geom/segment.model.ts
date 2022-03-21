import { Bounds } from './bounds.model';
import * as GeomUtil from './geom.util';
import { ILine } from './line.interface';
import { Line } from './line.model';
import { LineG } from './lineG.model';
import { IShape } from './shape.interface';
import { Vector } from './vector.model';

export class Segment implements ILine, IShape {
  constructor(public p1: Vector, public p2: Vector) {}

  public delta(): Vector {
    return this.p1.deltaTo(this.p2);
  }
  public dx(): number {
    return this.p2.x - this.p1.x;
  }
  public dy(): number {
    return this.p2.y - this.p1.y;
  }
  public isHorizontal(): boolean {
    return GeomUtil.equals(this.dy(), 0);
  }
  public isVertical(): boolean {
    return GeomUtil.equals(this.dx(), 0);
  }
  public reverse(): Segment {
    return new Segment(this.p2, this.p1);
  }
  public unit(): Vector {
    const delta = this.delta();
    return delta.divide(delta.dist());
  }
  public dist(): number {
    return this.delta().dist();
  }
  public slope(): number {
    return this.delta().slope();
  }
  public constant(): number {
    if (this.isVertical()) {
      return this.p1.x;
    } else if (this.isHorizontal()) {
      return this.p1.y;
    }
    return this.p1.y - this.p1.x * this.slope();
  }
  public line(): Line {
    return new Line(this.slope(), this.constant());
  }
  public lineG(normalize = true): LineG {
    let delta;
    if (normalize) {
      delta = this.unit();
    } else {
      delta = this.delta();
    }
    const c = delta.x * this.p1.y - delta.y * this.p1.x;
    return new LineG(delta.y, -delta.x, c);
  }
  public angleRad(): number {
    return this.delta().angleRad();
  }
  public angleDeg(): number {
    return this.delta().angleDeg();
  }
  public containsPoint(point: Vector): boolean {
    if (!this.line().containsPoint(point)) {
      return false;
    }
    return this.getBounds().containsPoint(point);
  }
  public closestPoint(point: Vector): Vector {
    const vectorA = this.p1.deltaTo(point);
    const vectorB = this.delta();
    let u = vectorA.projectionFactorOn(vectorB);
    if (u > 1) {
      u = 1;
    } else if (u < 0) {
      u = 0;
    }
    return this.p1.add(vectorB.multiply(u));
  }
  public lerp(amount: number): Vector {
    const delta = this.delta().multiply(amount);
    return this.p1.add(delta);
  }
  public center(): Vector {
    return this.lerp(0.5);
  }
  // public intersectLine(line:Line) {

  // }
  // public intersectSegment(line:Line) {

  // }
  public getLeft(): number {
    return Math.min(this.p1.x, this.p2.x);
  }
  public getRight(): number {
    return Math.max(this.p1.x, this.p2.x);
  }
  public getTop(): number {
    return Math.min(this.p1.y, this.p2.y);
  }
  public getBottom(): number {
    return Math.max(this.p1.y, this.p2.y);
  }
  public getWidth(): number {
    return this.getRight() - this.getLeft();
  }
  public getHeight(): number {
    return this.getBottom() - this.getTop();
  }
  public getBounds(): Bounds {
    return new Bounds(
      this.getLeft(),
      this.getTop(),
      this.getRight(),
      this.getBottom()
    );
  }
}
