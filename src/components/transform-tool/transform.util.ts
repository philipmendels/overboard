import { Bounds } from "../../models/geom/bounds.model";
import { Vector } from "../../models/geom/vector.model";
import { TransformHandle } from "./transform-handle.model";

interface Props {
  startBounds: Bounds,
  handle: TransformHandle,
  mouseLocation: Vector
}

export const getTransformToolBounds = (props: Props) => {
  const { handle, startBounds, mouseLocation } = props;

  const hFixed = handle.isOnLeftEdge() ? startBounds.right() : startBounds.left();
  const left = handle.isVertical() ? startBounds.left() : Math.min(mouseLocation.x, hFixed);
  const right = handle.isVertical() ? startBounds.right() : Math.max(mouseLocation.x, hFixed);

  const vFixed = handle.isOnTopEdge() ? startBounds.bottom() : startBounds.top();
  const top = handle.isHorizontal() ? startBounds.top() : Math.min(mouseLocation.y, vFixed);
  const bottom = handle.isHorizontal() ? startBounds.bottom() : Math.max(mouseLocation.y, vFixed);

  return new Bounds(left, top, right, bottom);
}

export const getTransformation = (
  startBoundsOffset: Vector, 
  startDimensions: Vector, 
  transformToolBounds: Bounds, 
  transformToolScale: Vector
) => {
  return {
    location: transformToolBounds.topLeft().add(startBoundsOffset.scale(transformToolScale)),
    dimensions: startDimensions.scale(transformToolScale)
  }
};


