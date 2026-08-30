import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "sources");
const publicRoot = path.join(projectRoot, "public", "sources");
const manifestPath = path.join(projectRoot, "lib", "generated-xray-planes.json");
process.env.FONTCONFIG_FILE = path.join(projectRoot, "scripts", "fontconfig.xml");
process.env.FONTCONFIG_PATH = path.join(projectRoot, "scripts");
const { default: sharp } = await import("sharp");

const statuePairs = ["statue for features", "statue for download", "statue for support"];
const textPlanes = [
  { name: "features-title", text: "FEATURES", letterSpacing: 0 },
  { name: "download-title", text: "DOWNLOAD", letterSpacing: -8.8 },
];
const iconPlanes = [
  { name: "youtube", displayWidth: 98 },
  { name: "tiktok", displayWidth: 84 },
  { name: "instagram", displayWidth: 66 },
];

async function generateHero() {
  const input = path.join(sourceRoot, "statue.png");
  const info = await metadata(input, "hero statue");
  const output = await sharp(input)
    .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  await Promise.all([
    assertGeometry(output, info.width, info.height, "hero statue"),
    assertAlphaPreserved(input, output, "hero statue"),
  ]);
  await writeFile(path.join(publicRoot, "statue.webp"), output);
  console.log(`✓ hero statue: ${info.width}x${info.height}, webp=${output.byteLength} bytes`);
}

function xml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

async function metadata(input, label) {
  const result = await sharp(input).metadata();
  if (!result.width || !result.height) throw new Error(`Cannot read dimensions for "${label}".`);
  return result;
}

async function assertGeometry(input, expectedWidth, expectedHeight, label, requireAlpha = true) {
  const result = await metadata(input, label);
  if (result.width !== expectedWidth || result.height !== expectedHeight) {
    throw new Error(`Geometry mismatch for "${label}": expected=${expectedWidth}x${expectedHeight}, output=${result.width}x${result.height}.`);
  }
  if (requireAlpha && !result.hasAlpha) throw new Error(`"${label}" must preserve an alpha channel.`);
}

async function assertAlphaPreserved(source, encoded, label) {
  const [sourceAlpha, encodedAlpha] = await Promise.all([
    sharp(source).ensureAlpha().extractChannel("alpha").raw().toBuffer(),
    sharp(encoded).ensureAlpha().extractChannel("alpha").raw().toBuffer(),
  ]);
  if (!sourceAlpha.equals(encodedAlpha)) throw new Error(`The WebP encoder changed the alpha channel for "${label}".`);
}

async function assertTransparentFrame(input, label, maximumAlpha = 2) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaOffset = info.channels - 1;
  let edgeMaximum = 0;
  const sample = (x, y) => {
    edgeMaximum = Math.max(edgeMaximum, data[(y * info.width + x) * info.channels + alphaOffset]);
  };
  for (let x = 0; x < info.width; x += 1) {
    sample(x, 0);
    sample(x, info.height - 1);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    sample(0, y);
    sample(info.width - 1, y);
  }
  if (edgeMaximum > maximumAlpha) {
    throw new Error(`The glow for "${label}" reaches the canvas edge (alpha=${edgeMaximum}). Increase its transparent padding.`);
  }
}

async function generateTextPlane(definition) {
  const { name, text, letterSpacing } = definition;
  const fontSize = 320;
  const padding = 540;
  const sourceSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="720"><text x="80" y="500" fill="#fff" font-family="Space Grotesk" font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}">${xml(text)}</text></svg>`);
  const { info: tightInfo } = await sharp(sourceSvg, { density: 72 })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const width = tightInfo.width + padding * 2;
  const height = tightInfo.height + padding * 2;
  const textX = 80 + (tightInfo.trimOffsetLeft ?? 0) + padding;
  const textY = 500 + (tightInfo.trimOffsetTop ?? 0) + padding;
  const renderTextSvg = (coreBlur) => {
    const coreNode = coreBlur > 0 ? `<feGaussianBlur in="SourceGraphic" stdDeviation="${coreBlur}" result="core"/>` : "";
    const coreResult = coreBlur > 0 ? "core" : "SourceGraphic";
    const near = Math.hypot(32, coreBlur).toFixed(2);
    const middle = Math.hypot(90, coreBlur).toFixed(2);
    const far = Math.hypot(180, coreBlur).toFixed(2);
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="glow" x="-100%" y="-250%" width="300%" height="600%" color-interpolation-filters="sRGB">${coreNode}<feGaussianBlur in="SourceAlpha" stdDeviation="${far}" result="farBlur"/><feFlood flood-color="#fff" flood-opacity=".16" result="farColor"/><feComposite in="farColor" in2="farBlur" operator="in" result="farGlow"/><feGaussianBlur in="SourceAlpha" stdDeviation="${middle}" result="middleBlur"/><feFlood flood-color="#fff" flood-opacity=".32" result="middleColor"/><feComposite in="middleColor" in2="middleBlur" operator="in" result="middleGlow"/><feGaussianBlur in="SourceAlpha" stdDeviation="${near}" result="nearBlur"/><feFlood flood-color="#fff" flood-opacity=".58" result="nearColor"/><feComposite in="nearColor" in2="nearBlur" operator="in" result="nearGlow"/><feMerge><feMergeNode in="farGlow"/><feMergeNode in="middleGlow"/><feMergeNode in="nearGlow"/><feMergeNode in="${coreResult}"/></feMerge></filter></defs><text x="${textX}" y="${textY}" fill="#fff" font-family="Space Grotesk" font-size="${fontSize}" font-weight="700" letter-spacing="${letterSpacing}" filter="url(#glow)">${xml(text)}</text></svg>`);
  };
  const sharpPng = await sharp(renderTextSvg(0)).png().toBuffer();
  const composedAlpha = await sharp(sharpPng).ensureAlpha().extractChannel("alpha").stats();
  if (composedAlpha.channels[0].min === 255) throw new Error(`${name} glow unexpectedly filled the whole alpha canvas.`);
  const blurredPng = await sharp(renderTextSvg(18)).png().toBuffer();
  await Promise.all([
    assertTransparentFrame(sharpPng, `${name} sharp`),
    assertTransparentFrame(blurredPng, `${name} blur`),
  ]);
  const [sharpWebp, blurredWebp] = await Promise.all([
    sharp(sharpPng).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer(),
    sharp(blurredPng).webp({ quality: 84, alphaQuality: 100, effort: 6 }).toBuffer(),
  ]);
  await Promise.all([
    assertGeometry(sharpWebp, width, height, `${name} sharp`),
    assertGeometry(blurredWebp, width, height, `${name} blur`),
  ]);
  await Promise.all([
    writeFile(path.join(publicRoot, `${name}.webp`), sharpWebp),
    writeFile(path.join(publicRoot, `${name} (blured).webp`), blurredWebp),
  ]);
  console.log(`✓ ${name}: ${width}x${height}, sharp=${sharpWebp.byteLength} bytes, blur=${blurredWebp.byteLength} bytes`);
  return { width, height, contentBox: { x: padding, y: padding, width: tightInfo.width, height: tightInfo.height } };
}

async function generateIconPlane(definition) {
  const input = path.join(sourceRoot, `${definition.name}.jpg`);
  const info = await metadata(input, definition.name);
  const sourceScale = info.width / definition.displayWidth;
  const blurRadius = Math.max(0.3, Math.min(100, 7 * sourceScale));
  const output = await sharp(input).blur(blurRadius).webp({ quality: 82, effort: 6 }).toBuffer();
  await assertGeometry(output, info.width, info.height, `${definition.name} blur`, false);
  await writeFile(path.join(publicRoot, `${definition.name} (blured).webp`), output);
  console.log(`✓ ${definition.name}: ${info.width}x${info.height}, source blur=${blurRadius.toFixed(1)}px`);
}

await mkdir(publicRoot, { recursive: true });
await generateHero();

for (const basename of statuePairs) {
  const sharpInput = path.join(sourceRoot, `${basename}.png`);
  const blurInput = path.join(sourceRoot, `${basename} (blured).png`);
  const sharpPngOutput = path.join(publicRoot, `${basename}.png`);
  const sharpWebpOutput = path.join(publicRoot, `${basename}.webp`);
  const blurOutput = path.join(publicRoot, `${basename} (blured).webp`);
  const [sharpMeta, blurMeta] = await Promise.all([metadata(sharpInput, `${basename} sharp`), metadata(blurInput, `${basename} blur`)]);
  if (sharpMeta.width !== blurMeta.width || sharpMeta.height !== blurMeta.height) {
    throw new Error(`Geometry mismatch for "${basename}": sharp=${sharpMeta.width}x${sharpMeta.height}, blur=${blurMeta.width}x${blurMeta.height}.`);
  }
  if (!sharpMeta.hasAlpha || !blurMeta.hasAlpha) throw new Error(`Both images in the "${basename}" pair must preserve an alpha channel.`);
  const [{ data: sharpData }, { data: blurData }] = await Promise.all([
    sharp(sharpInput).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true }),
    sharp(blurInput).webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true }),
  ]);
  await Promise.all([
    assertGeometry(sharpData, sharpMeta.width, sharpMeta.height, `${basename} sharp`),
    assertGeometry(blurData, sharpMeta.width, sharpMeta.height, `${basename} blur`),
    assertAlphaPreserved(sharpInput, sharpData, `${basename} sharp`),
    assertAlphaPreserved(blurInput, blurData, `${basename} blur`),
  ]);
  await Promise.all([copyFile(sharpInput, sharpPngOutput), writeFile(sharpWebpOutput, sharpData), writeFile(blurOutput, blurData)]);
  console.log(`✓ ${basename}: ${sharpMeta.width}x${sharpMeta.height}, sharp=${sharpData.byteLength} bytes, blur=${blurData.byteLength} bytes`);
}

const textManifest = {};
for (const plane of textPlanes) textManifest[plane.name] = await generateTextPlane(plane);
await writeFile(manifestPath, `${JSON.stringify(textManifest, null, 2)}\n`);
for (const icon of iconPlanes) await generateIconPlane(icon);
