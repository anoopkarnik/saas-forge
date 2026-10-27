// Short CDN caching so an unpublished post leaves the feeds and markdown copies within a minute.
export const FEED_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=60";

export const textResponse = (body: string, contentType: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      // A cached 404 would hide a post published moments later.
      "Cache-Control": status === 200 ? FEED_CACHE_CONTROL : "no-store",
    },
  });
