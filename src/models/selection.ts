import { Entry, ValueOf } from '../util/util';
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

export interface SelectionProps {
  selection: SelectionState;
  clearSelection: () => void;
  mapSelection: <O2 extends SelectionState>(
    mapFn: (entry: Entry<SelectionState>) => ValueOf<O2>
  ) => void;
  select: (ids: string[]) => void;
  deselect: (ids: string[]) => void;
}
