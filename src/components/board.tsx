import styled from "@emotion/styled";
import { VectorData, Vector, V } from "../models/geom/vector.model";
import { useRef, useState, useEffect } from "react";
import { CardData, createNewCard } from "../models/card";
import {
  handleSelection,
  updateAllInObjMap,
  updateSomeInArray,
  merge,
  filterObjMap,
  addToObjMap,
  keyEqualsNot,
  valueToKV,
  idEquals,
  BoundsToBoundsStyle,
  concatArray,
  BoundsToRectStyle
} from "../util/util";
import { Action, registerAction, doAction, undo } from "../util/action-util";
import * as React from "react";
import {
  SelectionState,
  SelectedItemsState,
  SelectedItem,
  MoveActionItemState
} from "../models/selection";
import { Bounds } from "../models/geom/bounds.model";
import { TransformTool } from "./transform-tool/transform-tool.model";
import { TransformHandle } from "./transform-tool/transform-handle.model";

interface MovePayload {
  selection: {
    [id: string]: MoveActionItemState;
  };
  from: VectorData;
  to: VectorData;
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
    isMouseDownOnTransformHandle: false
  });

  const actionsRef = useRef({
    move: null as Action<MovePayload> | null
  });

  useEffect(() => {
    actionsRef.current.move = registerAction<MovePayload>({
      id: "MOVE",
      describe: ({ selection }) =>
        `Move ${Object.keys(selection).length} cards`,
      do: ({ selection, to }) => moveCards(selection, to),
      undo: ({ selection, from }) => moveCards(selection, from)
    });
  }, []);

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
      moveCards(selection as MovePayload["selection"], boardLocation);
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
    }
    event.stopPropagation();
  };

  const dblclickBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    setCards(
      concatArray(
        createNewCard(
          new Vector(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
        )
      )
    );
  };

  const startMoveCards = (location: Vector) => {
    uiRef.current.dragStart = location;
    setSelection(
      updateAllInObjMap(([id, _]) => ({
        startMoveMouseOffset: V(getCard(id)!.location).subtract(location)
      }))
    );
  };

  const moveCards = (selection: MovePayload["selection"], to: VectorData) => {
    setCards(
      updateSomeInArray(isCardInSelection(selection), card => ({
        ...card,
        location: V(to).add(selection[card.id].startMoveMouseOffset)
      }))
    );
  };

  const startScaleCards = (handle: TransformHandle) => {};

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
      doAction(actionsRef.current.move!, {
        selection: selection as MovePayload["selection"],
        from: uiRef.current.dragStart!,
        to: boardLocation
      });
    }
    uiRef.current.isMouseDownOnBoard = false;
    uiRef.current.isMouseDownOnCard = false;
    uiRef.current.isDraggingCard = false;
    setIsDraggingMarquee(false);
  };

  const keyDownOnBoard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 8 || event.keyCode === 46) {
      // backspace and delete
      // this.props.removeCards();
      undo();
      event.stopPropagation();
      event.preventDefault();
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
    startScaleCards(handle);
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
