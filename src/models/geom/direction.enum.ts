import { DirectionMapItem } from "./direction-map-item";

export enum Orientation {
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
  DIAGONAL = 'DIAGONAL',
  ALL = 'ALL'
}

export enum Direction {
  TOP = 'TOP',
  TOPRIGHT = 'TOPRIGHT',
  RIGHT = 'RIGHT',
  BOTTOMRIGHT = 'BOTTOMRIGHT',
  BOTTOM = 'BOTTOM',
  BOTTOMLEFT = 'BOTTOMLEFT',
  LEFT = 'LEFT',
  TOPLEFT = 'TOPLEFT',
  ALL = 'ALL'
};

export enum DirectionCompass {
  N = 'N', NE = 'NE', E = 'E', SE = 'SE', S = 'S', SW = 'SW', W = 'W', NW = 'NW', ALL = 'ALL'
}

export const DirectionMap: DirectionMapItem[] = [
  new DirectionMapItem(Direction.TOP, DirectionCompass.N, Orientation.VERTICAL, -90),
  new DirectionMapItem(Direction.TOPRIGHT, DirectionCompass.NE, Orientation.DIAGONAL, -45),
  new DirectionMapItem(Direction.RIGHT, DirectionCompass.E, Orientation.HORIZONTAL, 0),
  new DirectionMapItem(Direction.BOTTOMRIGHT, DirectionCompass.SE, Orientation.DIAGONAL, 45),
  new DirectionMapItem(Direction.BOTTOM, DirectionCompass.S, Orientation.VERTICAL, 90),
  new DirectionMapItem(Direction.BOTTOMLEFT, DirectionCompass.SW, Orientation.DIAGONAL, 135),
  new DirectionMapItem(Direction.LEFT, DirectionCompass.W, Orientation.HORIZONTAL, 180),
  new DirectionMapItem(Direction.TOPLEFT, DirectionCompass.NW, Orientation.DIAGONAL, -135),
]

