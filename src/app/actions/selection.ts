import { Vector } from '../geom/vector.model';

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

export interface SelectionProps {
  selection: StandardSelectionState;
  clearSelection: () => void;
  select: (ids: string[]) => void;
  deselect: (ids: string[]) => void;
  updateSelection: (s: StandardSelectionState) => void;
}
