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
export const getTransformation = (props: TransformationProps): Transformation => {
  const { handle, startBounds, mouseLocation, startBoundsOffset, startDimensions } = props;
  let scaleX;
  if (handle.isVertical()) {
    scaleX = 1;
  } else {
    let newW;
    if (handle.isOnLeftEdge()) {
      newW = startBounds.right() - mouseLocation.x;
    } else {
      newW = mouseLocation.x - startBounds.left();
    }
    scaleX = newW / startBounds.width();
  }
  let x;
  if (handle.isOnLeftEdge()) {
    x = startBounds.right() - (startBounds.width() - startBoundsOffset.x) * scaleX;
  } else {
    x = startBounds.left() + (startBoundsOffset.x * scaleX);
  }
  const w = Math.abs(startDimensions.x * scaleX);

  let scaleY;
  if (handle.isHorizontal()) {
    scaleY = 1;
  } else {
    let newH;
    if (handle.isOnTopEdge()) {
      newH = startBounds.bottom() - mouseLocation.y;
    } else {
      newH = mouseLocation.y - startBounds.top();
    }
    scaleY = newH / startBounds.height();
  }
  let y;
  if (handle.isOnTopEdge()) {
    y = startBounds.bottom() - (startBounds.height() - startBoundsOffset.y) * scaleY;
  } else {
    y = startBounds.top() + (startBoundsOffset.y * scaleY);
  }
  const h = Math.abs(startDimensions.y * scaleY);

  return {
    location: new Vector(x, y),
    dimensions: new Vector(w, h)
  }
}

