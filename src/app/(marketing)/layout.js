import { Navbar } from "@/components/sections/navbar";

export default function MarketingLayout({ children }) {
  return (
    <div className="relative mx-auto min-w-0 max-w-7xl border-x">
      <div className="block w-px h-full border-l border-border absolute top-0 left-6 z-10"></div>
      <div className="block w-px h-full border-r border-border absolute top-0 right-6 z-10"></div>
      <Navbar />
      {children}
    </div>
  );
}

