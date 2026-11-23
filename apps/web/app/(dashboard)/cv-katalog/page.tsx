import { CatalogAssistant } from "@/components/cv/catalog-assistant";
import { SectionHeader } from "@/components/warung/section-header";

export default function CvKatalogPage() {
  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <SectionHeader
        eyebrow="Asisten katalog"
        title="Katalog Visual"
        description="Unggah foto rak, lalu cocokkan kotak hasil deteksi dengan produk toko."
      />
      <CatalogAssistant />
    </div>
  );
}
