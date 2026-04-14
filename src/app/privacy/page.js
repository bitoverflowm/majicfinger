import { Navbar } from "@/components/sections/navbar";
import { FooterSection } from "@/components/sections/footer-section";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Lychee",
  description: "Privacy Policy for Lychee - Your Quant in a Box",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString("en-US")}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly, such as your email address and name when you create an account. We also collect usage data to improve our Service, including how you interact with our features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve the Service, to process transactions, to send you technical notices and support messages, and to respond to your inquiries.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              We may use third-party services for authentication, analytics, and payment processing. These services have their own privacy policies governing the use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookies</h2>
            <p>
              We use cookies and similar technologies to maintain your session and preferences. You can control cookie settings through your browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal information. You may also opt out of marketing communications at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@bitoverflow.org" className="underline hover:text-primary">
                support@bitoverflow.org
              </a>
              .
            </p>
          </section>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mt-12">
          ← Back to Home
        </Link>
      </article>
      <FooterSection />
    </main>
  );
}
