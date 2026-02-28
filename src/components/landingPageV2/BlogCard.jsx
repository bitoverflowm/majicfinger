"use client";

import Link from "next/link";
import Image from "next/image";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogCard({ data, priority = false }) {
  return (
    <Link href={`/guides/${data.slug}`} className="block" prefetch={false}>
      <div className="bg-background rounded-xl p-4 mb-4 border border-neutral-200 dark:border-neutral-800 hover:shadow-md hover:border-primary/30 transition-all duration-200">
        {data.image && (
          <Image
            className="rounded-t-lg object-cover border"
            src={data.image}
            width={1200}
            height={630}
            alt={data.title}
            priority={priority}
          />
        )}
        {!data.image && (
          <div className="bg-muted h-[180px] mb-4 rounded flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        <p className="mb-2">
          <time
            dateTime={data.publishedAt}
            className="text-sm text-muted-foreground"
          >
            {formatDate(data.publishedAt)}
          </time>
        </p>
        <h3 className="text-xl font-semibold mb-2">{data.title}</h3>
        <p className="text-foreground mb-4">{data.summary}</p>
      </div>
    </Link>
  );
}
