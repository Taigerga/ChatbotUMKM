"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { SectionHeader } from "@/components/warung/section-header";
import StatusSection from "./status-section";
import InsightsSection from "./insights-section";
import TokoSection from "./toko-section";

export default function MachineLearningPage() {
  return (
    <div className="grid gap-5 p-4 dash-stagger">
      <SectionHeader
        eyebrow="Mesin pintar"
        title="Analisis toko"
        description="Bantuan membaca data penjualan. Semua angka adalah perkiraan, bukan keputusan otomatis."
      />

      <Tabs defaultValue="ringkasan" className="gap-4">
        <TabsList variant="line" className="w-full justify-start gap-4 border-b pb-1">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="cerdas">Analisis cerdas</TabsTrigger>
          <TabsTrigger value="toko">Model toko</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan">
          <StatusSection />
        </TabsContent>
        <TabsContent value="cerdas">
          <InsightsSection />
        </TabsContent>
        <TabsContent value="toko">
          <TokoSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
