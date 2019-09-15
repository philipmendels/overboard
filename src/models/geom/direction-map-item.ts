import { Vector } from "./vector.model";
import { Direction, DirectionCompass, Orientation } from "./direction.enum";
import * as GeomUtil from './geom.util';

export class DirectionMapItem {
  public readonly vector: Vector;
  public readonly vectorRounded: Vector;
  public readonly angleRad: number;
  constructor(
    readonly direction: Direction,
    readonly directionCompass: DirectionCompass,
    readonly orientation: Orientation,
    readonly angleDeg: number
  ) {
    this.vector = Vector.fromAngleDeg(angleDeg);
    this.vectorRounded = this.vector.round();
    this.angleRad = GeomUtil.degToRad(angleDeg);
  }
}