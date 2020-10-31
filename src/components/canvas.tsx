import styled from '@emotion/styled';
import { omit } from 'rambda';
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
  BoundsToRectStyle,
  isItemInSelectionRecord,
  merge,
  isSelectionKeyDown,
  reduceSelection,
} from '../util/util';
import { TransformHandle } from './transform-tool/transform-handle.model';
import { TransformTool } from './transform-tool/transform-tool.model';
import { getTransformToolBounds } from './transform-tool/transform.util';

import { Dialog } from '@reach/dialog';
import '@reach/dialog/styles.css';

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
      selection: MoveActionSelectionState;
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
      selection: ScaleActionSelectionState;
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
  clearSelection,
  updateSelection,
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

  const { moveCards, scaleCards, addCard, removeCards, updateText } = undoables;

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
        selection: dragState.selection,
      });
    } else if (dragState.type === 'TRANSFORM_HANDLE') {
      const ttBounds = getTransformToolBounds({
        startBounds: dragState.startBounds,
        handle: dragState.handle,
        mouseLocation: V(boardLocation),
      });
      scaleCardsHandler(ttBounds, {
        selection: dragState.selection,
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
          selection: dragState.selection,
          from: dragState.startLocation,
          to: boardLocation,
        });
      } else if (dragState.type === 'TRANSFORM_HANDLE') {
        scaleCards({
          from: dragState.startBounds,
          to: getSelectionBounds(),
          selection: dragState.selection,
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

    const isCardSelected = isSelected(mouseDownCard);
    const newSel = isSelectionKeyDown(event)
      ? isCardSelected
        ? omit([mouseDownCard.id])(selection)
        : { ...selection, [mouseDownCard.id]: null }
      : isCardSelected
      ? selection
      : { [mouseDownCard.id]: null };

    updateSelection(newSel);

    const dragSelState = reduceSelection(newSel, id => {
      const card = getCardById(id);
      return {
        locationRel: card
          ? V(card.location).subtract(location)
          : new Vector(0, 0),
      };
    });

    setDragState({
      type: 'CARDS',
      location,
      startLocation: location,
      selection: dragSelState,
    });
  };

  const mouseDownOnHandle = (
    event: React.MouseEvent<HTMLDivElement>,
    handle: TransformHandle
  ) => {
    event.stopPropagation();

    const startBounds = getSelectionBounds();

    const dimensions = startBounds.dimensions();

    const sel = reduceSelection(selection, id => {
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

    setDragState({
      type: 'TRANSFORM_HANDLE',
      handle,
      startBounds,
      selection: sel,
    });
  };

  const [dialogState, setDialogState] = React.useState('');
  const [dialogCardId, setDialogCardId] = React.useState<string | null>(null);

  return (
    <>
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
            a.card.index > b.card.index
              ? -1
              : a.card.index < b.card.index
              ? 1
              : 0
          )
          .map(({ card, zIndex }) => (
            <Card
              key={card.id}
              onMouseDown={mouseDownOnCard(card)}
              onDoubleClick={e => {
                e.stopPropagation();
                setDialogCardId(card.id);
                setDialogState(card.text);
              }}
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
      <DialogStyled
        isOpen={!!dialogCardId}
        onDismiss={() => setDialogCardId(null)}
      >
        <textarea
          value={dialogState}
          onChange={e => setDialogState(e.currentTarget.value)}
        ></textarea>

        <div className="footer">
          <button
            onClick={() => {
              setDialogCardId(null);
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (dialogCardId) {
                const c = getCardById(dialogCardId);
                if (c) {
                  updateText({
                    from: c.text,
                    to: dialogState,
                    id: dialogCardId,
                  });
                }
              }
              setDialogCardId(null);
            }}
          >
            Update text
          </button>
        </div>
      </DialogStyled>
    </>
  );
};

const DialogStyled = styled(Dialog)`
  border: 1px solid #eee;
  z-index: 1;
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  textarea {
    resize: none;
    padding: 8px;
    margin-bottom: 8px;
    height: 100px;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    > button {
      margin-left: 8px;
      padding: 4px 8px;
    }
  }
`;

const colors = {
  highlight: '#48a7f6',
};

const BoardArea = styled.div`
  z-index: 0;
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
