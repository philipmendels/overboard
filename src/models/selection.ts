import { Vector } from './geom/vector.model';

interface MoveActionItemState {
  locationRel: Vector;
}

interface ScaleActionItemState {
  locationNorm: Vector;
  dimensionsNorm: Vector;
}

export type StandardSelectionState = Record<string, null>;
export type MoveActionSelectionState = Record<string, MoveActionItemState>;
export type ScaleActionSelectionState = Record<string, ScaleActionItemState>;

export type SelectionState =
  | StandardSelectionState
  | MoveActionSelectionState
  | ScaleActionSelectionState;
