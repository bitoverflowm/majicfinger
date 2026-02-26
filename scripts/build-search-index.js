const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.join(process.cwd(), "content");
const CONTENT_TYPES = ["guides", "integrations", "concepts", "playbooks"];

function getAllContent() {
  const items = [];
  for (const contentType of CONTENT_TYPES) {
    const dir = path.join(CONTENT_DIR, contentType);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".mdx")) continue;
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(dir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const matter = require("gray-matter");
      const { data, excerpt } = matter(fileContent, {
        excerpt: true,
        excerpt_separator: "\n\n",
      });
      items.push({
        slug,
        contentType,
        title: data.title || "",
        description: data.description || "",
        excerpt: excerpt?.trim(),
        integration: data.integration || [],
        topics: data.topics || data.tags || [],
        tags: data.tags || [],
      });
    }
  }
  return items;
}

const index = getAllContent();
const outputPath = path.join(process.cwd(), "public", "search-index.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(index), "utf-8");
console.log(`Search index built: ${index.length} items`);
