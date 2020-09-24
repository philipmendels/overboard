import styled from "@emotion/styled";
import { VectorData, Vector, V } from "../models/geom/vector.model";
import { useRef, useState } from "react";
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
  BoundsToBoundsStyle,
  concatArray,
  BoundsToRectStyle, filterArray, idEqualsNot, filterArrayById
} from "../util/util";
import * as React from "react";
import {
  MoveActionSelectionState,
  ScaleActionItemState,
  ScaleActionSelectionState,
  SelectedItem,
  SelectedItemsState,
} from "../models/selection";
import { Bounds } from "../models/geom/bounds.model";
import { TransformTool } from "./transform-tool/transform-tool.model";
import { TransformHandle } from "./transform-tool/transform-handle.model";
import { makeUndoableHandler, useUndoableEffects } from "use-flexible-undo";
import { makeUndoableFTXHandler } from "../util/action-util";
import { getTransformation } from "./transform-tool/transform.util";

interface MovePayload {
  selection: MoveActionSelectionState;
  from: VectorData;
  to: VectorData;
}

interface ScalePayload {
  scaleStartBounds: Bounds;
  handle: TransformHandle;
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
      setMarqueeBounds(
        new Bounds(
          Math.min(boardLocation.x, start.x),
          Math.min(boardLocation.y, start.y),
          Math.max(boardLocation.x, start.x),
          Math.max(boardLocation.y, start.y)
        )
      );
    } else if (uiRef.current.isMouseDownOnTransformHandle) {
      scaleCardsHandler(boardLocation, {
        selection: selection as ScaleActionSelectionState,
        handle: uiRef.current.scaleTransformHandle!,
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
    selection: ScaleActionSelectionState,
    scaleStartBounds: Bounds;
    handle: TransformHandle;
  }) => {
    const {selection, scaleStartBounds, handle} = rest;
    setCards(
      updateSomeInArray(isCardInSelection(selection), card => {
        const selectionState = selection[card.id] as ScaleActionItemState;
        const transformation = getTransformation({
          startBounds: scaleStartBounds,
          startBoundsOffset: selectionState.startScaleBoundsOffset,
          startDimensions: selectionState.startScaleDimensions,
          handle,
          mouseLocation: V(boardLocation)
        });
        return {
          ...card,
          location: transformation.location,
          dimensions: transformation.dimensions,
        }
      })
    );
  };

  const {undoables, undo, redo} = useUndoableEffects<PBT>({
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
          console.log(clone);
          return clone;
        })
      }
    }
  });

  const {moveCards, scaleCards, addCard, removeCards} = undoables;

  const startScaleCards = (handle: TransformHandle, location: Vector) => {
    uiRef.current.dragStart = location;
    const selectedCardsBounds = getTransformToolBounds();

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
          const cardBounds = Bounds.fromRect(
            Vector.fromData(card.location),
            Vector.fromData(card.dimensions)
          );
          return cardBounds.intersectsBounds(marqueeBounds);
        })
        .map(card => card.id);

      if (cardIdsToSelect.length) {
        selectCards(cardIdsToSelect);
      }
    } else if (uiRef.current.isDraggingCard) {
      uiRef.current.isDraggingCard = false;
      moveCards({
        selection: selection as MovePayload["selection"],
        from: uiRef.current.dragStart!,
        to: boardLocation
      });
    } else if (uiRef.current.isMouseDownOnTransformHandle) {
      uiRef.current.isMouseDownOnTransformHandle = false;
      scaleCards({
        from: uiRef.current.dragStart!,
        to: boardLocation,
        selection: selection as ScaleActionSelectionState,
        handle: uiRef.current.scaleTransformHandle!,
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

  const getTransformToolBounds = (): Bounds => {
    const selectedCardsBoundsArray = getSelectedCards().map(card =>
      Bounds.fromRect(
        Vector.fromData(card.location),
        Vector.fromData(card.dimensions)
      )
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

  return (
    <Root
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
            width: card.dimensions.x,
            height: card.dimensions.y,
            left: card.location.x + "px",
            top: card.location.y + "px",
            borderColor: isSelected(card) ? colors.highlight : "lightgray"
          }}
        >
          {card.text}
        </Card>
      ))}
      {isDraggingMarquee && (
        <Marquee style={BoundsToBoundsStyle(marqueeBounds)} />
      )}
      {hasSelection() && !uiRef.current.isDraggingCard && (
        <TransformToolDiv style={BoundsToRectStyle(getTransformToolBounds())}>
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
    </Root>
  );
};

const colors = {
  highlight: "#30C2FF"
};

const Root = styled.div`
  /* background-color: white; */
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  outline: none;
`;

const Card = styled.div`
  padding: 10px;
  background-color: white;
  position: absolute;
  overflow: hidden;
  border: 1px solid lightgray;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
`;

const Marquee = styled.div`
  background-color: transparent;
  border: 1px dashed black;
  position: absolute;
  pointer-events: none;
`;

const TransformToolDiv = styled.div`
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 2;
  border: 1px solid ${colors.highlight};
`;

const TransformToolHandle = styled.div`
  pointer-events: auto;
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${colors.highlight};
`;
