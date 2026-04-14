import { Navbar } from "@/components/sections/navbar";
import { FooterSection } from "@/components/sections/footer-section";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Lychee",
  description: "Terms of Service for Lychee - Your Quant in a Box",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">
          Last updated: {new Date().toLocaleDateString("en-US")}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Lychee (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p>
              Lychee provides data analysis, visualization, and insights tools. The Service includes features such as chart creation, data connections, AI-powered analysis, and hosted dashboards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
            <p>
              You must create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
            <p>
              You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the Service. You may not attempt to gain unauthorized access to any part of the Service or its systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by Lychee and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. Lychee shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new terms on this page. Your continued use of the Service after such changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{" "}
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
