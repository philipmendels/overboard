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

type DragType = 'NONE' | 'CARDS' | 'MARQUEE' | 'TRANSFORM_HANDLE';

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
  const hasSelection = () => Object.values(selection).length;

  const [dragType, setDragType] = useState<DragType>('NONE');
  const [dragStartLocation, setDragStartLocation] = useState<Vector | null>(
    null
  );
  const [dragLocation, setDragLocation] = useState<Vector | null>(null);
  const getIsDragging = () => dragLocation !== null;

  const [
    activeTransformHandle,
    setActiveTransformHandle,
  ] = useState<TransformHandle | null>(null);

  const [scaleStartBounds, setScaleStartBounds] = useState<Bounds | null>(null);

  const getMarqueeBounds = () =>
    dragLocation &&
    dragStartLocation &&
    Bounds.fromPoints([dragLocation, dragStartLocation]);

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
    setDragType('MARQUEE');

    setDragStartLocation(new Vector(event.clientX, event.clientY));
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation: VectorData = { x: event.clientX, y: event.clientY };
    if (dragType !== 'NONE') {
      setDragLocation(V(boardLocation));
    }
    if (dragType === 'CARDS') {
      moveCardsHandler(boardLocation, {
        selection: selection as MoveActionSelectionState,
      });
    } else if (dragType === 'TRANSFORM_HANDLE') {
      const ttBounds = getTransformToolBounds({
        startBounds: scaleStartBounds!,
        handle: activeTransformHandle!,
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
    if (getIsDragging()) {
      if (dragType === 'MARQUEE') {
        const mb = getMarqueeBounds()!;
        const cardIdsToSelect = cards
          .filter(card => {
            const cardBounds = Bounds.fromRect(card.location, card.dimensions);
            return cardBounds.intersectsBounds(mb);
          })
          .map(card => card.id);
        if (cardIdsToSelect.length) {
          select(cardIdsToSelect);
        }
      } else if (dragType === 'CARDS') {
        moveCards({
          selection: selection as MoveActionSelectionState,
          from: dragStartLocation!,
          to: boardLocation,
        });
      } else if (dragType === 'TRANSFORM_HANDLE') {
        scaleCards({
          from: scaleStartBounds!,
          to: getSelectionBounds(),
          selection: selection as ScaleActionSelectionState,
        });
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
    setDragStartLocation(loc);
    setDragType('CARDS');
    handleSelection(
      event,
      isSelected(mouseDownCard),
      clearSelection,
      () => select([mouseDownCard.id]),
      () => deselect([mouseDownCard.id])
    );
    mapSelection<MoveActionSelectionState>(([id]) => ({
      locationRel: V(getCardById(id)!.location).subtract(loc),
    }));
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

    mapSelection<ScaleActionSelectionState>(([id]) => {
      const selectedCard = getCardById(id)!;
      return {
        locationNorm: V(selectedCard.location)
          .subtract(selectedCardsBounds.topLeft())
          .divideByVector(dimensions),
        dimensionsNorm: V(selectedCard.dimensions).divideByVector(dimensions),
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
        .slice()
        // fixed order in the DOM for css transitions to work consistently
        .sort((a, b) => (a.index > b.index ? -1 : a.index < b.index ? 1 : 0))
        .map(card => (
          <Card
            key={card.id}
            onMouseDown={mouseDownOnCard(card)}
            onDoubleClick={e => e.stopPropagation()}
            style={{
              zIndex: cards.findIndex(idEquals(card.id)),
              ...BoundsToRectStyle(
                Bounds.fromRect(card.location, card.dimensions)
              ),
              background: card.background,
              // transform: `translate(${card.location.x}px, ${card.location.y}px)`,
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
      {getIsDragging() && dragType === 'MARQUEE' && (
        <Marquee style={BoundsToRectStyle(getMarqueeBounds()!)} />
      )}
      {getSelectedCards().length > 0 &&
        !(getIsDragging() && dragType === 'CARDS') && (
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
  transition: all 1s ease-in-out;
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
  z-index: 2;
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
