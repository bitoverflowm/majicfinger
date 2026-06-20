import { getProductsNavData } from "@/lib/nav/products-nav";
import { Navbar } from "@/components/sections/navbar";

/** Server wrapper — loads Products mega-menu links for SSR. */
export function MarketingNavbar() {
  const productsNav = getProductsNavData();
  return <Navbar productsNav={productsNav} />;
}
