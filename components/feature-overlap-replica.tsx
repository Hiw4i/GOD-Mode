import Image from "next/image";
import type { FeatureOverlapReplica as FeatureOverlapReplicaDefinition } from "@/lib/content";

export function FeatureOverlapReplica({ definition }: { definition: FeatureOverlapReplicaDefinition }) {
  const relation = `${definition.sourceId}:${definition.targetId}`;
  return (
    <div className="feature-overlap-window" data-overlap-window={relation} data-overlap-disable-at={definition.disabledAt} aria-hidden="true">
      <Image className="feature-overlap-replica" data-overlap-replica={relation} src={definition.blurredSrc} alt="" width={definition.width} height={definition.height} draggable={false} />
    </div>
  );
}
