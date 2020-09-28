import { Vector } from "./geom/vector.model";

export type SelectedItemsState = Record<string, SelectedItem>;
export type SelectedItem = {} | MoveActionItemState | ScaleActionItemState;

export type MoveActionItemState = {
  locationRel: Vector;
};

export type ScaleActionItemState = {
  locationNorm: Vector;
  dimensionsNorm: Vector;
};

export type MoveActionSelectionState = Record<string, MoveActionItemState>;
export type ScaleActionSelectionState = Record<string, ScaleActionItemState>;