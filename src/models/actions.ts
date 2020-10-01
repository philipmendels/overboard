import { PayloadFromTo } from "use-flexible-undo";
import { CardData } from "./card";
import { BoundsData } from "./geom/bounds.model";
import { VectorData } from "./geom/vector.model";
import { MoveActionSelectionState, ScaleActionSelectionState } from "./selection";

type WithSelection<T> = { selection: T };

export type MovePayloadRest = WithSelection<MoveActionSelectionState>;
export type ScalePayloadRest = WithSelection<ScaleActionSelectionState>;

export interface PBT {
  moveCards: PayloadFromTo<VectorData> & MovePayloadRest;
  scaleCards: PayloadFromTo<BoundsData> & ScalePayloadRest;
  addCard: CardData;
  removeCards: {
    card: CardData;
    index: number;
  }[]
}

export type MoveCardsHandler = (to: VectorData, { selection }: MovePayloadRest) => void;
export type ScaleCardsHandler = (boundsData: BoundsData, { selection }: ScalePayloadRest) => void;
