import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "sources");
const publicRoot = path.join(projectRoot, "public", "sources");
const manifestPath = path.join(projectRoot, "lib", "generated-xray-planes.json");
const spaceGroteskFont = path.join(projectRoot, "app", "fonts", "space-grotesk-variable.ttf");
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
  const sharpInput = path.join(sourceRoot, "statue for hero.png");
  const blurInput = path.join(sourceRoot, "statue for hero (blured).png");
  const [sharpMeta, blurMeta] = await Promise.all([
    metadata(sharpInput, "hero statue sharp"),
    metadata(blurInput, "hero statue blur"),
  ]);
  if (sharpMeta.width !== blurMeta.width || sharpMeta.height !== blurMeta.height) {
    throw new Error(`Geometry mismatch for "hero statue": sharp=${sharpMeta.width}x${sharpMeta.height}, blur=${blurMeta.width}x${blurMeta.height}.`);
  }
  const [sharpOutput, blurOutput] = await Promise.all([
    sharp(sharpInput).webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer(),
    sharp(blurInput).webp({ quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer(),
  ]);
  await Promise.all([
    assertGeometry(sharpOutput, sharpMeta.width, sharpMeta.height, "hero statue sharp"),
    assertGeometry(blurOutput, sharpMeta.width, sharpMeta.height, "hero statue blur"),
    assertAlphaPreserved(sharpInput, sharpOutput, "hero statue sharp"),
    assertAlphaPreserved(blurInput, blurOutput, "hero statue blur"),
  ]);
  await Promise.all([
    writeFile(path.join(publicRoot, "statue for hero.webp"), sharpOutput),
    writeFile(path.join(publicRoot, "statue for hero (blured).webp"), blurOutput),
  ]);
  console.log(`✓ hero statue: ${sharpMeta.width}x${sharpMeta.height}, sharp=${sharpOutput.byteLength} bytes, blur=${blurOutput.byteLength} bytes`);
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
  const pangoLetterSpacing = Math.round(letterSpacing * 1024);
  const textMarkup = `<span foreground="#ffffff" letter_spacing="${pangoLetterSpacing}">${xml(text)}</span>`;
  const { data: tightPng, info: tightInfo } = await sharp({
    text: {
      text: textMarkup,
      font: `Space Grotesk Bold ${fontSize}`,
      fontfile: spaceGroteskFont,
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (name === "download-title" && tightInfo.width < 1550) {
    throw new Error(`Space Grotesk was not applied to "${name}" (rendered width=${tightInfo.width}px).`);
  }
  const width = tightInfo.width + padding * 2;
  const height = tightInfo.height + padding * 2;
  const blank = { create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  const basePng = await sharp(blank)
    .composite([{ input: tightPng, left: padding, top: padding }])
    .png()
    .toBuffer();
  const makeGlow = async (radius, opacity) => {
    const blurredAlpha = await sharp(basePng)
      .blur(Math.min(radius, 100))
      .extractChannel("alpha")
      .raw()
      .toBuffer();
    const alpha = Buffer.allocUnsafe(blurredAlpha.length);
    for (let index = 0; index < blurredAlpha.length; index += 1) {
      alpha[index] = Math.round(blurredAlpha[index] * opacity);
    }
    return sharp({ create: { width, height, channels: 3, background: "#fff" } })
      .joinChannel(alpha, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer();
  };
  const renderTextPlane = async (coreBlur) => {
    const [farGlow, middleGlow, nearGlow, core] = await Promise.all([
      makeGlow(Math.hypot(180, coreBlur), 0.035),
      makeGlow(Math.hypot(90, coreBlur), 0.1),
      makeGlow(Math.hypot(32, coreBlur), 0.28),
      coreBlur > 0 ? sharp(basePng).blur(coreBlur).png().toBuffer() : basePng,
    ]);
    return sharp(blank)
      .composite([{ input: farGlow }, { input: middleGlow }, { input: nearGlow }, { input: core }])
      .png()
      .toBuffer();
  };
  const [sharpPng, blurredPng] = await Promise.all([renderTextPlane(0), renderTextPlane(18)]);
  const composedAlpha = await sharp(sharpPng).ensureAlpha().extractChannel("alpha").stats();
  if (composedAlpha.channels[0].min === 255) throw new Error(`${name} glow unexpectedly filled the whole alpha canvas.`);
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
