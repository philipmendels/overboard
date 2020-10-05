import { PayloadFromTo } from 'use-flexible-undo';
import { CardData } from './card';
import { BoundsData } from './geom/bounds.model';
import { VectorData } from './geom/vector.model';
import {
  MoveActionSelectionState,
  ScaleActionSelectionState,
} from './selection';

type WithSelection<T> = { selection: T };

type MovePayloadRest = WithSelection<MoveActionSelectionState>;
type ScalePayloadRest = WithSelection<ScaleActionSelectionState>;
type ReorderPayloadRest = { id: string };
export interface PBT {
  moveCards: PayloadFromTo<VectorData> & MovePayloadRest;
  scaleCards: PayloadFromTo<BoundsData> & ScalePayloadRest;
  addCard: CardData;
  removeCards: {
    card: CardData;
    index: number;
  }[];
  reorderCard: PayloadFromTo<number> & ReorderPayloadRest;
}

export type MoveCardsHandler = (to: VectorData, rest: MovePayloadRest) => void;

export type ScaleCardsHandler = (
  boundsData: BoundsData,
  rest: ScalePayloadRest
) => void;

export type ReorderCardHandler = (
  toIndex: number,
  rest: ReorderPayloadRest
) => void;
