import { DirectionMap } from '../../geom/direction.enum';
import { TransformHandle } from './transform-handle.model';

export class TransformTool {
  public readonly handles = DirectionMap.map(item => new TransformHandle(item));
}
