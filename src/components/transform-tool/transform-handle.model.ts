import { Direction, Orientation } from "../../models/geom/direction.enum";
import { DirectionMapItem } from "../../models/geom/direction-map-item";

export class TransformHandle {
  constructor(
    readonly data: DirectionMapItem,
  ) { }

  public getSize(): number {
    return 10;
  }

  public getStyleLeft(): string {
    return `calc(${this.data.vectorRounded.x * 50 + 50}% - ${0.5 * this.getSize()}px)`;
  }
  public getStyleTop(): string {
    return `calc(${this.data.vectorRounded.y * 50 + 50}% - ${0.5 * this.getSize()}px)`;
  }
  public getStyleCursor(): string {
    return this.data.directionCompass.toLowerCase() + '-resize';
  }
  public isHorizontal(): boolean {
    return this.data.orientation === Orientation.HORIZONTAL;
  }
  public isVertical(): boolean {
    return this.data.orientation === Orientation.VERTICAL;
  }
  public isDiagonal(): boolean {
    return this.data.orientation === Orientation.DIAGONAL;
  }
  public isOnLeftEdge(): boolean {
    return this.data.vectorRounded.x === -1;
  }
  public isOnRightEdge(): boolean {
    return this.data.vectorRounded.x === 1;
  }
  public isOnTopEdge(): boolean {
    return this.data.vectorRounded.y === -1;
  }
  public isOnBottomEdge(): boolean {
    return this.data.vectorRounded.y === 1;
  }
  public isOnTopLefDiagonal(): boolean {
    return this.data.direction === Direction.TOPLEFT || this.data.direction === Direction.BOTTOMRIGHT;
  }
  public isOnTopRightDiagonal(): boolean {
    return this.data.direction === Direction.TOPRIGHT || this.data.direction === Direction.BOTTOMLEFT;
  }
}