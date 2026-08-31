import type { CSSProperties } from "react";

export type XrayMotionChannel = "visual" | "text" | "static";

export interface XrayContentBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface XrayPlaneDefinition {
  id: string;
  scene: string;
  sharpSrc: string;
  blurredSrc: string;
  width: number;
  height: number;
  contentBox?: XrayContentBox;
  targets: string[];
  motionChannel: XrayMotionChannel;
}

interface XrayPlaneProps extends XrayPlaneDefinition {
  className: string;
  alt?: string;
  centered?: boolean;
}

type MaskLayerProps = {
  id: string;
  layer: "sharp" | "blur";
  width: number;
  height: number;
  planeId: string;
  targets: string[];
};

function safeSvgId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function targetShapeId(planeId: string, target: string) {
  return `xray-shape-${safeSvgId(planeId)}-${safeSvgId(target)}`;
}

function PlaneMask({ id, layer, width, height, planeId, targets }: MaskLayerProps) {
  const inverse = layer === "sharp";
  return (
    <mask id={id} data-card-mask={layer} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: "luminance" }}>
      <rect data-mask-base={layer} x="0" y="0" width={width} height={height} fill={inverse ? "white" : "black"} />
      {targets.map((target) => (
        <use key={target} href={`#${targetShapeId(planeId, target)}`} fill={inverse ? "black" : "white"} />
      ))}
    </mask>
  );
}

export function XrayPlane({ id, scene, sharpSrc, blurredSrc, width, height, contentBox, targets, motionChannel, className, alt = "", centered = false }: XrayPlaneProps) {
  const safeId = safeSvgId(id);
  const sharpMaskId = `xray-sharp-mask-${safeId}`;
  const blurMaskId = `xray-blur-mask-${safeId}`;
  const planeStyle = contentBox
    ? ({
        aspectRatio: `${width} / ${height}`,
        "--xray-plane-width": `${(width / contentBox.width) * 100}%`,
        "--xray-plane-left": `${(-contentBox.x / contentBox.width) * 100}%`,
      } as CSSProperties)
    : { aspectRatio: `${width} / ${height}` };
  return (
    <div
      className={`xray-plane paired-scene-visual ${className}`}
      data-xray-plane={id}
      data-xray-scene={scene}
      data-xray-motion={motionChannel}
      data-parallax-visual={motionChannel === "visual" ? "" : undefined}
      data-centered={centered ? "true" : "false"}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : "true"}
      style={planeStyle}
    >
      <svg className="paired-scene-canvas" data-mask-backdrop={id} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          {targets.map((target) => (
            <g key={target} id={targetShapeId(id, target)} data-mask-motion={target}>
              <g data-mask-scroll={target}>
                <g data-mask-hover={target}>
                  <rect data-mask-rect={target} x="0" y="0" width="0" height="0" rx="0" />
                </g>
              </g>
            </g>
          ))}
          <PlaneMask id={sharpMaskId} layer="sharp" width={width} height={height} planeId={id} targets={targets} />
          <PlaneMask id={blurMaskId} layer="blur" width={width} height={height} planeId={id} targets={targets} />
        </defs>
        <image className="paired-scene-sharp" data-paired-image="sharp" href={sharpSrc} x="0" y="0" width={width} height={height} preserveAspectRatio="none" mask={`url(#${sharpMaskId})`} />
        <image className="paired-scene-blur" data-paired-image="blur" href={blurredSrc} x="0" y="0" width={width} height={height} preserveAspectRatio="none" mask={`url(#${blurMaskId})`} />
      </svg>
    </div>
  );
}

type PairedSceneVisualProps = Omit<XrayPlaneProps, "id" | "motionChannel" | "centered">;

export function PairedSceneVisual(props: PairedSceneVisualProps) {
  return <XrayPlane {...props} id={`${props.scene}-statue`} motionChannel="visual" centered />;
}
