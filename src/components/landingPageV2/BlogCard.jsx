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
    <Link
      href={`/guides/${data.slug}`}
      className="block min-w-0 max-w-full"
      prefetch={false}
    >
      <div className="mb-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-background p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md dark:border-neutral-800">
        {data.image && (
          <div className="relative mb-4 aspect-[40/21] w-full max-w-full overflow-hidden rounded-lg border">
            <Image
              className="object-cover"
              src={data.image}
              alt={data.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          </div>
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
