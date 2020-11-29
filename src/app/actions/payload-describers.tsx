import styled from '@emotion/styled';
import React from 'react';
import { ReactNode } from 'react';
import { HistoryItemUnion } from 'use-flexible-undo';
import { PBT } from './actions';
import { Bounds } from '../geom/bounds.model';
import { V } from '../geom/vector.model';

type PayloadDescribers = {
  [K in keyof PBT]: (payload: PBT[K]) => ReactNode;
};

const payloadDescribers: PayloadDescribers = {
  moveCards: ({ from, to, selection }) => (
    <>
      <ActionType>Move</ActionType>{' '}
      {getCardsString(Object.values(selection).length)} by{' '}
      {V(to).subtract(V(from)).toRoundedString()}
    </>
  ),
  scaleCards: ({ from, to, selection }) => (
    <>
      <ActionType>Scale</ActionType>{' '}
      {getCardsString(Object.values(selection).length)} by{' '}
      {Bounds.fromData(to)
        .dimensions()
        .divideByVector(Bounds.fromData(from).dimensions())
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
  reorderCard: ({ from, to }) => (
    <>
      <ActionType>Reorder</ActionType> card from index {from} to {to}
    </>
  ),
  updateText: ({ to }) => (
    <>
      <ActionType>Update text</ActionType> '{to.slice(0, 16)}...'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type === 'start' ? 'Start' : (payloadDescribers[type] as any)(payload);

const ColorBlock = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  vertical-align: text-bottom;
`;
