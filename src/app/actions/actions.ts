import { CardData } from '../card/card';
import { BoundsData } from '../geom/bounds.model';
import { VectorData } from '../geom/vector.model';
import {
  MoveActionSelectionState,
  ScaleActionSelectionState,
} from './selection';

import { RelativePayloadConfig, AbsolutePayload } from 'undomundo';

type WithSelection<T> = { selection: T };

type MovePayloadRest = WithSelection<MoveActionSelectionState>;
type ScalePayloadRest = WithSelection<ScaleActionSelectionState>;
type IdRest = { id: string };
export type PBT = {
  moveCards: RelativePayloadConfig<
    AbsolutePayload<VectorData> & MovePayloadRest
  >;
  scaleCards: RelativePayloadConfig<
    AbsolutePayload<BoundsData> & ScalePayloadRest
  >;
  addCard: RelativePayloadConfig<CardData>;
  removeCards: RelativePayloadConfig<
    {
      card: CardData;
      index: number;
    }[]
  >;
  reorderCard: RelativePayloadConfig<AbsolutePayload<number> & IdRest>;
  updateText: RelativePayloadConfig<AbsolutePayload<string> & IdRest>;
  updateColor: RelativePayloadConfig<{
    selection: Record<string, string>;
    to: string;
  }>;
};

export type MoveCardsHandler = (
  props: Omit<PBT['moveCards']['payload'], 'undo'>
) => void;

export type ScaleCardsHandler = (
  props: Omit<PBT['scaleCards']['payload'], 'undo'>
) => void;

export type ReorderCardHandler = (
  props: Omit<PBT['reorderCard']['payload'], 'undo'>
) => void;
export type UpdateTextHandler = (
  props: Omit<PBT['updateText']['payload'], 'undo'>
) => void;
