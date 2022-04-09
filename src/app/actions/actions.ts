import { CardData } from '../card/card';
import { BoundsData } from '../geom/bounds.model';
import { VectorData } from '../geom/vector.model';
import {
  MoveActionSelectionState,
  ScaleActionSelectionState,
} from './selection';

import { CustomPayloadConfig, AbsolutePayload } from 'undomundo';

type WithSelection<T> = { selection: T };

type MovePayloadRest = WithSelection<MoveActionSelectionState>;
type ScalePayloadRest = WithSelection<ScaleActionSelectionState>;
type IdRest = { id: string };
export type PBT = {
  moveCards: CustomPayloadConfig<AbsolutePayload<VectorData> & MovePayloadRest>;
  scaleCards: CustomPayloadConfig<
    AbsolutePayload<BoundsData> & ScalePayloadRest
  >;
  addCard: CustomPayloadConfig<CardData>;
  removeCards: CustomPayloadConfig<
    {
      card: CardData;
      index: number;
    }[]
  >;
  reorderCard: CustomPayloadConfig<AbsolutePayload<number> & IdRest>;
  updateText: CustomPayloadConfig<AbsolutePayload<string> & IdRest>;
  updateColor: CustomPayloadConfig<{
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
