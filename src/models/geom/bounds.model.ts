import { Orientation } from './direction.enum';
import { Segment } from './segment.model';
import { IShape } from './shape.interface';
import { Vector, VectorData } from './vector.model';
import * as GeomUtil from './geom.util';

export type BoundsData = {
  left: number,
  top: number,
  right: number,
  bottom: number
}

export class Bounds implements IShape {

  public static fromData(data: BoundsData) {
    return new Bounds(data.left, data.top, data.right, data.bottom);
  }

  public static fromRect(location: VectorData, dimensions: VectorData) {
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
    const minLeft = GeomUtil.arrayMin(shapes.map(shape => shape.getLeft()));
    const minTop = GeomUtil.arrayMin(shapes.map(shape => shape.getTop()));
    const maxRight = GeomUtil.arrayMax(shapes.map(shape => shape.getRight()));
    const maxBottom = GeomUtil.arrayMax(shapes.map(shape => shape.getBottom()));
    return new Bounds(minLeft, minTop, maxRight, maxBottom);
  }

  public static fromPoints = (points: VectorData[]): Bounds => {
    if (!points || !points.length) {
      return new Bounds(0, 0, 0, 0);
    }
    const minLeft = GeomUtil.arrayMin(points.map(point => point.x));
    const minTop = GeomUtil.arrayMin(points.map(point => point.y));
    const maxRight = GeomUtil.arrayMax(points.map(point => point.x));
    const maxBottom = GeomUtil.arrayMax(points.map(point => point.y));
    return new Bounds(minLeft, minTop, maxRight, maxBottom);
  }

  constructor(
    public readonly left: number,
    public readonly top: number,
    public readonly right: number,
    public readonly bottom: number) {
  }

  public getBounds(): Bounds {
    return new Bounds(this.left, this.top, this.right, this.bottom);
  }

  public location(): Vector {
    return this.topLeft();
  }
  public dimensions(): Vector {
    return this.topLeft().deltaTo(this.bottomRight());
  }
  public getLeft(): number {
    return this.left;
  }
  public getRight(): number {
    return this.right;
  }
  public getTop(): number {
    return this.top;
  }
  public getBottom(): number {
    return this.bottom;
  }
  public getWidth(): number {
    return this.right - this.left;
  }
  public getHeight(): number {
    return this.bottom - this.top;
  }
  public topLeft(): Vector {
    return new Vector(this.left, this.top);
  }
  public topRight(): Vector {
    return new Vector(this.right, this.top);
  }
  public bottomRight(): Vector {
    return new Vector(this.right, this.bottom);
  }
  public bottomLeft(): Vector {
    return new Vector(this.left, this.bottom);
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
    return !(point.x < this.left || point.x > this.right || point.y < this.top || point.y > this.bottom);
  }
  public intersectsBounds(b: Bounds): boolean {
    return !(this.left > b.right || this.right < b.left || this.top > b.bottom || this.bottom < b.top);
  }
}