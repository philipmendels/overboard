import styled from '@emotion/styled';
import { omit } from 'rambda';
import React, { useLayoutEffect, useRef, useState } from 'react';
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
import { usePinch } from 'react-use-gesture';

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

document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => {
  console.log('whgesturechangeeelevent');
  e.preventDefault();
});
window.addEventListener(
  'wheel',
  event => {
    // console.log('wheelevent');
    const { ctrlKey } = event;
    if (ctrlKey) {
      event.preventDefault();
    }
  },
  { passive: false }
);

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
      createNewCard(globalToLocal(new Vector(event.clientX, event.clientY)))
    );
  };

  const globalToLocal = (v: Vector): Vector => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      return v
        .subtract(new Vector(rect.left, rect.top))
        .add(new Vector(container.scrollLeft, container.scrollTop))
        .subtract(translate)
        .divide(scale);
    }
    return v;
  };

  const localToGlobal = (v: Vector, scaleValue = scale): Vector => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      return v
        .multiply(scaleValue)
        .add(translate)
        .subtract(new Vector(container.scrollLeft, container.scrollTop))
        .add(new Vector(rect.left, rect.top));
    }
    return v;
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
    const location = globalToLocal(new Vector(event.clientX, event.clientY));
    setDragState({
      type: 'MARQUEE',
      location,
      startLocation: location,
    });
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation = globalToLocal(
      new Vector(event.clientX, event.clientY)
    );
    if (dragState.type !== 'NONE') {
      setIsDragging(true);
    }
    if (dragState.type === 'MARQUEE' || dragState.type === 'CARDS') {
      setDragState(merge({ location: boardLocation }));
    }
    if (dragState.type === 'CARDS') {
      moveCardsHandler(boardLocation, {
        selection: dragState.selection,
      });
    } else if (dragState.type === 'TRANSFORM_HANDLE') {
      const ttBounds = getTransformToolBounds({
        startBounds: dragState.startBounds,
        handle: dragState.handle,
        mouseLocation: boardLocation,
      });
      scaleCardsHandler(ttBounds, {
        selection: dragState.selection,
      });
    }
    event.stopPropagation();
  };

  const mouseUpOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation = globalToLocal(
      new Vector(event.clientX, event.clientY)
    );
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
    const location = globalToLocal(new Vector(event.clientX, event.clientY));

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

  const [br, setBr] = useState(new Vector(0, 0));

  const [transform, setTransform] = useState({
    scale: 1,
    translate: new Vector(0, 0),
    correctWithScroll: false,
  });
  const [dialogState, setDialogState] = React.useState('');
  const [dialogCardId, setDialogCardId] = React.useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  usePinch(
    state => {
      if (state.first) {
        setBr(prev => {
          const container = containerRef.current;
          return container
            ? new Vector(container.scrollWidth, container.scrollHeight)
            : prev;
        });
      }
      setTransform(({ scale, translate }) => {
        const newScale = Math.max(
          0.33,
          Math.min(3, scale + (state.vdva[0] * scale) / 10)
        );

        const e = state.event as MouseEvent;

        const globalA = new Vector(e.clientX, e.clientY);
        const localA = globalToLocal(globalA);
        const globalB = localToGlobal(localA, newScale);
        const globalDiff = globalB.subtract(globalA);
        const newTranslate = translate.subtract(globalDiff);
        return {
          scale: newScale,
          translate: newTranslate,
          correctWithScroll: state.last,
        };
      });
    },
    {
      domTarget: containerRef,
      eventOptions: { passive: false },
    }
  );
  const { scale, translate, correctWithScroll: fromZoom } = transform;

  const c = new Vector(0, 0).multiply(scale).add(translate);

  const container = containerRef.current;

  const center = new Vector(
    container ? 0.5 * container.clientWidth : 500,
    container ? 0.5 * container.clientHeight : 500
  );

  const c2 = center.add(center.subtract(c));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && fromZoom) {
      const scrollSize = new Vector(
        container.scrollWidth,
        container.scrollHeight
      );
      const containerSize = new Vector(
        container.clientWidth,
        container.clientHeight
      );
      const scrollPos = new Vector(container.scrollLeft, container.scrollTop);
      const scrollSpace = scrollSize
        .subtract(containerSize)
        .subtract(scrollPos);

      const diff = new Vector(
        translate.x >= 0
          ? Math.min(scrollPos.x, translate.x)
          : -Math.min(scrollSpace.x, -translate.x),
        translate.y >= 0
          ? Math.min(scrollPos.y, translate.y)
          : -Math.min(scrollSpace.y, -translate.y)
      );
      const newScrollPos = scrollPos.subtract(diff);
      container.scrollTo({ left: newScrollPos.x, top: newScrollPos.y });

      const newScrollSpace = scrollSize
        .subtract(containerSize)
        .subtract(newScrollPos);

      setTransform(({ scale, translate }) => {
        return {
          scale,
          translate: translate.subtract(diff),
          correctWithScroll: false,
        };
      });

      setBr(prev => prev.subtract(newScrollSpace).max(c2));
    }
  }, [translate, fromZoom, scale, c2]);

  return (
    <>
      <BoardArea
        tabIndex={0}
        onMouseMove={mouseMoveOnBoard}
        onMouseDown={mouseDownOnBoard}
        onMouseUp={mouseUpOnBoard}
        onKeyDown={keyDownOnBoard}
        onDoubleClick={dblclickBoard}
        ref={containerRef}
      >
        <CanvasContent
          ref={contentRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale}, ${scale})`,
          }}
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
              style={{
                ...BoundsToRectStyle(
                  getMarqueeBounds(dragState.startLocation, dragState.location)
                ),
                borderWidth: 1 / scale + 'px',
              }}
            />
          )}
          {hasSelection() && !(isDragging && dragState.type === 'CARDS') && (
            <TransformToolDiv
              animate={animate}
              style={{
                ...BoundsToRectStyle(getSelectionBounds()),
                borderWidth: 1 / scale + 'px',
              }}
            >
              {transformTool.handles.map((handle, index) => {
                const handleStyle = {
                  left: handle.getStyleLeft(),
                  top: handle.getStyleTop(),
                  widht: handle.getSize(),
                  height: handle.getSize(),
                  cursor: handle.getStyleCursor(),
                  transform: `scale(${Math.max(0.5, 1 / scale)})`,
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
        </CanvasContent>
        <Point
          style={{
            transform: `translate(${br.x}px, ${br.y}px)`,
            background: 'purple',
          }}
        />
        <Point
          style={{
            transform: `translate(${center.x}px, ${center.y}px)`,
            background: 'orange',
          }}
        />
        <Point
          style={{
            transform: `translate(${c.x}px, ${c.y}px)`,
            background: 'red',
          }}
        />
        <Point
          style={{
            transform: `translate(${c2.x}px, ${c2.y}px)`,
            background: 'green',
          }}
        />
      </BoardArea>
      <DialogStyled
        aria-label="text dialog"
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
  min-width: 0;
  overflow: auto;
`;

const Point = styled.div`
  opacity: 0;
  pointer-events: none;
  left: -10px;
  top: -10px;
  width: 10px;
  height: 10px;
  position: absolute;
`;

const CanvasContent = styled.div`
  width: 2000px;
  height: 1000px;
  transform-origin: 0 0;
  position: absolute;
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
