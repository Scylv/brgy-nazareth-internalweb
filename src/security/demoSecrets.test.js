import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const scannedRoots = ["src"];
const forbiddenSecrets = ["admin", "dept", "lupon"].map((prefix) => `${prefix}123`);
const ignoredPathParts = new Set(["node_modules", ".git", "dist"]);

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const relativePath = path.relative(projectRoot, fullPath);

    if (relativePath.split(path.sep).some((part) => ignoredPathParts.has(part))) {
      return [];
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectFiles(fullPath);
    }

    if (!stat.isFile() || relativePath.endsWith("demoSecrets.test.js")) {
      return [];
    }

    return [fullPath];
  });
}

describe("frontend demo credentials", () => {
  it("does not ship known demo passwords in frontend source files", () => {
    const leaks = scannedRoots
      .flatMap((root) => collectFiles(path.join(projectRoot, root)))
      .flatMap((filePath) => {
        const contents = readFileSync(filePath, "utf8");

        return forbiddenSecrets
          .filter((secret) => contents.includes(secret))
          .map((secret) => `${path.relative(projectRoot, filePath)} contains ${secret}`);
      });

    expect(leaks).toEqual([]);
  });
});
