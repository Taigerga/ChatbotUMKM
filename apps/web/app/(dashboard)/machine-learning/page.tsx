"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import StatusSection from "./status-section";
import InsightsSection from "./insights-section";
import TokoSection from "./toko-section";

const TABS = [
  { id: "status", label: "Status Data" },
  { id: "cerdas", label: "Analisis Cerdas" },
  { id: "toko", label: "Model Toko" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function MachineLearningPage() {
  const [tab, setTab] = useState<Tab>("status");

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Machine Learning</CardTitle>
          <div className="bg-muted flex gap-1 rounded-md p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded px-3 py-1 text-sm ${
                  tab === t.id ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "status" && <StatusSection />}
          {tab === "cerdas" && <InsightsSection />}
          {tab === "toko" && <TokoSection />}
        </CardContent>
      </Card>
    </div>
  );
}
