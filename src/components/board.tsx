import * as React from 'react';
import styled from '@emotion/styled';
import { Vector, V } from '../models/geom/vector.model';
import { useEffect, useState } from 'react';
import { CardData, createNewCard } from '../models/card';
import {
  updateSomeInArray,
  concatArray,
  filterArrayById,
  wrapFunction,
  isItemSelected,
  filterArray,
  filterArrayByIds,, addByIndex
} from '../util/util';
import { Bounds } from '../models/geom/bounds.model';
import { makeUndoableHandler, useUndoableEffects } from 'use-flexible-undo';
import { makeUndoableFTXHandler } from '../util/action-util';
import { ActionList } from './ufu/action-list';
import { BranchNav } from './ufu/branch-nav';
import { PBT, MoveCardsHandler, ScaleCardsHandler } from '../models/actions';
import { Canvas } from './canvas';
import { describeAction } from './payload-describers';

const initialCards: CardData[] = [
  createNewCard(new Vector(200, 400)),
  createNewCard(new Vector(600, 200)),
];

export const Board: React.FC = () => {
  const [cards, setCards] = useState(initialCards);

  const moveCardsHandler: MoveCardsHandler = (to, { selection }) => {
    setCards(
      updateSomeInArray(isItemSelected(selection), card => ({
        ...card,
        location: V(to).add(selection[card.id].locationRel),
      }))
    );
  };

  const scaleCardsHandler: ScaleCardsHandler = (boundsData, { selection }) => {
    const bounds = Bounds.fromData(boundsData);
    const dimensions = bounds.dimensions();

    setCards(
      updateSomeInArray(isItemSelected(selection), card => {
        const { locationNorm, dimensionsNorm } = selection[card.id];
        return {
          ...card,
          location: bounds.topLeft().add(locationNorm.scale(dimensions)),
          dimensions: dimensionsNorm.scale(dimensions),
        };
      })
    );
  };

  const {
    undoables,
    undo,
    redo,
    history,
    timeTravel,
    switchToBranch,
  } = useUndoableEffects<PBT>({
    handlers: {
      moveCards: makeUndoableFTXHandler(moveCardsHandler),
      scaleCards: makeUndoableFTXHandler(scaleCardsHandler),
      addCard: makeUndoableHandler(setCards)(concatArray, filterArrayById),
      removeCards: makeUndoableHandler(setCards)(
        payload => filterArrayByIds(payload.map(({card}) => card)),
        payload => addByIndex(payload.map(({index, card}) => ({index, element: card})))
      ),
    },
  });

  const [animate, setAnimate] = useState(false);

  const wrapWithAnimate = wrapFunction(() => setAnimate(true));

  const undoWithAnimation = wrapWithAnimate(undo);

  const redoWithAnimation = wrapWithAnimate(redo);

  const timeTravelWithAnimation = wrapWithAnimate(timeTravel);

  const switchToBranchWithAnimation = wrapWithAnimate(switchToBranch);

  useEffect(() => {
    setTimeout(() => setAnimate(false), 500);
  }, [history]);

  return (
    <Root>
      <Canvas
        cards={cards}
        undoables={undoables}
        moveCardsHandler={moveCardsHandler}
        scaleCardsHandler={scaleCardsHandler}
        animate={animate}
      ></Canvas>
      <TimelineArea>
        <BranchNav
          history={history}
          switchToBranch={switchToBranchWithAnimation}
          undo={undoWithAnimation}
          redo={redoWithAnimation}
        ></BranchNav>
        <ActionList
          history={history}
          switchToBranch={switchToBranchWithAnimation}
          timeTravel={timeTravelWithAnimation}
          describeAction={describeAction}
        ></ActionList>
      </TimelineArea>
    </Root>
  );
};

const Root = styled.div`
  border: 1px solid #aaa;
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
  font-family: Verdana, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  div {
    box-sizing: border-box;
  }
`;

const TimelineArea = styled.div`
  width: 440px;
  flex-shrink: 0;
  border-left: 1px solid #aaa;
  /* padding-left: 16px; */
  /* background: #f8f8f8; */
  user-select: none;
  display: flex;
  flex-direction: column;
`;
