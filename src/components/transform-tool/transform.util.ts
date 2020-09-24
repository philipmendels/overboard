import { Bounds } from "../../models/geom/bounds.model";
import { Vector } from "../../models/geom/vector.model";
import { TransformHandle } from "./transform-handle.model";

export type Transformation = {
  location: Vector,
  dimensions: Vector
}
export type TransformationProps = {
  startBounds: Bounds,
  startBoundsOffset: Vector,
  startDimensions: Vector,
  handle: TransformHandle,
  mouseLocation: Vector
}

// TODO: do not do this for every node
export const getTransformation = (props: TransformationProps): Transformation => {
  const { handle, startBounds, mouseLocation, startBoundsOffset, startDimensions } = props;

  const hFixed = handle.isOnLeftEdge() ? startBounds.right() : startBounds.left();
  const left = handle.isVertical() ? startBounds.left() : Math.min(mouseLocation.x, hFixed);
  const right = handle.isVertical() ? startBounds.right() : Math.max(mouseLocation.x, hFixed);

  const vFixed = handle.isOnTopEdge() ? startBounds.bottom() : startBounds.top();
  const top = handle.isHorizontal() ? startBounds.top() : Math.min(mouseLocation.y, vFixed);
  const bottom = handle.isHorizontal() ? startBounds.bottom() : Math.max(mouseLocation.y, vFixed);

  const bounds = new Bounds(left, top, right, bottom);
  const scaleX = bounds.width() / startBounds.width();
  const scaleY = bounds.height() / startBounds.height();

  return {
    location: new Vector(left + startBoundsOffset.x * scaleX, top + startBoundsOffset.y * scaleY),
    dimensions: new Vector(startDimensions.x * scaleX, startDimensions.y * scaleY)
  }
}

