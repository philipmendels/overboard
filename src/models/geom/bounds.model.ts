import { Orientation } from './direction.enum';
import { Segment } from './segment.model';
import { IShape } from './shape.interface';
import { Vector } from './vector.model';
import * as GeomUtil from './geom.util';

export type BoundsData = {
  left: number,
  top: number,
  right: number,
  bottom: number
}

export class Bounds implements IShape {

  public static fromRect(location: Vector, dimensions: Vector) {
    return new Bounds(
      location.x,
      location.y,
      location.x + dimensions.x,
      location.y + dimensions.y
    )
  }

  public static fromShapes = (shapes: IShape[]): Bounds => {
    if (!shapes || !shapes.length) {
      return new Bounds(0, 0, 0, 0);
    }
    const minLeft = GeomUtil.arrayMin(shapes.map(shape => shape.left()));
    const minTop = GeomUtil.arrayMin(shapes.map(shape => shape.top()));
    const maxRight = GeomUtil.arrayMax(shapes.map(shape => shape.right()));
    const maxBottom = GeomUtil.arrayMax(shapes.map(shape => shape.bottom()));
    return new Bounds(minLeft, minTop, maxRight, maxBottom);
  }

  constructor(
    // tslint:disable-next-line:variable-name
    private readonly _left: number,
    // tslint:disable-next-line:variable-name
    private readonly _top: number,
    // tslint:disable-next-line:variable-name
    private readonly _right: number,
    // tslint:disable-next-line:variable-name
    private readonly _bottom: number) {
  }

  public bounds(): Bounds {
    return new Bounds(this._left, this._top, this._right, this._bottom);
  }

  public location(): Vector {
    return this.topLeft();
  }
  public dimensions(): Vector {
    return this.topLeft().deltaTo(this.bottomRight());
  }
  public left(): number {
    return this._left;
  }
  public right(): number {
    return this._right;
  }
  public top(): number {
    return this._top;
  }
  public bottom(): number {
    return this._bottom;
  }
  public width(): number {
    return this._right - this._left;
  }
  public height(): number {
    return this._bottom - this._top;
  }
  public topLeft(): Vector {
    return new Vector(this._left, this._top);
  }
  public topRight(): Vector {
    return new Vector(this._right, this._top);
  }
  public bottomRight(): Vector {
    return new Vector(this._right, this._bottom);
  }
  public bottomLeft(): Vector {
    return new Vector(this._left, this._bottom);
  }
  public leftEdge(): Segment {
    return new Segment(this.topLeft(), this.bottomLeft());
  }
  public rightEdge(): Segment {
    return new Segment(this.topRight(), this.bottomRight());
  }
  public bottomEdge(): Segment {
    return new Segment(this.bottomLeft(), this.bottomRight());
  }
  public topEdge(): Segment {
    return new Segment(this.topLeft(), this.topRight());
  }
  public edges(orientation: Orientation): Segment[] {
    const edges: Segment[] = [];
    if (orientation === Orientation.ALL || orientation === Orientation.VERTICAL) {
      edges.push(this.leftEdge(), this.rightEdge());
    }
    if (orientation === Orientation.ALL || orientation === Orientation.HORIZONTAL) {
      edges.push(this.topEdge(), this.bottomEdge());
    }
    return edges;
  }
  public containsPoint(point: Vector): boolean {
    // TODO: use GeomUtil.equals?
    return !(point.x < this._left || point.x > this._right || point.y < this._top || point.y > this._bottom);
  }
  public intersectsBounds(b: Bounds): boolean {
    return !(this._left > b._right || this._right < b._left || this._top > b._bottom || this._bottom < b._top);
  }
}