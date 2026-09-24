import { forwardRef, useImperativeHandle } from 'react';
import { EdgeHoverCard } from './EdgeHoverCard';
import { useModelGraph, type ModelGraphHandle, type ModelGraphOptions } from './useModelGraph';

export type { ModelGraphHandle } from './useModelGraph';

export const ModelGraph = forwardRef<ModelGraphHandle, ModelGraphOptions>(function ModelGraph(props, ref) {
  const { containerRef, edgeHover, controls } = useModelGraph(props);
  useImperativeHandle(ref, () => controls, [controls]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {edgeHover ? <EdgeHoverCard {...edgeHover} /> : null}
    </div>
  );
});
