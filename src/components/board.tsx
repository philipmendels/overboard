import * as React from 'react';
import * as R from 'rambda';
import styled from '@emotion/styled';
import { Vector, V } from '../models/geom/vector.model';
import { useEffect, useState } from 'react';
import { createNewCard, minCardSize } from '../models/card';
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
  UpdateTextHandler,
} from '../models/actions';
import { Canvas } from './canvas';
import { describeAction } from './payload-describers';
import { SelectionProps, StandardSelectionState } from '../models/selection';
import { Layers } from './layers/layers';
import { BiLayer, BiHistory, BiZoomIn, BiZoomOut } from 'react-icons/bi';

const initialCards = new Array(10)
  .fill(0)
  .map(() =>
    createNewCard(
      new Vector(100 + Math.random() * 600, 100 + Math.random() * 600)
    )
  );

export const Board: React.FC = () => {
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

  return (
    <Root>
      <MenuBar>
        <span
          onClick={() => setShowLayers(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: showLayers ? 'black' : '#aaa',
            fontWeight: 'bolder',
          }}
        >
          Layers&nbsp;
          <BiLayer size={20} />
        </span>
        <span
          style={{
            width: '40px',
            marginLeft: 'auto',
            textAlign: 'end',
          }}
        >
          {Math.round(transform.scale * 100)}%
        </span>
        &nbsp; &nbsp;
        <BiZoomIn
          size={20}
          onClick={() =>
            setTransform(({ scale, translate }) => ({
              scale: Math.min(scale * 1.1, 3),
              translate,
            }))
          }
          style={{
            cursor: 'pointer',
          }}
        />
        &nbsp;&nbsp;
        <BiZoomOut
          size={20}
          onClick={() =>
            setTransform(({ scale, translate }) => ({
              scale: Math.max(scale / 1.1, 1 / 3),
              translate,
            }))
          }
          style={{
            cursor: 'pointer',
            marginRight: 'auto',
          }}
        ></BiZoomOut>
        <span
          onClick={() => setShowHistory(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: showHistory ? 'black' : '#aaa',
            fontWeight: 'bolder',
          }}
        >
          History&nbsp;
          <BiHistory size={20} />
        </span>
      </MenuBar>
      <Main>
        {showLayers && (
          <Layers
            cards={cards}
            undoables={undoables}
            {...selectionProps}
          ></Layers>
        )}
        <Canvas
          cards={cards}
          undoables={undoables}
          moveCardsHandler={moveCardsHandler}
          scaleCardsHandler={scaleCardsHandler}
          animate={animate}
          transform={transform}
          setTransform={setTransform}
          {...selectionProps}
        ></Canvas>
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

const MenuBar = styled.div`
  flex: 0 0 40px;
  background: white;
  border-bottom: 1px solid #aaa;
  padding: 4px 16px;
  display: flex;
  align-items: center;
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  align-items: stretch;
`;

const TimelineArea = styled.div`
  width: 450px;
  flex-shrink: 0;
  border-left: 1px solid #aaa;
  user-select: none;
  display: flex;
  flex-direction: column;
`;
