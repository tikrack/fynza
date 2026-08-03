import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://api.platform.ereserv.ir/api/v1/platform/blog/articles";

const getCardsContents = (articles) => {
  let cardsContents = ``;

  articles.forEach((article) => {
    cardsContents += `
      <li>
        <article
          class="group h-full flex flex-col overflow-hidden rounded-3xl border border-border-1 bg-white transition-all duration-300 hover:shadow-[0_16px_36px_-22px_rgba(66,83,111,0.35)] hover:-translate-y-1"
        >
          <a class="relative block aspect-16/10 overflow-hidden bg-[#e8e8f0]" href="/blogs/${article?.slug}">
            <img
              alt="${article?.coverImage?.alt}"
              class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              src="${article?.coverImage?.url}"
            />
            <span
              class="absolute right-3 top-3 rounded-3xl border border-border-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-text-1"
            >${article?.category ?? ""}</span>
          </a>
  
          <div class="flex grow flex-col gap-3 p-5 md:p-6">
            <h3 class="font-yekan font-black text-[16px] md:text-[18px] leading-[1.7] text-[#42536f] tracking-tight">
              <a class="transition-colors duration-200 group-hover:text-primary" href="/blogs/occupancy-rate">
                ${article.title}
              </a>
            </h3>
            <p class="text-[13px] md:text-[14px] font-medium leading-7 text-text-1 line-clamp-3">
                ${article.description}
            </p>
  
            <div class="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border-1">
              <div class="flex items-center gap-2.5 min-w-0">
                <img
                  alt=""
                  class="size-8 rounded-full border-2 border-white object-cover bg-[#e8e8f0]"
                  loading="lazy"
                  src="${article?.source?.imageUrl}"
                />
                <span class="truncate text-[12px] font-bold text-text-2">${article?.source?.name}</span>
              </div>
              <span class="shrink-0 text-[11px] text-[rgba(66,83,111,0.6)]">${article?.readingTimeMinutes} دقیقه</span>
            </div>
          </div>
        </article>
      </li>
    `;
  });

  return cardsContents;
};

const generateBlogsPage = (articles) => {
  const templatePath = path.join(__dirname, "blogs_template.html");
  const outputPath = path.join(__dirname, "blogs.html");

  try {
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: file does not exist :${templatePath}`);
      return;
    }

    let templateContent = fs.readFileSync(templatePath, "utf8");

    const cardsContents = getCardsContents(articles);

    const resultHtml = templateContent.replace(/\$\{CARDS}/g, cardsContents);

    fs.writeFileSync(outputPath, resultHtml, "utf8");

    console.log("✅ blogs.html file generated successfully.");
  } catch (error) {
    console.error("❌ Error in generating finally codes", error);
  }
};

const getBlogs = async () => {
  let response = await fetch(BASE_URL);
  response = await response.json();

  generateBlogsPage(response?.data?.items ?? []);
};

getBlogs();