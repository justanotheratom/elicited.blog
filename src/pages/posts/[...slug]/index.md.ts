import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { SITE } from "@/config";
import fs from "node:fs/promises";

export async function getStaticPaths() {
  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft)
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  const post = props as CollectionEntry<"blog">;

  // Read the raw file content
  const rawContent = await fs.readFile(post.filePath!, "utf-8");

  // Extract body (content after frontmatter)
  const body = extractBody(rawContent);

  // Generate AI-friendly markdown with clean frontmatter
  const markdown = generateMarkdown(post, body, url.origin);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};

function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

function generateMarkdown(
  post: CollectionEntry<"blog">,
  body: string,
  origin: string
): string {
  const { title, description, pubDatetime, modDatetime, author, tags } =
    post.data;
  const canonicalUrl = `${origin}${getPath(post.id, post.filePath)}`;

  const frontmatterLines = [
    "---",
    `title: "${title}"`,
    `description: "${description}"`,
    `author: "${author || SITE.author}"`,
    `published: ${pubDatetime.toISOString()}`,
  ];

  if (modDatetime) {
    frontmatterLines.push(`modified: ${modDatetime.toISOString()}`);
  }

  frontmatterLines.push(
    `tags: [${tags.map(t => `"${t}"`).join(", ")}]`,
    `url: "${canonicalUrl}"`,
    "---"
  );

  return `${frontmatterLines.join("\n")}\n\n${body}\n`;
}
