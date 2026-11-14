import Link from "next/link";

type JarvisCta = { href: string; text: string; title?: string; description?: string };

/** Homepage pointer to /jarvis, one line under the hero buttons. */
export function JarvisHeroCallout({ cta }: { cta: JarvisCta }) {
  return (
    <p className="max-w-[34rem] text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
      {cta.title ? <span className="text-primary">{cta.title}</span> : null} {cta.description}{" "}
      <Link href={cta.href} className="whitespace-nowrap text-secondary transition-colors hover:text-primary">
        {cta.text} →
      </Link>
    </p>
  );
}
