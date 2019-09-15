import { Vector } from './vector.model';

export interface ILine {
  constant(): number;
  slope(): number;
  isHorizontal(): boolean;
  isVertical(): boolean;
  angleRad(): number;
  angleDeg(): number;
  unit(): Vector;
}