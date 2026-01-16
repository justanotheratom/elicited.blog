export default function middleware(request: Request) {
  const url = new URL(request.url);
  const acceptHeader = request.headers.get("accept") || "";

  // Content negotiation: serve markdown for Accept: text/markdown
  if (
    url.pathname.startsWith("/posts/") &&
    !url.pathname.endsWith(".md") &&
    !url.pathname.endsWith(".png") &&
    acceptHeader.includes("text/markdown")
  ) {
    // Rewrite to markdown endpoint
    const mdUrl = new URL(url);
    mdUrl.pathname = url.pathname.replace(/\/?$/, "/index.md");
    return fetch(mdUrl.toString());
  }

  // Continue to default handler
  return fetch(request);
}

export const config = {
  matcher: "/posts/:path*",
};
