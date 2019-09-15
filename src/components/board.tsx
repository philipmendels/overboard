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
  idEquals
} from "../util/util";
import { Action, registerAction, doAction, undo } from "../util/action-util";
import * as React from "react";
import {
  SelectionState,
  SelectedItemsState,
  SelectedItem,
  MoveActionItemState
} from "../models/selection";

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
  const getCard = (id: string) => cards.find(idEquals(id));
  const [selection, setSelection] = useState(initialSelection);
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

  const uiRef = useRef({
    isDraggingCard: false,
    isMouseDownOnBoard: false,
    isMouseDownOnCard: false,
    dragStart: null as Vector | null
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

  const mouseDownOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (hasSelection()) {
      clearSelection();
    }
    uiRef.current.isMouseDownOnBoard = true;
    // this.marqueeStartLocation = new Vector(event.clientX, event.clientY).subtract(this.getOffset());
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (uiRef.current.isMouseDownOnCard) {
      uiRef.current.isDraggingCard = true;
      moveCards(selection as MovePayload["selection"], boardLocation);
    }
    event.stopPropagation();
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
    if (uiRef.current.isDraggingCard) {
      uiRef.current.isDraggingCard = false;
      doAction(actionsRef.current.move!, {
        selection: selection as MovePayload["selection"],
        from: uiRef.current.dragStart!,
        to: boardLocation
      });
    }
    uiRef.current.isMouseDownOnBoard = false;
    uiRef.current.isMouseDownOnCard = false;
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

  return (
    <Root
      tabIndex={0}
      onMouseMove={mouseMoveOnBoard}
      onMouseDown={mouseDownOnBoard}
      onMouseUp={mouseUpOnBoard}
      onKeyDown={keyDownOnBoard}
    >
      {cards.map(card => (
        <Card
          key={card.id}
          onMouseDown={mouseDownOnCard(card)}
          style={{
            left: card.location.x + "px",
            top: card.location.y + "px",
            borderColor: isSelected(card) ? "#30C2FF" : "lightgray"
          }}
        >
          {card.text}
        </Card>
      ))}
    </Root>
  );
};

const Root = styled.div`
  background-color: white;
  width: 100vw;
  height: 100vh;
  outline: "none";
  overflow: "hidden";
  outline: none;
`;

const Card = styled.div`
  width: 100px;
  height: 100px;
  padding: 10px;
  background-color: white;
  position: absolute;
  overflow: hidden;
  border: 1px solid lightgray;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
`;
