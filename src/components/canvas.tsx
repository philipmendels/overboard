import styled from '@emotion/styled';
import React, { useState } from 'react';
import { HandlersByType } from 'use-flexible-undo';
import { MoveCardsHandler, PBT, ScaleCardsHandler } from '../models/actions';
import { createNewCard, CardData } from '../models/card';
import { Bounds } from '../models/geom/bounds.model';
import { V, Vector, VectorData } from '../models/geom/vector.model';
import {
  MoveActionSelectionState,
  ScaleActionSelectionState,
  SelectionProps,
} from '../models/selection';
import {
  idEquals,
  handleSelection,
  BoundsToRectStyle,
  isItemInSelectionRecord,
  merge,
} from '../util/util';
import { TransformHandle } from './transform-tool/transform-handle.model';
import { TransformTool } from './transform-tool/transform-tool.model';
import { getTransformToolBounds } from './transform-tool/transform.util';

type CanvasProps = {
  cards: CardData[];
  undoables: HandlersByType<PBT>;
  moveCardsHandler: MoveCardsHandler;
  scaleCardsHandler: ScaleCardsHandler;
  animate: boolean;
} & SelectionProps;

type DragState =
  | {
      type: 'NONE';
    }
  | {
      type: 'CARDS';
      startLocation: Vector;
      location: Vector;
    }
  | {
      type: 'MARQUEE';
      startLocation: Vector;
      location: Vector;
    }
  | {
      type: 'TRANSFORM_HANDLE';
      handle: TransformHandle;
      startBounds: Bounds;
    };

const transformTool = new TransformTool();

export const Canvas: React.FC<CanvasProps> = ({
  cards,
  undoables,
  moveCardsHandler,
  scaleCardsHandler,
  animate,
  selection,
  select,
  deselect,
  clearSelection,
  mapSelection,
}) => {
  const isSelected = isItemInSelectionRecord(selection);

  const getSelectedCards = () => cards.filter(isSelected);

  const hasSelection = () => !!Object.values(selection).length;

  const [dragState, setDragState] = useState<DragState>({ type: 'NONE' });

  const [isDragging, setIsDragging] = useState(false);

  const getMarqueeBounds = (dragStartLocation: Vector, dragLocation: Vector) =>
    Bounds.fromPoints([dragStartLocation, dragLocation]);

  const getSelectionBounds = (): Bounds => {
    const selectedCardsBoundsArray = getSelectedCards().map(card =>
      Bounds.fromRect(card.location, card.dimensions)
    );
    return Bounds.fromShapes(selectedCardsBoundsArray);
  };

  const getCardById = (id: string) => cards.find(idEquals(id));

  const { moveCards, scaleCards, addCard, removeCards } = undoables;

  // UI events

  const dblclickBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    addCard(
      createNewCard(
        new Vector(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
      )
    );
  };

  const keyDownOnBoard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 8 || event.keyCode === 46) {
      event.preventDefault();
      // backspace and delete
      removeCards(
        getSelectedCards().map(card => ({
          card,
          index: cards.findIndex(idEquals(card.id)),
        }))
      );
    }
    // if(event.key  === 'ArrowDown') {
    //   undo();
    // }
    // if(event.key  === 'ArrowUp') {
    //   redo();
    // }
  };

  const mouseDownOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (hasSelection()) {
      clearSelection();
    }
    const location = new Vector(event.clientX, event.clientY);
    setDragState({
      type: 'MARQUEE',
      location,
      startLocation: location,
    });
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (dragState.type !== 'NONE') {
      setIsDragging(true);
    }
    if (dragState.type === 'MARQUEE' || dragState.type === 'CARDS') {
      setDragState(merge({ location: V(boardLocation) }));
    }
    if (dragState.type === 'CARDS') {
      moveCardsHandler(boardLocation, {
        selection: selection as MoveActionSelectionState,
      });
    } else if (dragState.type === 'TRANSFORM_HANDLE') {
      const ttBounds = getTransformToolBounds({
        startBounds: dragState.startBounds,
        handle: dragState.handle,
        mouseLocation: V(boardLocation),
      });
      scaleCardsHandler(ttBounds, {
        selection: selection as ScaleActionSelectionState,
      });
    }
    event.stopPropagation();
  };

  const mouseUpOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (isDragging) {
      if (dragState.type === 'MARQUEE') {
        const mb = getMarqueeBounds(
          dragState.startLocation,
          dragState.location
        );
        const cardIdsToSelect = cards
          .filter(card => {
            const cardBounds = Bounds.fromRect(card.location, card.dimensions);
            return cardBounds.intersectsBounds(mb);
          })
          .map(card => card.id);
        if (cardIdsToSelect.length) {
          select(cardIdsToSelect);
        }
      } else if (dragState.type === 'CARDS') {
        moveCards({
          selection: selection as MoveActionSelectionState,
          from: dragState.startLocation,
          to: boardLocation,
        });
      } else if (dragState.type === 'TRANSFORM_HANDLE') {
        scaleCards({
          from: dragState.startBounds,
          to: getSelectionBounds(),
          selection: selection as ScaleActionSelectionState,
        });
      }
    }
    setDragState({ type: 'NONE' });
    setIsDragging(false);
  };

  const mouseDownOnCard = (mouseDownCard: CardData) => (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.stopPropagation();
    const location = new Vector(event.clientX, event.clientY);
    setDragState({
      type: 'CARDS',
      location,
      startLocation: location,
    });
    handleSelection(
      event,
      isSelected(mouseDownCard),
      clearSelection,
      () => select([mouseDownCard.id]),
      () => deselect([mouseDownCard.id])
    );
    mapSelection<MoveActionSelectionState>(([id]) => {
      const card = getCardById(id);
      return {
        locationRel: card
          ? V(card.location).subtract(location)
          : new Vector(0, 0),
      };
    });
  };

  const mouseDownOnHandle = (
    event: React.MouseEvent<HTMLDivElement>,
    handle: TransformHandle
  ) => {
    event.stopPropagation();

    const startBounds = getSelectionBounds();

    setDragState({
      type: 'TRANSFORM_HANDLE',
      handle,
      startBounds,
    });

    const dimensions = startBounds.dimensions();

    mapSelection<ScaleActionSelectionState>(([id]) => {
      const card = getCardById(id);
      return {
        locationNorm: card
          ? V(card.location)
              .subtract(startBounds.topLeft())
              .divideByVector(dimensions)
          : new Vector(0, 0),
        dimensionsNorm: card
          ? V(card.dimensions).divideByVector(dimensions)
          : new Vector(0, 0),
      };
    });
  };

  return (
    <BoardArea
      tabIndex={0}
      onMouseMove={mouseMoveOnBoard}
      onMouseDown={mouseDownOnBoard}
      onMouseUp={mouseUpOnBoard}
      onKeyDown={keyDownOnBoard}
      onDoubleClick={dblclickBoard}
    >
      {cards
        .map((card, index) => ({ card, zIndex: index }))
        .slice()
        // fixed order in the DOM for css transitions to work consistently
        .sort((a, b) =>
          a.card.index > b.card.index ? -1 : a.card.index < b.card.index ? 1 : 0
        )
        .map(({ card, zIndex }) => (
          <Card
            key={card.id}
            onMouseDown={mouseDownOnCard(card)}
            onDoubleClick={e => e.stopPropagation()}
            style={{
              zIndex,
              ...BoundsToRectStyle(
                Bounds.fromRect(card.location, card.dimensions)
              ),
              background: card.background,
              // transform: `translate(${card.location.x}px, ${card.location.y}px) translateZ(0)`,
              boxShadow: isSelected(card)
                ? `inset 0px 0px 0px 1px white`
                : 'none',
              border: isSelected(card)
                ? `1px solid ${colors.highlight}`
                : `1px solid #eeeeee`,
            }}
            animate={animate}
          >
            {card.text}
          </Card>
        ))}
      {isDragging && dragState.type === 'MARQUEE' && (
        <Marquee
          style={BoundsToRectStyle(
            getMarqueeBounds(dragState.startLocation, dragState.location)
          )}
        />
      )}
      {hasSelection() && !(isDragging && dragState.type === 'CARDS') && (
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
              cursor: handle.getStyleCursor(),
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
  );
};

const colors = {
  highlight: '#48a7f6',
};

const BoardArea = styled.div`
  position: relative;
  outline: none;
  flex: 1;
  overflow: hidden;
  background: #eeeeee;
`;

const Card = styled.div<{ animate: boolean }>`
  color: white;
  padding: 10px;
  position: absolute;
  overflow: hidden;
  border-radius: 4px;
  cursor: move;
  user-select: none;
  box-sizing: border-box;
  overflow: hidden;
  transition: ${props => (props.animate ? 'all 0.3s ease-in-out' : 'none')};
`;

const Marquee = styled.div`
  background-color: transparent;
  border: 1px dashed ${colors.highlight};
  position: absolute;
  pointer-events: none;
`;

const TransformToolDiv = styled.div<{ animate: boolean }>`
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 1000000; // hacky 😬
  border: 1px solid ${colors.highlight};
  transition: ${props => (props.animate ? 'all 0.3s ease-in-out' : 'none')};
`;

const TransformToolHandle = styled.div<{ animate: boolean }>`
  pointer-events: auto;
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  border: 1px solid ${colors.highlight};
  transition: ${props => (props.animate ? 'all 0.3s ease-in-out' : 'none')};
`;
