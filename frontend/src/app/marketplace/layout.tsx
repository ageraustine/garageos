// Public marketplace layout - accessible without login
import { Header, Footer } from "@/components/sections";

export const metadata = {
  title: "Marketplace | GarageOS",
  description: "Find spare parts and consumables from verified sellers across East Africa",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-stone-50 pt-20 lg:pt-24">
        {children}
      </main>
      <Footer />
    </>
  );
}
