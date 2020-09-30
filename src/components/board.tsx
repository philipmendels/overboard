import styled from "@emotion/styled";
import { VectorData, Vector, V } from "../models/geom/vector.model";
import { ReactNode, useEffect, useRef, useState } from "react";
import { CardData, createNewCard } from "../models/card";
import {
  handleSelection,
  updateAllInObjMap,
  updateSomeInArray,
  filterObjMap,
  addToObjMap,
  keyEqualsNot,
  valueToKV,
  idEquals,
  concatArray,
  BoundsToRectStyle, filterArrayById, wrapFunction, isItemSelected
} from "../util/util";
import * as React from "react";
import {
  MoveActionItemState,
  MoveActionSelectionState,
  ScaleActionItemState,
  ScaleActionSelectionState,
  SelectedItemsState,
} from "../models/selection";
import { Bounds, BoundsData } from "../models/geom/bounds.model";
import { TransformTool } from "./transform-tool/transform-tool.model";
import { TransformHandle } from "./transform-tool/transform-handle.model";
import { HistoryItemUnion, makeUndoableHandler, PayloadFromTo, useUndoableEffects } from "use-flexible-undo";
import { makeUndoableFTXHandler } from "../util/action-util";
import { getTransformToolBounds } from "./transform-tool/transform.util";
import { ActionList } from "./ufu/action-list";
import { BranchNav } from "./ufu/branch-nav";

type WithSelection<T> = { selection: T };

type MovePayloadRest = WithSelection<MoveActionSelectionState>;
type ScalePayloadRest = WithSelection<ScaleActionSelectionState>;

interface PBT {
  moveCards: PayloadFromTo<VectorData> & MovePayloadRest;
  scaleCards: PayloadFromTo<BoundsData> & ScalePayloadRest;
  addCard: CardData;
  removeCards: {
    card: CardData;
    index: number;
  }[]
}

type PayloadDescribers = {
  [K in keyof PBT]: (payload: PBT[K]) => ReactNode;
};

const payloadDescribers: PayloadDescribers = {
  moveCards: ({ from, to, selection }) => <>
    <ActionType>Move</ActionType> {
      getCardsString(Object.values(selection).length)
    } by {
      V(to).subtract(V(from)).toRoundedString()
    }
  </>,
  scaleCards: ({ from, to, selection }) => <>
    <ActionType>Scale</ActionType> {
      getCardsString(Object.values(selection).length)
    } by {
      Bounds.fromData(to).dimensions()
        .divideByVector(Bounds.fromData(from).dimensions())
        .toRoundedString(2)
    }
  </>,
  addCard: card => <>
    <ActionType>Add</ActionType> card at {
      V(card.location).toRoundedString()
    }
  </>,
  removeCards: items => <>
    <ActionType>Remove</ActionType> {
      getCardsString(items.length)
    }
  </>,
};

const ActionType = styled.span`
  font-weight: bolder;
`;
const getCardsString = (amount: number) => amount + ' card' + (amount === 1 ? '' : 's');

const describeAction = ({
  type,
  payload,
}: HistoryItemUnion<PBT>): ReactNode =>
  type === 'start' ? 'Start' : (payloadDescribers[type] as any)(payload);

const initialCards: CardData[] = [
  createNewCard(new Vector(200, 400)),
  createNewCard(new Vector(600, 200))
];

const initialSelection: SelectedItemsState = {};

type DragType = 'NONE' | 'CARDS' | 'MARQUEE' | 'TRANSFORM_HANDLE';

const transformTool = new TransformTool();

export const Board: React.FC = () => {

  const [cards, setCards] = useState(initialCards);
  const [selection, setSelection] = useState(initialSelection);

  const [dragType, setDragType] = useState<DragType>('NONE');
  const [dragStartLocation, setDragStartLocation] = useState<Vector | null>(null);
  const [dragLocation, setDragLocation] = useState<Vector | null>(null);
  const getIsDragging = () => dragLocation !== null;

  const [activeTransformHandle, setActiveTransformHandle] = useState<TransformHandle | null>(null);
  const [scaleStartBounds, setScaleStartBounds] = useState<Bounds | null>(null);

  const getCardById = (id: string) => cards.find(idEquals(id));
  const isSelected = isItemSelected(selection);
  const getSelectedCards = () => cards.filter(isSelected);
  const clearSelection = () => setSelection(initialSelection);
  const hasSelection = () => Boolean(Object.keys(selection).length);
  const selectCards = (ids: string[]) => {
    setSelection(addToObjMap(ids.map(valueToKV({}))));
  };
  const deselectCard = (id: string) => {
    setSelection(filterObjMap(keyEqualsNot(id)));
  };

  const getSelectionBounds = (): Bounds => {
    const selectedCardsBoundsArray = getSelectedCards().map(card =>
      Bounds.fromRect(card.location, card.dimensions)
    );
    return Bounds.fromShapes(selectedCardsBoundsArray);
  };

  const getMarqueeBounds = () => dragLocation && dragStartLocation && Bounds.fromPoints([dragLocation, dragStartLocation]);

  // handlers
  
  const moveCardsHandler = (to: VectorData, { selection }: MovePayloadRest) => {
    setCards(
      updateSomeInArray(isItemSelected(selection), card => ({
        ...card,
        location: V(to).add(selection[card.id].locationRel)
      }))
    );
  };

  const scaleCardsHandler = (boundsData: BoundsData, { selection }: ScalePayloadRest) => {
    const bounds = Bounds.fromData(boundsData);
    const dimensions = bounds.dimensions();

    setCards(
      updateSomeInArray(isItemSelected(selection), card => {
        const {locationNorm, dimensionsNorm} = selection[card.id];
        return {
          ...card,
          location: bounds.topLeft().add(locationNorm.scale(dimensions)),
          dimensions: dimensionsNorm.scale(dimensions)
        }
      })
    );
  };
  
  const {undoables, undo, redo, history, timeTravel, switchToBranch} = useUndoableEffects<PBT>({
    handlers: {
      moveCards: makeUndoableFTXHandler(moveCardsHandler),
      scaleCards: makeUndoableFTXHandler(scaleCardsHandler),
      addCard: makeUndoableHandler(setCards)(
        concatArray, 
        filterArrayById,
      ),
      removeCards: {
        drdo: p => setCards(prev => prev.filter(c => !p.find(item => item.card.id === c.id))),
        undo: p => setCards(prev => {
          // TODO: clean this up
          const clone = prev.slice();
          const pSorted = p.slice().sort((a,b) => a.index - b.index);
          pSorted.forEach(item => clone.splice(item.index, 0, item.card));
          return clone;
        })
      }
    }
  });

  const {moveCards, scaleCards, addCard, removeCards} = undoables;

  // Animation:

  const [animate, setAnimate] = useState(false);

  const wrapWithAnimate = wrapFunction(() => setAnimate(true));

  const undoWithAnimation = wrapWithAnimate(undo);
  
  const redoWithAnimation = wrapWithAnimate(redo);

  const timeTravelWithAnimation = wrapWithAnimate(timeTravel);

  const switchToBranchWithAnimation = wrapWithAnimate(switchToBranch);

  useEffect(() => {
    setTimeout(() => setAnimate(false), 500);
  }, [history]);
  
  // UI events

  const dblclickBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    addCard(createNewCard(
      new Vector(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
    ));
  };

  const keyDownOnBoard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 8 || event.keyCode === 46) {
      // backspace and delete
      removeCards(getSelectedCards().map(card => ({
        card,
        index: cards.findIndex(idEquals(card.id))
      })));
    }
    if(event.key  === 'ArrowDown') {
      undo();
    }
    if(event.key  === 'ArrowUp') {
      redo();
    }
  };

  const mouseDownOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (hasSelection()) {
      clearSelection();
    }
    setDragType('MARQUEE');

    setDragStartLocation(new Vector(
      event.clientX,
      event.clientY
    ));
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if(dragType !== 'NONE') {
      setDragLocation(V(boardLocation));
    }
    if (dragType === 'CARDS') {
      moveCardsHandler(boardLocation, {selection: selection as MoveActionSelectionState});
    } else if (dragType === 'TRANSFORM_HANDLE') {
      const ttBounds = getTransformToolBounds({
        startBounds: scaleStartBounds!,
        handle: activeTransformHandle!,
        mouseLocation: V(boardLocation)
      });
      scaleCardsHandler(ttBounds, {
        selection: selection as ScaleActionSelectionState,
      });
    }
    event.stopPropagation();
  };

  const mouseUpOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if(getIsDragging()) {
      if (dragType === 'MARQUEE') {
        const mb = getMarqueeBounds()!;
        const cardIdsToSelect = cards
          .filter(card => {
            const cardBounds = Bounds.fromRect(card.location, card.dimensions);
            return cardBounds.intersectsBounds(mb);
          })
          .map(card => card.id);
        if (cardIdsToSelect.length) {
          selectCards(cardIdsToSelect);
        }
      } else if (dragType === 'CARDS') {
        moveCards({
          selection: selection as MoveActionSelectionState,
          from: dragStartLocation!,
          to: boardLocation
        });
      } else if (dragType === 'TRANSFORM_HANDLE') {
        scaleCards({
          from: scaleStartBounds!,
          to: getSelectionBounds(),
          selection: selection as ScaleActionSelectionState,
        })
      }
    }
    setDragType('NONE');
    setDragLocation(null);
  };
  
  const mouseDownOnCard = (mouseDownCard: CardData) => (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.stopPropagation();
    const loc = new Vector(event.clientX, event.clientY);
    setDragStartLocation(loc)
    setDragType('CARDS');
    handleSelection(
      event,
      isSelected(mouseDownCard),
      clearSelection,
      () => selectCards([mouseDownCard.id]),
      () => deselectCard(mouseDownCard.id)
    );
    setSelection(
      updateAllInObjMap(([id, _]) => ({
        locationRel: V(getCardById(id)!.location).subtract(loc)
      } as MoveActionItemState))
    );
  };

  const mouseDownOnHandle = (
    event: React.MouseEvent<HTMLDivElement>,
    handle: TransformHandle
  ) => {
    event.stopPropagation();
    setDragType('TRANSFORM_HANDLE');

    const selectedCardsBounds = getSelectionBounds();

    setScaleStartBounds(selectedCardsBounds);
    setActiveTransformHandle(handle);

    const dimensions = selectedCardsBounds.dimensions();

    setSelection(updateAllInObjMap(([id, _]) => {
      const selectedCard = getCardById(id)!;
      return {
        locationNorm: V(selectedCard.location)
          .subtract(selectedCardsBounds.topLeft())
          .divideByVector(dimensions),
        dimensionsNorm: V(selectedCard.dimensions)
          .divideByVector(dimensions),
      } as ScaleActionItemState;
    }));
  };

  return (
    <Root>
      <BoardArea
        tabIndex={0}
        onMouseMove={mouseMoveOnBoard}
        onMouseDown={mouseDownOnBoard}
        onMouseUp={mouseUpOnBoard}
        onKeyDown={keyDownOnBoard}
        onDoubleClick={dblclickBoard}
      >
      {cards.map(card => (
        <Card
          key={card.id}
          onMouseDown={mouseDownOnCard(card)}
          style={{
            ...BoundsToRectStyle(Bounds.fromRect(card.location, card.dimensions)),
            borderColor: isSelected(card) ? colors.highlight : "#aaa"
          }}
          animate={animate}
        >
          {card.text}
        </Card>
      ))}
      {getIsDragging() && dragType === 'MARQUEE' && (
        <Marquee style={BoundsToRectStyle(getMarqueeBounds()!)} />
      )}
      {getSelectedCards().length > 0 && !(getIsDragging() && dragType === 'CARDS') && (
        <TransformToolDiv 
          animate={animate}
          style={BoundsToRectStyle(getSelectionBounds())}
        >
          {transformTool.handles.map((handle, index) => {
            const handleStyle = {
              left: handle.getStyleLeft(),
              top: handle.getStyleTop(),
              widht: handle.getSize(),
              height: handle.getSize(),
              cursor: handle.getStyleCursor()
            };
            return (
              <TransformToolHandle
                animate={animate}
                draggable={false}
                key={index}
                style={handleStyle}
                onMouseDown={e => {
                  mouseDownOnHandle(e, handle);
                }}
              />
            );
          })}
        </TransformToolDiv>
      )}
    </BoardArea>
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

const colors = {
  highlight: "#48a7f6"
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

const BoardArea = styled.div`
  position: relative;
  outline: none;
  flex: 1;
  overflow: hidden;
  /* background: #f8f8f8; */
  background: #ddd;
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

const Card = styled.div<{animate: boolean}>`
  /* background: #f8f8f8; */
  background: white;
  padding: 10px;
  position: absolute;
  overflow: hidden;
  border: 1px solid lightgray;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
  transition: ${props => props.animate ? 'all 0.3s ease-in-out' : 'none'};
`;

const Marquee = styled.div`
  background-color: transparent;
  border: 1px dashed black;
  position: absolute;
  pointer-events: none;
`;

const TransformToolDiv = styled.div<{animate: boolean}>`
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 2;
  border: 1px solid ${colors.highlight};
  transition: ${props => props.animate ? 'all 0.3s ease-in-out' : 'none'};
`;

const TransformToolHandle = styled.div<{animate: boolean}>`
  pointer-events: auto;
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.highlight};
  transition: ${props => props.animate ? 'all 0.3s ease-in-out' : 'none'};
`;
