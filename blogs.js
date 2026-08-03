import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE =
  "https://api.platform.ereserv.ir/api/v1/platform/blog/articles";
const SITE_URL = "https://ereserv.ir";
const BLOGS_DIR = path.join(__dirname, "blogs");
const CONCURRENCY = 5;

const DEFAULTS = {
  category: "مقالات",
  authorName: "تیم محصول آوا",
  authorImage: "/images/blog/authors/1.jpg",
  authorBio:
    "دربارهٔ عملیات هتل، رزرواسیون و تجربهٔ مهمان می‌نویسیم؛ بر پایهٔ آنچه در هتل‌های واقعی پیاده کرده‌ایم.",
  cover: "/images/vectors/2.png",
};

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripTags = (html = "") =>
  String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toPersianDigits = (value = "") =>
  String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

const isFilled = (value) =>
  value !== null && value !== undefined && value !== "" && value !== "null";

const pick = (...values) => values.find(isFilled) ?? "";

const render = (template, data) =>
  template.replace(/\$\{(\w+)}/g, (_, key) =>
    key in data ? String(data[key] ?? "") : "",
  );

const jalaliDate = (value) => {
  if (!isFilled(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const isoDate = (value) => {
  if (!isFilled(value)) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const slugifyHeading = (text, index) => {
  const base = stripTags(text)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return base || `section-${index + 1}`;
};

const readingTime = (article) => {
  if (isFilled(article?.readingTimeMinutes)) return article.readingTimeMinutes;
  const words = stripTags(getContent(article))
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

/* --------------------------------------------------- article field access */

const getContent = (article) =>
  pick(
    article?.content,
    article?.contentHtml,
    article?.body,
    article?.html,
    article?.text,
  );

const getSlug = (article) => pick(article?.slug, article?.id);

const getCategory = (article) =>
  pick(
    typeof article?.category === "object"
      ? (article?.category?.title ?? article?.category?.name)
      : article?.category,
    article?.categoryName,
    DEFAULTS.category,
  );

const getAuthor = (article) => ({
  name: pick(article?.source?.name, article?.author?.name, DEFAULTS.authorName),
  image: pick(
    article?.source?.imageUrl,
    article?.author?.imageUrl,
    DEFAULTS.authorImage,
  ),
  bio: pick(article?.source?.bio, article?.author?.bio, DEFAULTS.authorBio),
});

const getCover = (article) => ({
  url: pick(
    article?.coverImage?.url,
    article?.cover?.url,
    article?.imageUrl,
    DEFAULTS.cover,
  ),
  alt: pick(article?.coverImage?.alt, article?.title, ""),
});

const getTags = (article) => {
  const tags = article?.tags ?? article?.keywords ?? [];
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) =>
      typeof tag === "string"
        ? { title: tag, slug: tag }
        : {
            title: pick(tag?.title, tag?.name),
            slug: pick(tag?.slug, tag?.title, tag?.name),
          },
    )
    .filter((tag) => isFilled(tag.title));
};

/* -------------------------------------------------- content decoration */

const CONTENT_STYLES = [
  [
    "h2",
    "font-yekan! font-black text-[22px] md:text-[30px] leading-[1.5] pt-2 text-[#42536f]",
  ],
  [
    "h3",
    "font-yekan! font-black text-[18px] md:text-[22px] leading-[1.6] pt-1 text-[#42536f]",
  ],
  ["h4", "font-bold text-[16px] md:text-[18px] leading-[1.7] text-[#42536f]"],
  ["ul", "flex flex-col gap-3 pr-1"],
  ["ol", "flex flex-col gap-3 pr-1 list-decimal list-inside"],
  ["li", "leading-8 md:leading-9"],
  [
    "a",
    "text-primary underline underline-offset-4 hover:opacity-80 transition-opacity",
  ],
  ["figure", "flex flex-col gap-3"],
  [
    "img",
    "w-full h-52 md:h-80 object-cover rounded-2xl md:rounded-3xl border border-border-1 bg-[#e8e8f0]",
  ],
  ["figcaption", "text-xs md:text-sm text-center"],
  [
    "blockquote",
    "relative rounded-2xl md:rounded-3xl border border-border-1 bg-light-primary p-5 md:p-7 text-sm md:text-lg font-semibold leading-9 text-[#42536f]",
  ],
  [
    "table",
    "w-full text-right border-collapse overflow-hidden rounded-2xl border border-border-1",
  ],
  [
    "th",
    "border border-border-1 bg-light-primary p-3 text-sm font-bold text-[#42536f]",
  ],
  ["td", "border border-border-1 p-3 text-sm"],
  [
    "pre",
    "overflow-x-auto rounded-2xl border border-border-1 bg-light-primary p-4 text-xs",
  ],
  ["code", "font-mono text-[13px]"],
];

const addClass = (html, tag, classes) =>
  html.replace(
    new RegExp(`<${tag}(\\s[^>]*)?(/?)>`, "gi"),
    (match, attrs, selfClose) => {
      const attributes = attrs ?? "";
      if (/class\s*=\s*"/i.test(attributes)) {
        return `<${tag}${attributes.replace(
          /class\s*=\s*"([^"]*)"/i,
          (_, existing) => `class="${existing} ${classes}"`,
        )}${selfClose}>`;
      }
      return `<${tag}${attributes} class="${classes}"${selfClose}>`;
    },
  );

const addLazyLoading = (html) =>
  html.replace(/<img(\s[^>]*)?>/gi, (match) =>
    /loading\s*=/.test(match)
      ? match
      : match.replace(/<img/i, '<img loading="lazy"'),
  );

/** ids را روی h2/h3 می‌گذارد و فهرست مطالب را برمی‌گرداند */
const buildToc = (content) => {
  const headings = [];
  let index = 0;

  const contentWithIds = content.replace(
    /<(h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs = "", inner) => {
      const existingId = /id\s*=\s*"([^"]*)"/i.exec(attrs ?? "");
      const id = existingId ? existingId[1] : slugifyHeading(inner, index);
      if (tag.toLowerCase() === "h2") {
        headings.push({ id, title: stripTags(inner) });
        index += 1;
      }
      const attributes = existingId ? attrs : `${attrs ?? ""} id="${id}"`;
      return `<${tag}${attributes}>${inner}</${tag}>`;
    },
  );

  return { contentWithIds, headings };
};

const getTocCard = (headings) => {
  if (!headings.length) return "";

  const items = headings
    .map(
      (heading, index) => `
                  <li>
                    <a
                      class="flex items-start gap-2 hover:text-primary transition-colors"
                      href="#${heading.id}"
                    >
                      <span class="text-primary font-bold">${toPersianDigits(String(index + 1).padStart(2, "0"))}</span>
                      ${escapeHtml(heading.title)}
                    </a>
                  </li>`,
    )
    .join("");

  return `<div class="rounded-3xl border border-border-1 bg-white p-5 md:p-6">
              <h2 class="text-sm font-bold tracking-tight" style="color: rgb(66, 83, 111)">
                در این مقاله می‌خوانید
              </h2>
              <nav aria-label="فهرست مطالب" class="mt-4">
                <ol class="flex flex-col gap-3 text-sm leading-6" style="color: rgb(116, 127, 148)">${items}
                </ol>
              </nav>
            </div>`;
};

const getTagsBlock = (tags) => {
  if (!tags.length) return "";

  const items = tags
    .map(
      (tag) => `
              <a
                class="rounded-full border border-border-1 bg-light-primary px-3.5 py-1.5 text-xs md:text-sm hover:border-primary hover:text-primary transition-colors"
                href="/blogs?tag=${encodeURIComponent(tag.slug)}"
                style="color: rgb(66, 83, 111)"
                >#${escapeHtml(tag.title.replace(/\s+/g, "_"))}</a
              >`,
    )
    .join("");

  return `<div class="mt-10 flex flex-wrap items-center gap-2 border-t border-border-1 pt-6">${items}
            </div>`;
};

const getRelatedBlock = (related) => {
  if (!related.length) return "";

  const cards = related
    .map((item) => {
      const cover = getCover(item);
      return `
        <li>
          <article
            class="group h-full flex flex-col overflow-hidden rounded-3xl border border-border-1 bg-white transition-all duration-300 hover:shadow-[0_16px_36px_-22px_rgba(66,83,111,0.35)] hover:-translate-y-1"
          >
            <a class="relative block aspect-16/10 overflow-hidden bg-[#e8e8f0]" href="/blogs/${getSlug(item)}/">
              <img
                alt="${escapeHtml(cover.alt)}"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                loading="lazy"
                src="${cover.url}"
              />
            </a>
            <div class="flex grow flex-col gap-3 p-5">
              <h3 class="font-yekan font-black text-[16px] md:text-[18px] leading-[1.7] text-[#42536f] tracking-tight">
                <a class="transition-colors duration-200 group-hover:text-primary" href="/blogs/${getSlug(item)}/">
                  ${escapeHtml(item?.title)}
                </a>
              </h3>
              <p class="text-[13px] md:text-[14px] font-medium leading-7 text-text-1 line-clamp-3">
                ${escapeHtml(item?.description)}
              </p>
            </div>
          </article>
        </li>`;
    })
    .join("");

  return `<section class="mx-auto max-w-6xl px-6 md:px-8 mt-16 md:mt-24">
        <h2 class="font-yekan! font-black text-[22px] md:text-[36px] leading-tight text-[#42536f] tracking-tight mb-6 md:mb-10">
          مقالات مرتبط
        </h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">${cards}
        </ul>
      </section>`;
};

/* ------------------------------------------------------------ blogs.html */

const getCardsContents = (articles) =>
  articles
    .map((article) => {
      const slug = getSlug(article);
      const cover = getCover(article);
      const author = getAuthor(article);
      const category = article?.category
        ? escapeHtml(getCategory(article))
        : "";

      return `
      <li>
        <article
          class="group h-full flex flex-col overflow-hidden rounded-3xl border border-border-1 bg-white transition-all duration-300 hover:shadow-[0_16px_36px_-22px_rgba(66,83,111,0.35)] hover:-translate-y-1"
        >
          <a class="relative block aspect-16/10 overflow-hidden bg-[#e8e8f0]" href="/blogs/${slug}/">
            <img
              alt="${escapeHtml(cover.alt)}"
              class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              src="${cover.url}"
            />
            <span
              class="absolute right-3 top-3 rounded-3xl border border-border-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-text-1"
            >${category}</span>
          </a>

          <div class="flex grow flex-col gap-3 p-5 md:p-6">
            <h3 class="font-yekan font-black text-[16px] md:text-[18px] leading-[1.7] text-[#42536f] tracking-tight">
              <a class="transition-colors duration-200 group-hover:text-primary" href="/blogs/${slug}/">
                ${escapeHtml(article?.title)}
              </a>
            </h3>
            <p class="text-[13px] md:text-[14px] font-medium leading-7 text-text-1 line-clamp-3">
                ${escapeHtml(article?.description)}
            </p>

            <div class="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border-1">
              <div class="flex items-center gap-2.5 min-w-0">
                <img
                  alt=""
                  class="size-8 rounded-full border-2 border-white object-cover bg-[#e8e8f0]"
                  loading="lazy"
                  src="${author.image}"
                />
                <span class="truncate text-[12px] font-bold text-text-2">${escapeHtml(author.name)}</span>
              </div>
              <span class="shrink-0 text-[11px] text-[rgba(66,83,111,0.6)]">${readingTime(article)} دقیقه</span>
            </div>
          </div>
        </article>
      </li>
    `;
    })
    .join("");

const generateBlogsPage = (articles) => {
  const templatePath = path.join(__dirname, "blogs_template.html");
  const outputPath = path.join(__dirname, "blogs.html");

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const html = template.replace(/\$\{CARDS}/g, getCardsContents(articles));

  fs.writeFileSync(outputPath, html, "utf8");
  console.log("✅ blogs.html generated.");
};

/* ------------------------------------------------- single article pages */

const buildArticleHtml = (article, template, related) => {
  const slug = getSlug(article);
  const author = getAuthor(article);
  const cover = getCover(article);
  const title = pick(article?.title, "مقاله");
  const description = pick(
    article?.description,
    article?.summary,
    stripTags(getContent(article)).slice(0, 160),
  );
  const canonical = `${SITE_URL}/blogs/${slug}`;
  const publishedAt = pick(
    article?.publishedAt,
    article?.createdAt,
    article?.publishDate,
  );

  const { contentWithIds, headings } = buildToc(getContent(article));
  const decorated = CONTENT_STYLES.reduce(
    (html, [tag, classes]) => addClass(html, tag, classes),
    addLazyLoading(contentWithIds),
  );

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    image: cover.url,
    inLanguage: "fa-IR",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Person", name: author.name },
    publisher: { "@type": "Organization", name: "آوا رزرو" },
    ...(isoDate(publishedAt) ? { datePublished: isoDate(publishedAt) } : {}),
  });

  return render(template, {
    PAGE_TITLE: escapeHtml(`${title} | آوا`),
    META_DESCRIPTION: escapeHtml(description),
    CANONICAL_URL: canonical,
    JSON_LD: jsonLd,
    CATEGORY: escapeHtml(getCategory(article)),
    TITLE_HTML: escapeHtml(title),
    EXCERPT: escapeHtml(description),
    AUTHOR_NAME: escapeHtml(author.name),
    AUTHOR_IMAGE: author.image,
    AUTHOR_BIO: escapeHtml(author.bio),
    PUBLISHED_AT_ISO: isoDate(publishedAt),
    PUBLISHED_AT_FA: jalaliDate(publishedAt),
    READING_TIME: toPersianDigits(readingTime(article)),
    COVER_URL: cover.url,
    COVER_ALT: escapeHtml(cover.alt),
    TOC_CARD: getTocCard(headings),
    CONTENT: decorated,
    TAGS: getTagsBlock(getTags(article)),
    RELATED: getRelatedBlock(related),
    SHARE_TELEGRAM: `https://t.me/share/url?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(title)}`,
    SHARE_WHATSAPP: `https://wa.me/?text=${encodeURIComponent(`${title} ${canonical}`)}`,
    SHARE_LINKEDIN: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`,
  });
};

const getArticleDetail = async (slug) => {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(slug)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${slug}`);
  const json = await response.json();
  return json?.data?.item ?? json?.data ?? null;
};

const generateBlogPage = async (item, template, articles) => {
  const slug = getSlug(item);
  if (!slug) {
    console.warn("⚠️  article without slug, skipped:", item?.title);
    return;
  }

  let article = item;
  try {
    article = (await getArticleDetail(slug)) ?? item;
  } catch (error) {
    console.warn(
      `⚠️  detail fetch failed for "${slug}", using list data. (${error.message})`,
    );
  }

  const related = articles
    .filter((other) => getSlug(other) !== slug)
    .slice(0, 3);
  const outputPath = path.join(BLOGS_DIR, slug, "index.html");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    buildArticleHtml(article, template, related),
    "utf8",
  );
  console.log(`✅ blogs/${slug}/index.html generated.`);
};

const generateBlogPages = async (articles) => {
  const templatePath = path.join(__dirname, "blog_template.html");

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, "utf8");

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const chunk = articles.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map((item) => generateBlogPage(item, template, articles)),
    );
  }
};

/* ------------------------------------------------------------------ run */

const getBlogs = async () => {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const articles = json?.data?.items ?? [];

    if (!articles.length) {
      console.warn("⚠️  no articles returned from API.");
      return;
    }

    generateBlogsPage(articles);
    await generateBlogPages(articles);

    console.log(`\n🎉 done: ${articles.length} article page(s) + blogs.html`);
  } catch (error) {
    console.error("❌ Error generating blog pages:", error);
    process.exitCode = 1;
  }
};

getBlogs();
