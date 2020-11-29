import styled from '@emotion/styled';
import React, { FC } from 'react';
import { Vector } from '../geom/vector.model';

interface Props {
  scrollSizePoint: Vector;
  containerCenterGlobal: Vector;
  contentTopLeftGlobal: Vector;
  contentTopLeftGlobalMirrored: Vector;
  contentBottomRightGlobal: Vector;
}
export const ScrollPoints: FC<Props> = ({
  containerCenterGlobal,
  contentBottomRightGlobal,
  contentTopLeftGlobal,
  contentTopLeftGlobalMirrored,
  scrollSizePoint,
}) => (
  <>
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
  </>
);

const Point = styled.div`
  opacity: 0;
  pointer-events: none;
  left: -10px;
  top: -10px;
  width: 10px;
  height: 10px;
  position: absolute;
`;
