import { Vector } from '../geom/vector.model';

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

export const globalToLocal = (
  v: Vector,
  containerRef: React.RefObject<HTMLElement>,
  translate: Vector,
  scale: number
): Vector => {
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

export const localToGlobal = (
  v: Vector,
  containerRef: React.RefObject<HTMLElement>,
  translate: Vector,
  scale: number
): Vector => {
  const container = containerRef.current;
  if (container) {
    const rect = container.getBoundingClientRect();
    return v
      .multiply(scale)
      .add(translate)
      .subtract(new Vector(container.scrollLeft, container.scrollTop))
      .add(new Vector(rect.left, rect.top));
  }
  return v;
};
