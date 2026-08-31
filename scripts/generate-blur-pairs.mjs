import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "sources");
const publicRoot = path.join(projectRoot, "public", "sources");
const manifestPath = path.join(projectRoot, "lib", "generated-xray-planes.json");
const assetManifestPath = path.join(projectRoot, "lib", "generated-image-assets.json");
const spaceGroteskFont = path.join(projectRoot, "app", "fonts", "space-grotesk-variable.ttf");
process.env.FONTCONFIG_FILE = path.join(projectRoot, "scripts", "fontconfig.xml");
process.env.FONTCONFIG_PATH = path.join(projectRoot, "scripts");
const { default: sharp } = await import("sharp");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const assetVersion = packageJson.version;
const maximumAssetWidth = 1920;

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

function publicAssetUrl(filename, content) {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 10);
  return `/sources/${encodeURIComponent(filename)}?v=${assetVersion}-${digest}`;
}

function responsiveWidths(sourceWidth, preferredWidths) {
  const maximumWidth = Math.min(sourceWidth, maximumAssetWidth);
  return [...new Set([...preferredWidths.filter((width) => width < maximumWidth), maximumWidth])].sort((a, b) => a - b);
}

async function applyVerticalAlphaFade(input, width, height, stops) {
  const gradientStops = stops
    .map(({ offset, opacity }) => `<stop offset="${offset}%" stop-color="white" stop-opacity="${opacity}"/>`)
    .join("");
  const alphaMask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">${gradientStops}</linearGradient></defs><rect width="100%" height="100%" fill="url(#fade)"/></svg>`);
  return sharp(input).ensureAlpha().composite([{ input: alphaMask, blend: "dest-in" }]).png().toBuffer();
}

async function encodePairVariants({ basename, sharpInput, blurredInput, sourceWidth, sourceHeight, widths, sharpQuality, blurredQuality, requireAlpha = true }) {
  const maximumWidth = Math.max(...widths);
  const variants = { sharp: [], blurred: [] };

  for (const width of widths) {
    const height = Math.round((sourceHeight * width) / sourceWidth);
    const suffix = width === maximumWidth ? "" : `-w${width}`;
    const sharpFilename = `${basename}${suffix}.webp`;
    const blurredFilename = `${basename} (blured)${suffix}.webp`;
    const resize = width === sourceWidth ? undefined : { width, height, fit: "fill" };
    const sharpPipeline = sharp(sharpInput);
    const blurredPipeline = sharp(blurredInput);
    if (resize) {
      sharpPipeline.resize(resize);
      blurredPipeline.resize(resize);
    }
    const [sharpOutput, blurredOutput] = await Promise.all([
      sharpPipeline.webp({ quality: sharpQuality, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer(),
      blurredPipeline.webp({ quality: blurredQuality, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer(),
    ]);
    await Promise.all([
      assertGeometry(sharpOutput, width, height, `${basename} sharp ${width}`, requireAlpha),
      assertGeometry(blurredOutput, width, height, `${basename} blur ${width}`, requireAlpha),
      writeFile(path.join(publicRoot, sharpFilename), sharpOutput),
      writeFile(path.join(publicRoot, blurredFilename), blurredOutput),
    ]);
    variants.sharp.push({ src: publicAssetUrl(sharpFilename, sharpOutput), width, height, bytes: sharpOutput.byteLength });
    variants.blurred.push({ src: publicAssetUrl(blurredFilename, blurredOutput), width, height, bytes: blurredOutput.byteLength });
  }

  return variants;
}

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
  const widths = responsiveWidths(sharpMeta.width, [960, 1280, 1600]);
  const heroFade = [{ offset: 0, opacity: 0 }, { offset: 4, opacity: 1 }, { offset: 100, opacity: 1 }];
  const [sharpFaded, blurredFaded] = await Promise.all([
    applyVerticalAlphaFade(sharpInput, sharpMeta.width, sharpMeta.height, heroFade),
    applyVerticalAlphaFade(blurInput, blurMeta.width, blurMeta.height, heroFade),
  ]);
  const variants = await encodePairVariants({
    basename: "statue for hero",
    sharpInput: sharpFaded,
    blurredInput: blurredFaded,
    sourceWidth: sharpMeta.width,
    sourceHeight: sharpMeta.height,
    widths,
    sharpQuality: 88,
    blurredQuality: 82,
  });
  console.log(`✓ hero statue: ${widths.join(", ")}px variants (source ${sharpMeta.width}x${sharpMeta.height})`);
  return { width: Math.max(...widths), height: variants.sharp.at(-1).height, ...variants };
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
  const widths = responsiveWidths(width, [960, 1440]);
  const variants = await encodePairVariants({
    basename: name,
    sharpInput: sharpPng,
    blurredInput: blurredPng,
    sourceWidth: width,
    sourceHeight: height,
    widths,
    sharpQuality: 92,
    blurredQuality: 84,
  });
  const outputWidth = Math.max(...widths);
  const scale = outputWidth / width;
  const outputHeight = variants.sharp.at(-1).height;
  console.log(`✓ ${name}: ${widths.join(", ")}px variants (source ${width}x${height})`);
  return {
    plane: {
      width: outputWidth,
      height: outputHeight,
      contentBox: {
        x: Math.round(padding * scale),
        y: Math.round(padding * scale),
        width: Math.round(tightInfo.width * scale),
        height: Math.round(tightInfo.height * scale),
      },
    },
    assets: { width: outputWidth, height: outputHeight, ...variants },
  };
}

async function generateIconPlane(definition) {
  const input = path.join(sourceRoot, `${definition.name}.jpg`);
  const info = await metadata(input, definition.name);
  const sourceScale = info.width / definition.displayWidth;
  const blurRadius = Math.max(0.3, Math.min(100, 7 * sourceScale));
  const blurredInput = await sharp(input).blur(blurRadius).png().toBuffer();
  const widths = responsiveWidths(Math.min(info.width, 256), [128]);
  const variants = await encodePairVariants({
    basename: definition.name,
    sharpInput: input,
    blurredInput,
    sourceWidth: info.width,
    sourceHeight: info.height,
    widths,
    sharpQuality: 88,
    blurredQuality: 82,
    requireAlpha: false,
  });
  console.log(`✓ ${definition.name}: ${widths.join(", ")}px variants, source blur=${blurRadius.toFixed(1)}px`);
  return { width: Math.max(...widths), height: variants.sharp.at(-1).height, ...variants };
}

async function generateGlassNoise() {
  const size = 128;
  const pixels = Buffer.allocUnsafe(size * size * 4);
  let seed = 0x6d2b79f5;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff;
  };
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const value = Math.round(82 + random() * 92);
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = Math.round(20 + random() * 18);
  }
  const output = await sharp(pixels, { raw: { width: size, height: size, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
  await writeFile(path.join(publicRoot, "glass-noise.webp"), output);
  console.log(`✓ glass noise: ${size}x${size}px (${output.byteLength} bytes)`);
}

await mkdir(publicRoot, { recursive: true });
const assetManifest = {
  hero: await generateHero(),
  planes: {},
  icons: {},
};

for (const basename of statuePairs) {
  const sharpInput = path.join(sourceRoot, `${basename}.png`);
  const blurInput = path.join(sourceRoot, `${basename} (blured).png`);
  const sharpPngOutput = path.join(publicRoot, `${basename}.png`);
  const [sharpMeta, blurMeta] = await Promise.all([metadata(sharpInput, `${basename} sharp`), metadata(blurInput, `${basename} blur`)]);
  if (sharpMeta.width !== blurMeta.width || sharpMeta.height !== blurMeta.height) {
    throw new Error(`Geometry mismatch for "${basename}": sharp=${sharpMeta.width}x${sharpMeta.height}, blur=${blurMeta.width}x${blurMeta.height}.`);
  }
  if (!sharpMeta.hasAlpha || !blurMeta.hasAlpha) throw new Error(`Both images in the "${basename}" pair must preserve an alpha channel.`);
  const widths = responsiveWidths(sharpMeta.width, [480, 720, 960, 1280]);
  let sharpVariantInput = sharpInput;
  let blurredVariantInput = blurInput;
  if (basename === "statue for features") {
    const featureFade = [{ offset: 0, opacity: 1 }, { offset: 72, opacity: 1 }, { offset: 96, opacity: 0 }, { offset: 100, opacity: 0 }];
    [sharpVariantInput, blurredVariantInput] = await Promise.all([
      applyVerticalAlphaFade(sharpInput, sharpMeta.width, sharpMeta.height, featureFade),
      applyVerticalAlphaFade(blurInput, blurMeta.width, blurMeta.height, featureFade),
    ]);
  }
  const variants = await encodePairVariants({
    basename,
    sharpInput: sharpVariantInput,
    blurredInput: blurredVariantInput,
    sourceWidth: sharpMeta.width,
    sourceHeight: sharpMeta.height,
    widths,
    sharpQuality: 90,
    blurredQuality: 82,
  });
  await copyFile(sharpInput, sharpPngOutput);
  const scene = basename.replace("statue for ", "");
  assetManifest.planes[`${scene}-statue`] = {
    width: Math.max(...widths),
    height: variants.sharp.at(-1).height,
    ...variants,
  };
  console.log(`✓ ${basename}: ${widths.join(", ")}px variants`);
}

const textManifest = {};
for (const plane of textPlanes) {
  const generated = await generateTextPlane(plane);
  textManifest[plane.name] = generated.plane;
  assetManifest.planes[plane.name] = generated.assets;
}
await writeFile(manifestPath, `${JSON.stringify(textManifest, null, 2)}\n`);
for (const icon of iconPlanes) assetManifest.icons[icon.name] = await generateIconPlane(icon);
await generateGlassNoise();
await writeFile(assetManifestPath, `${JSON.stringify(assetManifest, null, 2)}\n`);
