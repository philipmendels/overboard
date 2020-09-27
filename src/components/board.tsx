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
  BoundsToRectStyle, filterArrayById
} from "../util/util";
import * as React from "react";
import {
  MoveActionSelectionState,
  ScaleActionSelectionState,
  SelectedItemsState,
} from "../models/selection";
import { Bounds, BoundsData } from "../models/geom/bounds.model";
import { TransformTool } from "./transform-tool/transform-tool.model";
import { TransformHandle } from "./transform-tool/transform-handle.model";
import { HistoryItemUnion, makeUndoableHandler, useUndoableEffects } from "use-flexible-undo";
import { makeUndoableFTXHandler } from "../util/action-util";
import { getTransformToolBounds } from "./transform-tool/transform.util";
import { DirectionCompass, DirectionMap } from "../models/geom/direction.enum";
import { ActionList } from "./ufu/action-list";
import { BranchNav } from "./ufu/branch-nav";

interface MovePayload {
  selection: MoveActionSelectionState;
  from: VectorData; 
  // TODO: use topleft of selection bounds instead of mouse location?
  to: VectorData;
}

interface ScalePayload {
  // TODO: use selections bounds for from and to ?
  scaleStartBounds: BoundsData;
  direction: DirectionCompass;
  selection: ScaleActionSelectionState;
  from: VectorData;
  to: VectorData;
}

interface PBT {
  moveCards: MovePayload;
  scaleCards: ScalePayload;
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
  moveCards: ({ from, to, selection }) => <><ActionType>Move</ActionType> {getCardsString(Object.values(selection).length)} by {V(to).subtract(V(from)).toRoundedString()}</>,
  scaleCards: ({ selection }) => <><ActionType>Scale</ActionType> {getCardsString(Object.values(selection).length)}</>,
  addCard: card => <><ActionType>Add</ActionType> card at {V(card.location).toRoundedString()}</>,
  removeCards: items => <><ActionType>Remove</ActionType> {getCardsString(items.length)}</>,
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

export const Board: React.FC = () => {
  const [cards, setCards] = useState(initialCards);
  const [selection, setSelection] = useState(initialSelection);
  const [isDraggingMarquee, setIsDraggingMarquee] = useState(false);
  const [marqueeBounds, setMarqueeBounds] = useState(new Bounds(0, 0, 0, 0));

  const uiRef = useRef({
    isDraggingCard: false,
    isMouseDownOnBoard: false,
    isMouseDownOnCard: false,
    dragStart: null as Vector | null,
    marqueeStartLocation: null as Vector | null,
    transformTool: new TransformTool(),
    isMouseDownOnTransformHandle: false,
    scaleStartBounds: null as Bounds | null,
    scaleTransformHandle: null as TransformHandle | null,
  });

  const getCard = (id: string) => cards.find(idEquals(id));
  const isCardInSelection = (selection: SelectedItemsState) => (
    card: CardData
  ) => selection[card.id] !== undefined;
  const isSelected = isCardInSelection(selection);
  const getCardsInSelection = (selection: SelectedItemsState) =>
    cards.filter(isCardInSelection(selection));
  const getSelectedCards = () => getCardsInSelection(selection);
  const clearSelection = () => setSelection(initialSelection);
  const hasSelection = () => Boolean(Object.keys(selection).length);
  const selectCards = (ids: string[]) => {
    setSelection(addToObjMap(ids.map(valueToKV({}))));
  };
  const deselectCard = (id: string) => {
    setSelection(filterObjMap(keyEqualsNot(id)));
  };

  const mouseDownOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (hasSelection()) {
      clearSelection();
    }
    uiRef.current.isMouseDownOnBoard = true;

    uiRef.current.marqueeStartLocation = new Vector(
      event.clientX,
      event.clientY
    );
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (uiRef.current.isMouseDownOnCard) {
      uiRef.current.isDraggingCard = true;
      moveCardsHandler(boardLocation, {selection: selection as MoveActionSelectionState});
    } else if (uiRef.current.isMouseDownOnBoard) {
      const start = uiRef.current.marqueeStartLocation!;
      setIsDraggingMarquee(true);
      setMarqueeBounds(Bounds.fromPoints([boardLocation, start]));
    } else if (uiRef.current.isMouseDownOnTransformHandle) {
      scaleCardsHandler(boardLocation, {
        selection: selection as ScaleActionSelectionState,
        direction: uiRef.current.scaleTransformHandle!.data.directionCompass,
        scaleStartBounds: uiRef.current.scaleStartBounds!
      });
    }
    event.stopPropagation();
  };

  const dblclickBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    addCard(createNewCard(
      new Vector(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
    ));
  };

  const startMoveCards = (location: Vector) => {
    uiRef.current.dragStart = location;
    setSelection(
      updateAllInObjMap(([id, _]) => ({
        startMoveMouseOffset: V(getCard(id)!.location).subtract(location)
      }))
    );
  };

  const moveCardsHandler = (to: VectorData, rest:{selection: MoveActionSelectionState}) => {
    const {selection} = rest;
    setCards(
      updateSomeInArray(isCardInSelection(selection), card => ({
        ...card,
        location: V(to).add(selection[card.id].startMoveMouseOffset)
      }))
    );
  };

  const scaleCardsHandler = (boardLocation: VectorData, rest:{
    selection: ScaleActionSelectionState;
    scaleStartBounds: BoundsData;
    direction: DirectionCompass;
  }) => {
    const {selection, scaleStartBounds, direction} = rest;
    const bounds = Bounds.fromData(scaleStartBounds);
    const ttBounds = getTransformToolBounds({
      startBounds: bounds,
      handle: new TransformHandle(DirectionMap.find(item => item.directionCompass === direction)!),
      mouseLocation: V(boardLocation)
    });
    const ttScale = new Vector(
      ttBounds.getWidth() / bounds.getWidth(), 
      ttBounds.getHeight() / bounds.getHeight()
    );
    setCards(
      updateSomeInArray(isCardInSelection(selection), card => {
        const {startScaleBoundsOffset, startScaleDimensions} = selection[card.id];
        return {
          ...card,
          location: ttBounds.topLeft().add(startScaleBoundsOffset.scale(ttScale)),
          dimensions: startScaleDimensions.scale(ttScale)
        }
      })
    );
  };

  const startScaleCards = (handle: TransformHandle, location: Vector) => {
    uiRef.current.dragStart = location;
    const selectedCardsBounds = getSelectionBounds();

    uiRef.current.scaleStartBounds = selectedCardsBounds;
    uiRef.current.scaleTransformHandle = handle;

    setSelection(updateAllInObjMap(([id, _]) => {
      const selectedCard = getCard(id)!;
      return {
        startScaleBoundsOffset: V(selectedCard.location)
          .subtract(selectedCardsBounds.topLeft()),
        startScaleDimensions: V(selectedCard.dimensions).clone()
      }
    }));
  };

  const mouseDownOnCard = (mouseDownCard: CardData) => (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.stopPropagation();
    uiRef.current.isMouseDownOnCard = true;
    handleSelection(
      event,
      isSelected(mouseDownCard),
      clearSelection,
      () => selectCards([mouseDownCard.id]),
      () => deselectCard(mouseDownCard.id)
    );
    startMoveCards(V({ x: event.clientX, y: event.clientY }));
  };

  const mouseUpOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (isDraggingMarquee) {
      const cardIdsToSelect = cards
        .filter(card => {
          const cardBounds = Bounds.fromRect(card.location, card.dimensions);
          return cardBounds.intersectsBounds(marqueeBounds);
        })
        .map(card => card.id);
      if (cardIdsToSelect.length) {
        selectCards(cardIdsToSelect);
      }
    } else if (uiRef.current.isDraggingCard) {
      uiRef.current.isDraggingCard = false;
      moveCards({
        selection: selection as MoveActionSelectionState,
        from: uiRef.current.dragStart!,
        to: boardLocation
      });
    } else if (uiRef.current.isMouseDownOnTransformHandle) {
      uiRef.current.isMouseDownOnTransformHandle = false;
      scaleCards({
        from: uiRef.current.dragStart!,
        to: boardLocation,
        selection: selection as ScaleActionSelectionState,
        direction: uiRef.current.scaleTransformHandle!.data.directionCompass,
        scaleStartBounds: uiRef.current.scaleStartBounds!
      })
    }
    uiRef.current.isMouseDownOnBoard = false;
    uiRef.current.isMouseDownOnCard = false;
    uiRef.current.isDraggingCard = false;
    setIsDraggingMarquee(false);
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

  const getSelectionBounds = (): Bounds => {
    const selectedCardsBoundsArray = getSelectedCards().map(card =>
      Bounds.fromRect(card.location, card.dimensions)
    );
    return Bounds.fromShapes(selectedCardsBoundsArray);
  };

  const mouseDownOnHandle = (
    event: React.MouseEvent<HTMLDivElement>,
    handle: TransformHandle
  ) => {
    event.stopPropagation();
    uiRef.current.isMouseDownOnTransformHandle = true;
    startScaleCards(handle, new Vector(event.clientX, event.clientY));
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

  const [animate, setAnimate] = useState(false);
  
  const undoWrapped = (...args: Parameters<typeof undo>) => {
    setAnimate(true);
    undo(...args);
  };
  
  const redoWrapped = (...args: Parameters<typeof redo>) => {
    setAnimate(true);
    redo(...args);
  };

  const timeTravelWrapped = (...args: Parameters<typeof timeTravel>) => {
    setAnimate(true);
    timeTravel(...args);
  };

  const switchToBranchWrapped = (...args: Parameters<typeof switchToBranch>) => {
    setAnimate(true);
    switchToBranch(...args);
  };

  useEffect(() => {
    setTimeout(() => setAnimate(false), 500);
  }, [history]);

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
      {isDraggingMarquee && (
        <Marquee style={BoundsToRectStyle(marqueeBounds)} />
      )}
      {getSelectedCards().length > 0 && !uiRef.current.isDraggingCard && (
        <TransformToolDiv 
          animate={animate}
          style={BoundsToRectStyle(getSelectionBounds())}
        >
          {uiRef.current.transformTool.handles.map((handle, index) => {
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
        switchToBranch={switchToBranchWrapped}
        undo={undoWrapped}
        redo={redoWrapped}
      ></BranchNav>
      <ActionList
        history={history}
        switchToBranch={switchToBranchWrapped}
        timeTravel={timeTravelWrapped}
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
