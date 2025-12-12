# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server at localhost:4321
pnpm run build        # Build production site (includes type check, astro build, and pagefind)
pnpm run preview      # Preview production build locally
pnpm run format:check # Check code formatting with Prettier
pnpm run format       # Format code with Prettier
pnpm run lint         # Run ESLint
pnpm run sync         # Generate TypeScript types for Astro modules
```

## Architecture

This is an Astro blog (AstroPaper theme) using TypeScript and Tailwind CSS v4.

### Content

- Blog posts live in `src/data/blog/` as `.md` or `.mdx` files
- Content schema defined in `src/content.config.ts` - posts require: `title`, `description`, `pubDatetime`, `tags`
- Post frontmatter example:
  ```yaml
  ---
  title: "Post Title"
  description: "Post description"
  pubDatetime: 2025-01-01T00:00:00Z
  tags:
    - tag1
    - tag2
  ---
  ```
- Optional frontmatter: `author`, `modDatetime`, `featured`, `draft`, `ogImage`, `canonicalURL`, `hideEditPost`, `timezone`

### Key Files

- `src/config.ts` - Site-wide configuration (title, description, pagination settings)
- `src/constants.ts` - Social links and share link definitions
- `astro.config.ts` - Astro configuration with MDX, sitemap, and Shiki code highlighting

### Pages

- `src/pages/index.astro` - Homepage
- `src/pages/posts/[...slug]/` - Individual post pages with dynamic OG image generation
- `src/pages/tags/` - Tag listing and filtering
- `src/pages/archives/` - Post archives
- `src/pages/search.astro` - Search page (uses Pagefind)

### Utilities

- `src/utils/` - Helper functions for post filtering, sorting, slug generation, and OG image generation
- OG images generated dynamically using Satori and Sharp (`src/utils/og-templates/`)
