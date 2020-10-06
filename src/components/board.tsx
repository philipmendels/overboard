import * as React from 'react';
import styled from '@emotion/styled';
import { Vector, V } from '../models/geom/vector.model';
import { useEffect, useState } from 'react';
import { createNewCard, minCardSize } from '../models/card';
import {
  updateSomeInArray,
  concatArray,
  filterArrayById,
  wrapFunction,
  filterArrayByIds,
  addByIndex,
  isItemInSelectionRecord,
  concatObjMapEntries,
  filterObjMapEntries,
  Entry,
  ValueOf,
  mapObjMapValues,
  idEquals,
} from '../util/util';
import { Bounds } from '../models/geom/bounds.model';
import { makeUndoableHandler, useUndoableEffects } from 'use-flexible-undo';
import { makeUndoableFTXHandler } from '../util/action-util';
import { ActionList } from './ufu/action-list';
import { BranchNav } from './ufu/branch-nav';
import {
  PBT,
  MoveCardsHandler,
  ScaleCardsHandler,
  ReorderCardHandler,
} from '../models/actions';
import { Canvas } from './canvas';
import { describeAction } from './payload-describers';
import { SelectionProps, SelectionState } from '../models/selection';
import { Layers } from './layers/layers';

const initialCards = new Array(10)
  .fill(0)
  .map(_ =>
    createNewCard(
      new Vector(100 + Math.random() * 600, 100 + Math.random() * 600)
    )
  );

export const Board: React.FC = () => {
  const [cards, setCards] = useState(initialCards);
  const [selection, setSelection] = useState<SelectionState>({});

  const clearSelection = () => setSelection({});

  const select = (ids: string[]) => {
    setSelection(concatObjMapEntries(ids.map(id => [id, null])));
  };

  const deselect = (ids: string[]) => {
    setSelection(filterObjMapEntries(([id]) => !ids.includes(id)));
  };

  const mapSelection = <S extends SelectionState>(
    mapFn: (entry: Entry<SelectionState>) => ValueOf<S>
  ) => {
    setSelection(mapObjMapValues(mapFn));
  };

  const moveCardsHandler: MoveCardsHandler = (to, { selection }) => {
    setCards(
      updateSomeInArray(isItemInSelectionRecord(selection), card => ({
        ...card,
        location: V(to).add(selection[card.id].locationRel),
      }))
    );
  };

  const scaleCardsHandler: ScaleCardsHandler = (boundsData, { selection }) => {
    const bounds = Bounds.fromData(boundsData);
    const dimensions = bounds.dimensions();

    setCards(
      updateSomeInArray(isItemInSelectionRecord(selection), card => {
        const { locationNorm, dimensionsNorm } = selection[card.id];
        return {
          ...card,
          location: bounds.topLeft().add(locationNorm.scale(dimensions)),
          dimensions: dimensionsNorm.scale(dimensions).max(minCardSize),
        };
      })
    );
  };

  const reorderCardHandler: ReorderCardHandler = (toIndex, { id }) => {
    setCards(cards => {
      const index = cards.findIndex(idEquals(id));
      const clone = cards.slice();
      const [card] = clone.splice(index, 1);
      clone.splice(toIndex, 0, card);
      return clone;
    });
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
        payload => filterArrayByIds(payload.map(({ card }) => card)),
        payload =>
          addByIndex(
            payload.map(({ index, card }) => ({ index, element: card }))
          )
      ),
      reorderCard: makeUndoableFTXHandler(reorderCardHandler),
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

  const selectionProps: SelectionProps = {
    clearSelection,
    mapSelection,
    deselect,
    select,
    selection,
  };

  return (
    <Root>
      <Canvas
        cards={cards}
        undoables={undoables}
        moveCardsHandler={moveCardsHandler}
        scaleCardsHandler={scaleCardsHandler}
        animate={animate}
        {...selectionProps}
      ></Canvas>
      <Layers cards={cards} undoables={undoables} {...selectionProps}></Layers>
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
  width: 450px;
  flex-shrink: 0;
  border-left: 1px solid #aaa;
  user-select: none;
  display: flex;
  flex-direction: column;
`;
