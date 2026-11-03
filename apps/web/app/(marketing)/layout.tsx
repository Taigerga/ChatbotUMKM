import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { cn } from "@workspace/ui/lib/utils";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";
import "./marketing.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Chatbot UMKM — catat sambil ngobrol, putuskan pakai angka",
  description:
    "Asisten data untuk warung dan toko kecil: catat penjualan, produk, dan pelanggan lewat obrolan. Ringkasan, stok, dan kesiapan data langsung terlihat.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("mk mk-grain min-h-svh", display.variable)}>
      <MarketingNav />
      <div className="relative z-10">{children}</div>
      <MarketingFooter />
    </div>
  );
}
