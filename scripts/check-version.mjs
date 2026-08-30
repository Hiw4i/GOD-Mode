import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const packageMetadata = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const changelog = await readFile(path.join(projectRoot, "CHANGELOG.md"), "utf8");
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!semver.test(packageMetadata.version)) {
  throw new Error(`package.json version is not valid SemVer: ${packageMetadata.version}`);
}

if (!changelog.includes(`## [${packageMetadata.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for version ${packageMetadata.version}`);
}

console.log(`✓ v${packageMetadata.version} is valid and documented`);
