import { Bounds } from "./bounds.model";

export interface IShape {
  left(): number;
  right(): number;
  top(): number;
  bottom(): number;
  width(): number;
  height(): number;
  bounds(): Bounds;
}
