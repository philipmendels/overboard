import * as React from 'react';
import * as R from 'rambda';
import styled from '@emotion/styled';
import { Vector, V } from './geom/vector.model';
import { useEffect, useRef, useState } from 'react';
import { AbsolutePayload } from 'undomundo';
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
  reduceSelection,
} from './util/util';
import { Bounds } from './geom/bounds.model';
import { useFlexibleUndo } from 'use-flexible-undo';
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
import { CustomBranchData } from './history/types';

const initialCards = new Array(10)
  .fill(0)
  .map(() =>
    createNewCard(
      new Vector(100 + Math.random() * 600, 100 + Math.random() * 600)
    )
  );

const invertPayload = <P, A extends { payload: AbsolutePayload<P> }>({
  payload: { undo, redo, ...rest },
  ...rest2
}: A) =>
  ({
    ...rest2,
    payload: { ...rest, undo: redo, redo: undo },
  } as A);

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

  const moveCardsHandler: MoveCardsHandler = ({ redo, selection }) => {
    setCards(
      updateIfSelected(selection, card => ({
        ...card,
        location: V(redo).add(selection[card.id].locationRel),
      }))
    );
  };

  const scaleCardsHandler: ScaleCardsHandler = ({ redo, selection }) => {
    const bounds = Bounds.fromData(redo);
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

  const reorderCardHandler: ReorderCardHandler = ({ redo, id }) => {
    setCards(cards => {
      const clone = cards.slice();
      const [removed] = clone.splice(cards.findIndex(idEquals(id)), 1);
      clone.splice(redo, 0, removed);
      return clone;
    });
  };

  const updateTextHandler: UpdateTextHandler = ({ redo, id }) => {
    setCards(updateSomeInArray(idEquals(id), merge({ text: redo })));
  };

  const {
    undoables,
    undo,
    redo,
    history,
    timeTravel,
    switchToBranch,
  } = useFlexibleUndo<PBT, CustomBranchData>({
    actionConfigs: {
      moveCards: {
        updateState: moveCardsHandler,
        makeActionForUndo: invertPayload,
      },
      scaleCards: {
        updateState: scaleCardsHandler,
        makeActionForUndo: invertPayload,
      },
      addCard: {
        updateState: payload => setCards(concatArray(payload)),
        updateStateOnUndo: payload => setCards(filterArrayById(payload)),
        makeActionForUndo: R.identity,
      },
      removeCards: {
        updateState: payload =>
          setCards(filterArrayByIds(payload.map(({ card }) => card))),
        updateStateOnUndo: payload =>
          setCards(
            addByIndex(
              payload.map(({ index, card }) => ({ index, element: card }))
            )
          ),
        makeActionForUndo: R.identity,
      },
      reorderCard: {
        updateState: reorderCardHandler,
        makeActionForUndo: invertPayload,
      },
      updateText: {
        updateState: updateTextHandler,
        makeActionForUndo: invertPayload,
      },
      updateColor: {
        updateState: ({ selection, to }) =>
          setCards(
            updateIfSelected(selection, card => ({
              ...card,
              background: to,
            }))
          ),
        updateStateOnUndo: ({ selection }) =>
          setCards(
            updateIfSelected(selection, card => ({
              ...card,
              background: selection[card.id],
            }))
          ),
        makeActionForUndo: R.identity,
      },
    },
    initBranchData: history => ({
      name: `Branch ${history.stats.branchCounter + 1}`,
      number: history.stats.branchCounter + 1,
    }),
    options: {
      useBranchingHistory: true,
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

  const hasSelection = () => !!Object.values(selection).length;
  const getCardById = (id: string) => cards.find(idEquals(id));

  const topMenuProps: TopMenuProps = {
    ...transformProps,
    showLayers,
    setShowLayers,
    showHistory,
    setShowHistory,
    updateColor: color => {
      if (hasSelection()) {
        undoables.updateColor({
          selection: reduceSelection(
            selection,
            id => getCardById(id)?.background || ''
          ),
          to: color,
        });
      }
    },
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
