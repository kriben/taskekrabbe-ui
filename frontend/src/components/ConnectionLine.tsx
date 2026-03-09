import { type EdgeProps, BaseEdge, getSmoothStepPath } from '@xyflow/react';

export function ConnectionLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
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

  const label =
    sourceHandleId && sourceHandleId !== 'output'
      ? `.${sourceHandleId}`
      : targetHandleId && targetHandleId !== 'input'
        ? `→ .${targetHandleId}`
        : undefined;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: '#2563eb', strokeWidth: 2 }}
      label={label}
      labelStyle={{ fill: '#64748b', fontSize: 10 }}
      labelBgStyle={{ fill: '#ffffff' }}
      labelBgPadding={[4, 2] as [number, number]}
    />
  );
}
