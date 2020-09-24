import { Vector } from "./geom/vector.model";
import { Bounds } from "./geom/bounds.model";
// import { TransformHandle } from "../components/transform-tool/transform-handle.model";

export type SelectionState = {
  action: {} | ScaleActionState;
  items: SelectedItemsState;
};

export type ScaleActionState = {
  scaleStartBounds: Bounds;
  // scaleTransformHandle: TransformHandle
};

export type SelectedItemsState = Record<string, SelectedItem>;
export type SelectedItem = {} | MoveActionItemState | ScaleActionItemState;

export type MoveActionItemState = {
  startMoveMouseOffset: Vector;
};

export type ScaleActionItemState = {
  startScaleBoundsOffset: Vector;
  startScaleDimensions: Vector;
};

// export type SelectedItemsState = Record<string, {}> | MoveActionSelectionState | ScaleActionSelectionState;

export type MoveActionSelectionState = Record<string, MoveActionItemState>;
export type ScaleActionSelectionState = Record<string, ScaleActionItemState>;