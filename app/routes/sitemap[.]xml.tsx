export async function loader() {
  const baseUrl = "https://motogt.com";
  
  // Static pages
  const staticPages = [
    { url: "", priority: "1.0", changefreq: "daily" },
    { url: "/available-cars", priority: "0.9", changefreq: "weekly" },
    { url: "/my-garage", priority: "0.8", changefreq: "weekly" },
    { url: "/cart", priority: "0.7", changefreq: "daily" },
    { url: "/privacy", priority: "0.5", changefreq: "monthly" },
  ];

  // You can fetch dynamic product pages here
  // Example: const products = await getProducts();
  // const productPages = products.map(p => ({ 
  //   url: `/products/${p.slug}`, 
  //   priority: "0.8", 
  //   changefreq: "weekly",
  //   lastmod: p.updatedAt 
  // }));

  const allPages = [...staticPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
