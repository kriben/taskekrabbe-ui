import { type EdgeProps, BaseEdge, getSmoothStepPath } from '@xyflow/react';

export function ConfigEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const label = sourceHandleId || undefined;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: '#15803d', strokeWidth: 1.5, strokeDasharray: '5,3' }}
      label={label}
      labelStyle={{ fill: '#15803d', fontSize: 10 }}
      labelBgStyle={{ fill: '#ffffff' }}
      labelBgPadding={[4, 2] as [number, number]}
    />
  );
}
