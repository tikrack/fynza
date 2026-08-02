import { defineConfig } from "vite";
import { extname, relative, resolve } from "path";
import { readdirSync, statSync } from "fs";
import tailwindcss from "@tailwindcss/vite";

function getHtmlFiles(dir: string, filesList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const name = resolve(dir, file);
    if (statSync(name).isDirectory()) {
      getHtmlFiles(name, filesList);
    } else if (extname(name) === ".html") {
      filesList.push(name);
    }
  }

  return filesList;
}

let blogsHtmlFiles: string[] = [];
try {
  blogsHtmlFiles = getHtmlFiles(resolve(__dirname, "blogs"));
} catch (e) {}

const inputEntries: Record<string, string> = {};

inputEntries["main"] = resolve(__dirname, "index.html");
inputEntries["blogs"] = resolve(__dirname, "blogs_template.html");

blogsHtmlFiles.forEach((filePath) => {
  const relativePath = relative(__dirname, filePath).replace(/\.html$/, "");
  inputEntries[relativePath] = filePath;
});

export default defineConfig({
  build: {
    rollupOptions: {
      input: inputEntries,
    },
  },
  plugins: [tailwindcss()],
});
