import { SectionHeader } from "@/components/section-header";
import { SocialProofTestimonials } from "@/components/testimonial-scroll";
import { siteConfig } from "@/lib/config";

export function TestimonialSection() {
  const { testimonials, testimonialSection } = siteConfig;

  return (
    <section
      id="testimonials"
      className="flex w-full flex-col items-center justify-center"
    >
      <SectionHeader>
        <h2 className="text-balance text-center text-3xl font-medium tracking-tighter md:text-4xl">
          {testimonialSection.title}
        </h2>
        <p className="text-balance text-center font-medium text-muted-foreground">
          {testimonialSection.description}
        </p>
      </SectionHeader>
      <SocialProofTestimonials testimonials={testimonials} />
    </section>
  );
}
