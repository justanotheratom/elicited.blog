import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";

const remarkDemoteBodyH1 = () => {
  return (tree: { type?: string; depth?: number; children?: unknown[] }) => {
    const visit = (node: typeof tree) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "heading" && node.depth === 1) {
        node.depth = 2;
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(child => visit(child as typeof tree));
      }
    };

    visit(tree);
  };
};

const getSitemapPathname = (page: string) =>
  new URL(page, SITE.website).pathname.replace(/\/+$/, "/");

const shouldIncludeInSitemap = (page: string) => {
  const pathname = getSitemapPathname(page);

  if (pathname === "/search/" || pathname === "/archives/") {
    return false;
  }

  if (/^\/posts\/\d+\/$/.test(pathname)) {
    return false;
  }

  if (/^\/tags\/[^/]+\/\d+\/$/.test(pathname)) {
    return false;
  }

  return true;
};

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    sitemap({
      filter: shouldIncludeInSitemap,
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      remarkDemoteBodyH1,
      [remarkCollapse, { test: "Table of contents" }],
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
  },
});
