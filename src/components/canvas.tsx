import styled from '@emotion/styled';
import { omit } from 'rambda';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HandlersByType } from 'use-flexible-undo';
import { MoveCardsHandler, PBT, ScaleCardsHandler } from '../models/actions';
import { createNewCard, CardData } from '../models/card';
import { Bounds } from '../models/geom/bounds.model';
import { V, Vector } from '../models/geom/vector.model';
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
import { useGesture } from 'react-use-gesture';
import { getScrollVectors, globalToLocal, localToGlobal } from './canvas.util';

type CanvasProps = {
  cards: CardData[];
  undoables: HandlersByType<PBT>;
  moveCardsHandler: MoveCardsHandler;
  scaleCardsHandler: ScaleCardsHandler;
  animate: boolean;
  transform: {
    scale: number;
    translate: Vector;
  };
  setTransform: React.Dispatch<
    React.SetStateAction<{
      scale: number;
      translate: Vector;
    }>
  >;
  containerRef: React.RefObject<HTMLDivElement>;
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
  e.preventDefault();
});
window.addEventListener(
  'wheel',
  event => {
    const { ctrlKey } = event;
    if (ctrlKey) {
      event.preventDefault();
    }
  },
  { passive: false }
);

const scrollBuffer = new Vector(300, 300);

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
  transform,
  setTransform,
  containerRef,
}) => {
  const isSelected = isItemInSelectionRecord(selection);

  const getSelectedCards = () => cards.filter(isSelected);

  const hasSelection = () => !!Object.values(selection).length;

  const [dragState, setDragState] = useState<DragState>({ type: 'NONE' });

  // isDragging cannot be derived from dragState because dragState
  // is set on mouseDown and isDragging on first mouseMove. Unless we look
  // at the cursor delta.
  const [isDragging, setIsDragging] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  const getMarqueeBounds = (dragStartLocation: Vector, dragLocation: Vector) =>
    Bounds.fromPoints([dragStartLocation, dragLocation]);

  const getSelectionBounds = (): Bounds => {
    const selectedCardsBoundsArray = getSelectedCards().map(card =>
      Bounds.fromRect(card.location, card.dimensions)
    );
    return Bounds.fromShapes(selectedCardsBoundsArray);
  };

  const contentBounds = useMemo(() => {
    const cardsBoundsArray = cards.map(card =>
      Bounds.fromRect(card.location, card.dimensions)
    );
    return Bounds.fromShapes(cardsBoundsArray);
  }, [cards]);

  const getCardById = (id: string) => cards.find(idEquals(id));

  const { moveCards, scaleCards, addCard, removeCards, updateText } = undoables;

  // UI events

  const dblclickBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    addCard(
      createNewCard(globalToLocal2(new Vector(event.clientX, event.clientY)))
    );
  };

  const globalToLocal2 = (v: Vector) =>
    globalToLocal(v, containerRef, translate, scale);

  const localToGlobal2 = (v: Vector, scaleValue = scale) =>
    localToGlobal(v, containerRef, translate, scaleValue);

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
    const location = globalToLocal2(new Vector(event.clientX, event.clientY));
    setDragState({
      type: 'MARQUEE',
      location,
      startLocation: location,
    });
  };

  const mouseMoveOnBoard = (event: React.MouseEvent<HTMLDivElement>): void => {
    const boardLocation = globalToLocal2(
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
    const boardLocation = globalToLocal2(
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
    // The following triggers scroll correction in an effect:
    setIsDragging(false);
  };

  const mouseDownOnCard = (mouseDownCard: CardData) => (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.stopPropagation();
    const location = globalToLocal2(new Vector(event.clientX, event.clientY));

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

  // Point for temporarily fixing the scrollWidth and scrollHeight of the container
  // so that no automatic scrolling occurs while zooming out or
  // while dragging inwards / scaling down content.
  const [scrollSizePoint, setScrollSizePoint] = useState(new Vector(0, 0));

  const [dialogState, setDialogState] = React.useState('');
  const [dialogCardId, setDialogCardId] = React.useState<string | null>(null);

  // const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGesture(
    {
      onPinchStart: () => {
        setIsZooming(true);
      },
      onPinch: state => {
        setTransform(({ scale, translate }) => {
          const newScale = Math.max(
            0.33,
            Math.min(3, scale + (state.vdva[0] * scale) / 10)
          );
          const e = state.event as MouseEvent;

          // Instead of getting the cursor position on each update
          // we could store it at pinchStart. But this seems to work ok.
          const globalA = new Vector(e.clientX, e.clientY);
          const localA = globalToLocal2(globalA);
          const globalB = localToGlobal2(localA, newScale);
          const globalDiff = globalB.subtract(globalA);
          const newTranslate = translate.subtract(globalDiff);
          return {
            scale: newScale,
            translate: newTranslate,
          };
        });
      },
      onPinchEnd: () => {
        // Correcting scroll while zooming is a bit shaky.
        // The following will trigger scroll correction in an effect.
        setIsZooming(false);
      },
    },
    {
      domTarget: containerRef,
      eventOptions: { passive: false },
    }
  );
  const { scale, translate } = transform;

  const contentTopLeftGlobal = contentBounds
    .topLeft()
    .subtract(scrollBuffer)
    .multiply(scale)
    .add(translate);

  const contentBottomRightGlobal = contentBounds
    .bottomRight()
    .add(scrollBuffer)
    .multiply(scale)
    .add(translate);

  const container = containerRef.current;

  const containerCenterGlobal = new Vector(
    container ? 0.5 * container.clientWidth : 500,
    container ? 0.5 * container.clientHeight : 500
  );

  // Mirror the content top-left over the center of the view,
  // to ensure there is always enough scroll-space available
  // to execute the scroll-correction for a negative content
  // top-left.
  const contentTopLeftGlobalMirrored = containerCenterGlobal.add(
    containerCenterGlobal.subtract(contentTopLeftGlobal)
  );

  // The following two effects can be merged, but let's keep them
  // separate for clarity.

  useLayoutEffect(() => {
    if (!isDragging && !isZooming) {
      correctScrollTopLeft();
    }
    // This effect should run when setting scale with a discrete
    // action (e.g. button click) or at the end of a continuous
    // action (e.g. pinch-to-zoom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, isZooming]);

  useLayoutEffect(() => {
    if (!isDragging && !isZooming) {
      correctScrollTopLeft();
    }
    // This effect should run when updating bounds with a discrete
    // action (e.g. undo / redo) or at the end of a continuous
    // action (e.g. dragging/scaling content).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBounds, isDragging]);

  // It is not possibe to scroll to negative values, so we need to
  // to translate positively and scroll the same amount positively
  // in order to correct the view. Oppositely, if there is too much
  // scroll space top-left then we need to translate and scroll
  // in the negative direction.
  const correctScrollTopLeft = () => {
    const container = containerRef.current;
    if (container) {
      const { scrollPos, scrollSpace } = getScrollVectors(container);

      const diff = new Vector(
        contentTopLeftGlobal.x >= 0
          ? Math.min(scrollPos.x, contentTopLeftGlobal.x)
          : -Math.min(scrollSpace.x, -contentTopLeftGlobal.x),
        contentTopLeftGlobal.y >= 0
          ? Math.min(scrollPos.y, contentTopLeftGlobal.y)
          : -Math.min(scrollSpace.y, -contentTopLeftGlobal.y)
      );
      const newScrollPos = scrollPos.subtract(diff);
      container.scrollTo({ left: newScrollPos.x, top: newScrollPos.y });

      // This update of 'translate' will trigger scroll correction
      // for bottom-right in an effect. Maybe we can do it here directly instead.
      setTransform(({ scale, translate }) => {
        return {
          scale,
          translate: translate.subtract(diff),
        };
      });
    }
  };

  useLayoutEffect(() => {
    // ignore translation changes due to zooming:
    if (!isZooming) {
      correctScrollBottomRight();
    }
    // This effect should run when translate changes due to correctScrollTopLeft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate]);

  const correctScrollBottomRight = () => {
    const container = containerRef.current;
    if (container) {
      const { scrollSpace } = getScrollVectors(container);
      // Cannot simply set scrollSizePoint to the current scrollSize because
      // the scrollSizePoint influences the scrollSize so it will never get smaller.
      setScrollSizePoint(prev =>
        prev
          .subtract(scrollSpace)
          .max(contentTopLeftGlobalMirrored)
          .max(contentBottomRightGlobal)
      );
    }
  };

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
            transform: `translate(${scrollSizePoint.x}px, ${scrollSizePoint.y}px)`,
            background: 'purple',
          }}
        />
        <Point
          style={{
            transform: `translate(${containerCenterGlobal.x}px, ${containerCenterGlobal.y}px)`,
            background: 'orange',
          }}
        />
        <Point
          style={{
            transform: `translate(${contentTopLeftGlobal.x}px, ${contentTopLeftGlobal.y}px)`,
            background: 'red',
          }}
        />
        <Point
          style={{
            transform: `translate(${contentTopLeftGlobalMirrored.x}px, ${contentTopLeftGlobalMirrored.y}px)`,
            background: 'green',
          }}
        />
        <Point
          style={{
            transform: `translate(${contentBottomRightGlobal.x}px, ${contentBottomRightGlobal.y}px)`,
            background: 'blue',
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
  background: #eeeeee;
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
