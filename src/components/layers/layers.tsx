import * as React from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd';
import styled from '@emotion/styled';
import { handleSelection, isItemInSelectionRecord } from '../../util/util';
import { HandlersByType } from 'use-flexible-undo';
import { PBT } from '../../models/actions';
import { CardData } from '../../models/card';
import { SelectionProps } from '../../models/selection';

type Props = {
  cards: CardData[];
  undoables: HandlersByType<PBT>;
} & SelectionProps;

export const Layers: React.FC<Props> = ({
  cards,
  undoables,
  selection,
  clearSelection,
  deselect,
  select,
}) => {
  const { reorderCard } = undoables;

  const isSelectedCard = isItemInSelectionRecord(selection);

  const reverseIndex = (index: number): number => cards.length - 1 - index;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = reverseIndex(result.source.index);
    reorderCard({
      from: sourceIndex,
      to: reverseIndex(result.destination.index),
      id: cards[sourceIndex].id,
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable">
        {provided => (
          <Root
            ref={provided.innerRef}
            onMouseDown={() =>
              Object.keys(selection).length && clearSelection()
            }
          >
            {cards
              .slice()
              .reverse()
              .map((card, index) => (
                <Draggable key={card.id} draggableId={card.id} index={index}>
                  {provided2 => {
                    const isSelected = isSelectedCard(card);
                    return (
                      <Layer
                        isSelected={isSelected}
                        ref={provided2.innerRef}
                        {...provided2.draggableProps}
                        {...provided2.dragHandleProps}
                        style={{
                          ...provided2.draggableProps.style,
                        }}
                        onMouseDown={e => {
                          e.stopPropagation();
                          handleSelection(
                            e,
                            isSelected,
                            clearSelection,
                            () => select([card.id]),
                            () => deselect([card.id])
                          );
                        }}
                      >
                        {card.text}
                      </Layer>
                    );
                  }}
                </Draggable>
              ))}
            {provided.placeholder}
          </Root>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const Root = styled.div`
  width: 200px;
  border-left: 1px solid #aaa;
  height: 100%;
  overflow-y: scroll;
`;

const Layer = styled.div<{ isSelected: boolean }>`
  padding: 8px;
  user-select: none;
  margin: 4px 8px;
  border-radius: 4px;
  outline: none;
  /* border-bottom: 1px solid #ddd; */
  background-color: ${({ isSelected }) =>
    isSelected ? '#48a7f6' : 'transparent'};
  color: ${({ isSelected }) => (isSelected ? 'white' : 'inherit')};
  &:hover {
    background: ${({ isSelected }) => (isSelected ? '#48a7f6' : '#f7f8fa')};
  }
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;
