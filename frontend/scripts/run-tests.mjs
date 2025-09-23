import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const distDir = path.resolve("dist-tests");

const collectTestFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(entryPath);
    }
  }

  return files;
};

const ensureDistDir = async () => {
  try {
    await fs.access(distDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Compiled test output not found at ${distDir}. Did the TypeScript build step run?`,
      );
    }
    throw error;
  }
};

const runNodeTests = (files) => {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", ...files], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`node --test exited with code ${code}`));
    });

    child.on("error", reject);
  });
};

const main = async () => {
  await ensureDistDir();
  const testFiles = await collectTestFiles(distDir);
  testFiles.sort((a, b) => a.localeCompare(b));

  if (testFiles.length === 0) {
    throw new Error(`No compiled test files found under ${distDir}`);
  }

  await runNodeTests(testFiles);
};

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
