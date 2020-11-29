import React, { FC } from 'react';
import styled from '@emotion/styled';
import { BiLayer, BiZoomIn, BiZoomOut, BiHistory } from 'react-icons/bi';
import { Vector } from '../geom/vector.model';
import { globalToLocal, localToGlobal } from '../board/board.util';
import { TransformProps } from '../board/board';

type BooleanDispatch = React.Dispatch<React.SetStateAction<boolean>>;

export type TopMenuProps = TransformProps & {
  showLayers: boolean;
  setShowLayers: BooleanDispatch;
  showHistory: boolean;
  setShowHistory: BooleanDispatch;
};

export const TopMenu: FC<TopMenuProps> = ({
  boardContainerRef,
  transform,
  setTransform,
  showHistory,
  setShowHistory,
  showLayers,
  setShowLayers,
}) => {
  const zoom = (direction: 'in' | 'out') => {
    setTransform(({ scale, translate }) => {
      const board = boardContainerRef.current;
      if (!board) return { scale, translate };
      const newScale =
        direction === 'in'
          ? Math.min(scale * 1.1, 3)
          : Math.max(scale / 1.1, 1 / 3);
      const rect = board.getBoundingClientRect();
      const globalA = new Vector(
        rect.left + 0.5 * rect.width,
        rect.top + 0.5 * rect.height
      );
      const localA = globalToLocal(
        globalA,
        boardContainerRef,
        translate,
        scale
      );
      const globalB = localToGlobal(
        localA,
        boardContainerRef,
        translate,
        newScale
      );
      const globalDiff = globalB.subtract(globalA);
      const newTranslate = translate.subtract(globalDiff);
      return {
        scale: newScale,
        translate: newTranslate,
      };
    });
  };

  return (
    <MenuBar>
      <IconButton
        onClick={() => setShowLayers(prev => !prev)}
        active={showLayers}
      >
        Layers&nbsp;
        <BiLayer size={20} />
      </IconButton>
      <ZoomLevel>{Math.round(transform.scale * 100)}%</ZoomLevel>
      &nbsp; &nbsp;
      <ZoomInButton size={20} onClick={() => zoom('in')} />
      &nbsp;&nbsp;
      <ZoomOutButton size={20} onClick={() => zoom('out')} />
      <IconButton
        onClick={() => setShowHistory(prev => !prev)}
        active={showHistory}
      >
        History&nbsp;
        <BiHistory size={20} />
      </IconButton>
    </MenuBar>
  );
};

const MenuBar = styled.div`
  flex: 0 0 40px;
  background: white;
  border-bottom: 1px solid #aaa;
  padding: 4px 16px;
  display: flex;
  align-items: center;
`;

const ZoomLevel = styled.span`
  width: 40px;
  margin-left: auto;
  text-align: end;
`;

const ZoomInButton = styled(BiZoomIn)`
  cursor: pointer;
`;

const ZoomOutButton = styled(BiZoomOut)`
  cursor: pointer;
  margin-right: auto;
`;

const IconButton = styled.span<{ active: boolean }>`
  display: flex;
  align-items: center;
  cursor: pointer;
  color: ${({ active }) => (active ? 'black' : '#aaa')};
  font-weight: bolder;
`;
