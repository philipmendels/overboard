import styled from '@emotion/styled';
import React from 'react';
import { ReactNode } from 'react';
import {
  HistoryPayload,
  HistoryItemUnion,
  PayloadConfigByType,
} from 'undomundo';
import { PBT } from './actions';
import { Bounds } from '../geom/bounds.model';
import { V } from '../geom/vector.model';

type PayloadDescribers<PBT2 extends PayloadConfigByType> = {
  [K in keyof PBT2]: (
    payload: HistoryPayload<PBT2[K]['payload'], PBT2[K]['isCustom']>
  ) => ReactNode;
};

const payloadDescribers: PayloadDescribers<PBT> = {
  moveCards: ({ undo, redo, selection }) => (
    <>
      <ActionType>Move</ActionType>{' '}
      {getCardsString(Object.values(selection).length)} by{' '}
      {V(redo).subtract(V(undo)).toRoundedString()}
    </>
  ),
  scaleCards: ({ undo, redo, selection }) => (
    <>
      <ActionType>Scale</ActionType>{' '}
      {getCardsString(Object.values(selection).length)} by{' '}
      {Bounds.fromData(redo)
        .dimensions()
        .divideByVector(Bounds.fromData(undo).dimensions())
        .toRoundedString(2)}
    </>
  ),
  addCard: card => (
    <>
      <ActionType>Add</ActionType> card at {V(card.location).toRoundedString()}
    </>
  ),
  removeCards: items => (
    <>
      <ActionType>Remove</ActionType> {getCardsString(items.length)}
    </>
  ),
  reorderCard: ({ undo, redo }) => (
    <>
      <ActionType>Reorder</ActionType> card from index {undo} to {redo}
    </>
  ),
  updateText: ({ redo }) => (
    <>
      <ActionType>Update text</ActionType> '{redo.slice(0, 16)}...'
    </>
  ),
  updateColor: ({ to, selection }) => (
    <>
      <ActionType>Change color</ActionType> of{' '}
      {getCardsString(Object.values(selection).length)} to{' '}
      <ColorBlock style={{ background: to }} />
    </>
  ),
};

const ActionType = styled.span`
  font-weight: bolder;
`;
const getCardsString = (amount: number) =>
  amount + ' card' + (amount === 1 ? '' : 's');

export const describeAction = ({
  type,
  payload,
}: HistoryItemUnion<PBT>): ReactNode =>
  (payloadDescribers[type] as any)(payload);

const ColorBlock = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  vertical-align: text-bottom;
`;
