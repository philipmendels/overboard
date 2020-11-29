import { Bounds } from './bounds.model';

export interface IShape {
  getLeft(): number;
  getRight(): number;
  getTop(): number;
  getBottom(): number;
  getWidth(): number;
  getHeight(): number;
  getBounds(): Bounds;
}
