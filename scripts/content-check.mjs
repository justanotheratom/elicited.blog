import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import kebabcase from "lodash.kebabcase";

const BLOG_DIR = path.resolve(process.cwd(), "src/data/blog");
const PAGE_DIR = path.resolve(process.cwd(), "src/pages");
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const mdPostLink = /!?\[[^\]]*?\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const htmlLink = /\b(?:href|src)=["']([^"']+)["']/g;

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function safePathname(url) {
  return decodeURIComponent(url.split("?")[0].split("#")[0]).trim();
}

function stripQuotes(url) {
  return url.trim().replace(/^['"]|['"]$/g, "");
}

function isSkippableLink(url) {
  return (
    !url ||
    url.startsWith("#") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("javascript:") ||
    url.startsWith("data:")
  );
}

function isDynamicSegment(name) {
  return name.startsWith("[") && name.endsWith("]");
}

async function collectMarkdownPosts(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      posts.push(...(await collectMarkdownPosts(fullPath)));
      continue;
    }

    if (entry.isFile() && [".md", ".mdx"].includes(path.extname(entry.name))) {
      posts.push(fullPath);
    }
  }

  return posts;
}

function postRouteFromFile(filePath) {
  const relativePath = path.relative(BLOG_DIR, filePath).replace(/\.mdx?$/i, "");
  const parts = toPosix(relativePath).split("/");
  const file = parts.pop() || "";
  const directories = parts
    .filter(Boolean)
    .filter(pathSegment => !pathSegment.startsWith("_"))
    .map(pathSegment => kebabcase(pathSegment));

  return ["/posts", ...directories, file].filter(Boolean).join("/");
}

function getPostRoutes(postPaths) {
  const routes = new Set(["/posts", "/posts/"]);

  for (const file of postPaths) {
    const route = postRouteFromFile(file);
    routes.add(route);
    routes.add(`${route}/`);
  }

  return routes;
}

function addSetVariants(set, value) {
  set.add(value);
  if (!value.endsWith("/")) {
    set.add(`${value}/`);
  }
}

function routeFromParts(parts) {
  const normalized = parts.map(part => part.replace(/\.[^.]+$/, "").replace(/^\//, ""));
  const file = normalized.pop() || "";
  const useFile = file === "index" ? null : file;
  const segments = [...normalized, useFile].filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

async function collectPageRoutes(dir = PAGE_DIR, routeParts = []) {
  const routes = new Set();
  const dynamicPrefixes = new Set();

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const baseRoute = routeParts.length === 0 ? "/" : `/${routeParts.join("/")}`;

    if (entry.isDirectory()) {
      if (isDynamicSegment(entry.name)) {
        dynamicPrefixes.add(baseRoute === "/" ? "/" : `${baseRoute}/`);
        continue;
      }

      const nested = await collectPageRoutes(fullPath, [...routeParts, entry.name]);
      nested.routes.forEach(route => routes.add(route));
      nested.dynamicPrefixes.forEach(prefix => dynamicPrefixes.add(prefix));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const isSupportedRouteFile = /\.(astro|md|ts|tsx|js|jsx)$/i.test(entry.name);
    if (!isSupportedRouteFile) {
      continue;
    }

    if (isDynamicSegment(entry.name)) {
      dynamicPrefixes.add(baseRoute === "/" ? "/" : `${baseRoute}/`);
      continue;
    }

    const fullRouteParts = [...routeParts, entry.name];
    const route = routeFromParts(fullRouteParts);
    addSetVariants(routes, route);
  }

  return { routes, dynamicPrefixes };
}

async function getPageRoutes() {
  const result = await collectPageRoutes();
  return result;
}

function findLinks(content) {
  const links = [];
  let match;

  mdPostLink.lastIndex = 0;
  while ((match = mdPostLink.exec(content)) !== null) {
    links.push(match[1]);
  }

  htmlLink.lastIndex = 0;
  while ((match = htmlLink.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
}

function isValidMarkdownRelativeLink(url, sourceDir) {
  const normalized = safePathname(url);
  const isExternal = /^https?:\/\//i.test(normalized);
  if (isExternal) return true;

  if (normalized.startsWith("/")) {
    return true;
  }

  if (normalized.startsWith(".") === false) {
    return true;
  }

  const resolved = path.resolve(sourceDir, normalized);
  const ext = path.extname(resolved);

  const candidatePaths =
    ext
      ? [resolved]
      : [resolved + ".md", resolved + ".mdx", resolved + "/index.md", resolved + "/index.mdx"];

  return candidatePaths.some(candidate => existsSync(candidate));
}

function isValidPostRoute(url, postRoutes) {
  const normalized = safePathname(url).replace(/\/+$/, "");

  if (normalized === "/posts") {
    return true;
  }

  if (postRoutes.has(normalized) || postRoutes.has(`${normalized}/`)) {
    return true;
  }

  if (normalized.startsWith("/posts/")) {
    const segments = normalized.split("/").filter(Boolean);
    const postSegment = segments[1] || "";
    return /^\d+$/.test(postSegment);
  }

  return false;
}

function isPublicAsset(url) {
  const publicPath = path.join(PUBLIC_DIR, url.replace(/^\//, ""));
  return existsSync(publicPath) && !publicPath.endsWith(path.sep);
}

function isValidAbsoluteRoute(url, postRoutes, pageRoutes, dynamicPrefixes) {
  const normalized = safePathname(url);

  if (normalized === "/") {
    return true;
  }

  if (normalized.startsWith("/posts")) {
    return isValidPostRoute(normalized, postRoutes);
  }

  if (pageRoutes.has(normalized) || pageRoutes.has(`${normalized}/`)) {
    return true;
  }

  if (isPublicAsset(normalized)) {
    return true;
  }

  for (const prefix of dynamicPrefixes) {
    if (prefix === "/") {
      continue;
    }
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }

  if (normalized.startsWith("/pagefind")) {
    return true;
  }

  return false;
}

function validateLinks(content, sourceFile, postRoutes, pageRoutes, dynamicPrefixes, errors) {
  const links = findLinks(content);
  const sourceDir = path.dirname(sourceFile);

  for (const rawUrl of links) {
    const url = safePathname(stripQuotes(rawUrl));
    if (isSkippableLink(url)) continue;

    if (url.startsWith("/")) {
      if (!isValidAbsoluteRoute(url, postRoutes, pageRoutes, dynamicPrefixes)) {
        errors.push({
          file: path.relative(process.cwd(), sourceFile),
          link: rawUrl,
          reason: "internal route does not exist",
        });
      }
      continue;
    }

    if (!isValidMarkdownRelativeLink(rawUrl, sourceDir)) {
      errors.push({
        file: path.relative(process.cwd(), sourceFile),
        link: rawUrl,
        reason: "relative file not found",
      });
    }
  }
}

async function run() {
  const postPaths = await collectMarkdownPosts(BLOG_DIR);
  const postRoutes = getPostRoutes(postPaths);
  const pageData = await getPageRoutes();
  const pageRoutes = pageData.routes;
  const dynamicPrefixes = pageData.dynamicPrefixes;
  const errors = [];
  let totalLinks = 0;

  for (const postFile of postPaths) {
    const content = await fs.readFile(postFile, "utf8");
    const links = findLinks(content);
    totalLinks += links.length;
    validateLinks(content, postFile, postRoutes, pageRoutes, dynamicPrefixes, errors);
  }

  if (errors.length === 0) {
    console.log(`✅ Content check passed (${postPaths.length} posts, ${totalLinks} links).`);
    return;
  }

  console.error(`❌ Content check failed: ${errors.length} broken internal reference(s)`);
  for (const error of errors) {
    console.error(`- ${error.file} -> ${error.link} (${error.reason})`);
  }
  process.exit(1);
}

run().catch(error => {
  console.error("❌ Content check crashed:", error);
  process.exit(1);
});
