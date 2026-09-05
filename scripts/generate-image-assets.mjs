import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "sources");
const publicRoot = path.join(projectRoot, "public", "sources");
const manifestPath = path.join(projectRoot, "lib", "generated-image-assets.json");
const { default: sharp } = await import("sharp");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const assetVersion = packageJson.version;
const maximumAssetWidth = 1920;

const statueDefinitions = [
  { name: "features", widths: [480, 720, 960, 1280], fade: [{ offset: 0, opacity: 1 }, { offset: 72, opacity: 1 }, { offset: 96, opacity: 0 }, { offset: 100, opacity: 0 }] },
  { name: "download", widths: [480, 720, 960, 1280] },
  { name: "support", widths: [480, 720, 960, 1280] },
];

const iconDefinitions = [
  { name: "youtube", widths: [128, 256] },
  { name: "tiktok", widths: [128, 256] },
  { name: "instagram", widths: [128, 256] },
];

function publicAssetUrl(filename, content) {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 10);
  return `/sources/${encodeURIComponent(filename)}?v=${assetVersion}-${digest}`;
}

function responsiveWidths(sourceWidth, preferredWidths) {
  const maximumWidth = Math.min(sourceWidth, maximumAssetWidth);
  return [...new Set([...preferredWidths.filter((width) => width < maximumWidth), maximumWidth])].sort((a, b) => a - b);
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

async function applyVerticalAlphaFade(input, width, height, stops) {
  const gradientStops = stops
    .map(({ offset, opacity }) => `<stop offset="${offset}%" stop-color="white" stop-opacity="${opacity}"/>`)
    .join("");
  const alphaMask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">${gradientStops}</linearGradient></defs><rect width="100%" height="100%" fill="url(#fade)"/></svg>`);
  return sharp(input).ensureAlpha().composite([{ input: alphaMask, blend: "dest-in" }]).png().toBuffer();
}

async function encodeVariants({ basename, input, sourceWidth, sourceHeight, widths, quality, requireAlpha = true }) {
  const maximumWidth = Math.max(...widths);
  const variants = [];
  for (const width of widths) {
    const height = Math.round((sourceHeight * width) / sourceWidth);
    const suffix = width === maximumWidth ? "" : `-w${width}`;
    const filename = `${basename}${suffix}.webp`;
    const pipeline = sharp(input);
    if (width !== sourceWidth) pipeline.resize({ width, height, fit: "fill" });
    const output = await pipeline.webp({ quality, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
    await Promise.all([
      assertGeometry(output, width, height, `${basename} ${width}`, requireAlpha),
      writeFile(path.join(publicRoot, filename), output),
    ]);
    variants.push({ src: publicAssetUrl(filename, output), width, height, bytes: output.byteLength });
  }
  return variants;
}

async function generateHero() {
  const input = path.join(sourceRoot, "statue for hero.png");
  const info = await metadata(input, "hero statue");
  const widths = responsiveWidths(info.width, [960, 1280, 1600]);
  const faded = await applyVerticalAlphaFade(input, info.width, info.height, [{ offset: 0, opacity: 0 }, { offset: 4, opacity: 1 }, { offset: 100, opacity: 1 }]);
  const variants = await encodeVariants({ basename: "statue for hero", input: faded, sourceWidth: info.width, sourceHeight: info.height, widths, quality: 88 });
  console.log(`✓ hero statue: ${widths.join(", ")}px variants (source ${info.width}x${info.height})`);
  return { width: Math.max(...widths), height: variants.at(-1).height, variants };
}

async function generateStatue(definition) {
  const basename = `statue for ${definition.name}`;
  const input = path.join(sourceRoot, `${basename}.png`);
  const info = await metadata(input, basename);
  if (!info.hasAlpha) throw new Error(`"${basename}" must preserve an alpha channel.`);
  const widths = responsiveWidths(info.width, definition.widths);
  const prepared = definition.fade ? await applyVerticalAlphaFade(input, info.width, info.height, definition.fade) : input;
  const variants = await encodeVariants({ basename, input: prepared, sourceWidth: info.width, sourceHeight: info.height, widths, quality: 90 });
  console.log(`✓ ${basename}: ${widths.join(", ")}px variants`);
  return { width: Math.max(...widths), height: variants.at(-1).height, variants };
}

async function generateIcon(definition) {
  const input = path.join(sourceRoot, `${definition.name}.jpg`);
  const info = await metadata(input, definition.name);
  const widths = responsiveWidths(Math.min(info.width, 256), definition.widths);
  const variants = await encodeVariants({ basename: definition.name, input, sourceWidth: info.width, sourceHeight: info.height, widths, quality: 88, requireAlpha: false });
  console.log(`✓ ${definition.name}: ${widths.join(", ")}px variants`);
  return { width: Math.max(...widths), height: variants.at(-1).height, variants };
}

await mkdir(publicRoot, { recursive: true });
const manifest = { hero: await generateHero(), statues: {}, icons: {} };
for (const definition of statueDefinitions) manifest.statues[definition.name] = await generateStatue(definition);
for (const definition of iconDefinitions) manifest.icons[definition.name] = await generateIcon(definition);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
