import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packageMetadata = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

const commit = process.env.GITHUB_SHA?.slice(0, 12) || git("rev-parse", "--short=12", "HEAD");
const dirty = commit !== "unknown" && git("status", "--porcelain", "--untracked-files=no") !== "";
const build = commit === "unknown" ? "local" : `${commit}${dirty ? ".dirty" : ""}`;
const release = `v${packageMetadata.version}+${build}`;

await writeFile(
  path.join(projectRoot, "public", "version.json"),
  `${JSON.stringify({ name: packageMetadata.name, version: packageMetadata.version, release, commit }, null, 2)}\n`,
  "utf8",
);

console.log(`✓ ${release}`);
