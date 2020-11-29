import * as React from 'react';
import * as R from 'rambda';
import styled from '@emotion/styled';
import { Vector, V } from './geom/vector.model';
import { useEffect, useRef, useState } from 'react';
import { createNewCard, minCardSize } from './card/card';
import {
  concatArray,
  filterArrayById,
  wrapFunction,
  filterArrayByIds,
  addByIndex,
  idEquals,
  updateIfSelected,
  merge,
  valueToKV,
  updateSomeInArray,
} from './util/util';
import { Bounds } from './geom/bounds.model';
import { makeUndoableHandler, useUndoableEffects } from 'use-flexible-undo';
import { makeUndoableFTXHandler } from './actions/action-util';
import { ActionList } from './history/action-list';
import { BranchNav } from './history/branch-nav';
import {
  PBT,
  MoveCardsHandler,
  ScaleCardsHandler,
  ReorderCardHandler,
  UpdateTextHandler,
} from './actions/actions';
import { Board, TransformProps, BoardProps } from './board/board';
import { describeAction } from './actions/payload-describers';
import { SelectionProps, StandardSelectionState } from './actions/selection';
import { Layers } from './layers/layers';
import { TopMenu, TopMenuProps } from './top-menu/top-menu';

const initialCards = new Array(10)
  .fill(0)
  .map(() =>
    createNewCard(
      new Vector(100 + Math.random() * 600, 100 + Math.random() * 600)
    )
  );

export const App: React.FC = () => {
  const [cards, setCards] = useState(initialCards);
  const [selection, setSelection] = useState<StandardSelectionState>({});

  const clearSelection = () => setSelection({});

  const select = (ids: string[]) => {
    setSelection(merge(Object.fromEntries(ids.map(valueToKV(null)))));
  };

  const deselect = (ids: string[]) => {
    setSelection(R.omit(ids));
  };

  const moveCardsHandler: MoveCardsHandler = (to, { selection }) => {
    setCards(
      updateIfSelected(selection, card => ({
        ...card,
        location: V(to).add(selection[card.id].locationRel),
      }))
    );
  };

  const scaleCardsHandler: ScaleCardsHandler = (boundsData, { selection }) => {
    const bounds = Bounds.fromData(boundsData);
    const dimensions = bounds.dimensions();

    setCards(
      updateIfSelected(selection, card => {
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
      const clone = cards.slice();
      const [removed] = clone.splice(cards.findIndex(idEquals(id)), 1);
      clone.splice(toIndex, 0, removed);
      return clone;
    });
  };

  const updateTextHandler: UpdateTextHandler = (text, { id }) => {
    setCards(updateSomeInArray(idEquals(id), merge({ text })));
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
      updateText: makeUndoableFTXHandler(updateTextHandler),
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
    deselect,
    select,
    selection,
    updateSelection: s => setSelection(s),
  };

  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const [transform, setTransform] = useState({
    scale: 1,
    translate: new Vector(0, 0),
  });

  const boardContainerRef = useRef<HTMLDivElement>(null);

  const transformProps: TransformProps = {
    transform,
    setTransform,
    boardContainerRef,
  };

  const topMenuProps: TopMenuProps = {
    ...transformProps,
    showLayers,
    setShowLayers,
    showHistory,
    setShowHistory,
  };

  const boardProps: BoardProps = {
    ...transformProps,
    ...selectionProps,
    animate,
    cards,
    moveCardsHandler,
    scaleCardsHandler,
    undoables,
  };

  return (
    <Root>
      <TopMenu {...topMenuProps} />
      <Main>
        {showLayers && (
          <Layers
            cards={cards}
            undoables={undoables}
            {...selectionProps}
          ></Layers>
        )}
        <Board {...boardProps}></Board>
        {showHistory && (
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
        )}
      </Main>
    </Root>
  );
};

const Root = styled.div`
  border: 1px solid #aaa;
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: Verdana, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  user-select: none;
  div {
    box-sizing: border-box;
  }
`;

const Main = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: stretch;
  position: relative;
`;

const TimelineArea = styled.div`
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #aaa;
  user-select: none;
  display: flex;
  flex-direction: column;
`;
