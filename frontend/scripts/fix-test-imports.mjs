import { promises as fs } from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist-tests");

const needsExtension = (specifier) => {
  return (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".json") &&
    !specifier.endsWith(".node")
  );
};

const appendExtension = (specifier) => {
  if (specifier.endsWith("/")) {
    return `${specifier}index.js`;
  }
  return `${specifier}.js`;
};

const processFile = async (filePath) => {
  const original = await fs.readFile(filePath, "utf8");
  let updated = original.replace(
    /(import\s+[^'";]+?from\s+['"])(\.\.?\/[^'";]+)(['"])/g,
    (match, start, specifier, end) => {
      if (!needsExtension(specifier)) {
        return match;
      }
      return `${start}${appendExtension(specifier)}${end}`;
    },
  );

  updated = updated.replace(
    /(import\(\s*['"])(\.\.?\/[^'";]+)(['"])\s*\)/g,
    (match, start, specifier, end) => {
      if (!needsExtension(specifier)) {
        return match;
      }
      return `${start}${appendExtension(specifier)}${end})`;
    },
  );

  updated = updated.replace(
    /(export\s+\*\s+from\s+['"])(\.\.?\/[^'";]+)(['"])/g,
    (match, start, specifier, end) => {
      if (!needsExtension(specifier)) {
        return match;
      }
      return `${start}${appendExtension(specifier)}${end}`;
    },
  );

  if (updated !== original) {
    await fs.writeFile(filePath, updated, "utf8");
  }
};

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith(".js")) {
        await processFile(entryPath);
      }
    }),
  );
};

const main = async () => {
  try {
    await walk(distDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

await main();
