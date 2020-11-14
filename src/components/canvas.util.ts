import { Vector } from '../models/geom/vector.model';

export const getScrollVectors = (container: HTMLDivElement) => {
  const scrollSize = new Vector(container.scrollWidth, container.scrollHeight);
  const containerSize = new Vector(
    container.clientWidth,
    container.clientHeight
  );
  const scrollPos = new Vector(container.scrollLeft, container.scrollTop);

  return {
    scrollSize,
    containerSize,
    scrollPos,
    scrollSpace: scrollSize.subtract(containerSize).subtract(scrollPos),
  };
};
