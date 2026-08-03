import { defineConfig } from "vite";
import { dirname, extname, relative, resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

const isTemplate = (filePath: string) => /_template\.html$/.test(filePath);

const getHtmlFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name) === ".html")
    .map((entry) => resolve(entry.parentPath, entry.name))
    .filter((filePath) => !isTemplate(filePath));
};

const toEntryName = (filePath: string) =>
  relative(rootDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.html$/, "");

const inputEntries: Record<string, string> = {
  main: resolve(rootDir, "index.html"),
  blogs: resolve(rootDir, "blogs.html"),
};

for (const filePath of getHtmlFiles(resolve(rootDir, "blogs"))) {
  inputEntries[toEntryName(filePath)] = filePath;
}

export default defineConfig({
  appType: "mpa",
  build: {
    rollupOptions: {
      input: inputEntries,
    },
  },
  plugins: [tailwindcss()],
});
