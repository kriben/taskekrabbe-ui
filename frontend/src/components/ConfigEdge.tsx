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
      style={{ stroke: '#66d9a0', strokeWidth: 1.5, strokeDasharray: '5,3' }}
      label={label}
      labelStyle={{ fill: '#88bb99', fontSize: 10 }}
      labelBgStyle={{ fill: '#1a2e1a' }}
      labelBgPadding={[4, 2] as [number, number]}
    />
  );
}
