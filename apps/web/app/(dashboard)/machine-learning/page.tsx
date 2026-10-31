"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function MachineLearningPage() {
  const [readiness, setReadiness] = useState<Record<string, boolean> | null>(null);
  const [job, setJob] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch<{ models: Record<string, boolean> }>("/ml/readiness");
    setReadiness(res.models);
  }

  useEffect(() => {
    load().catch(() => setReadiness(null));
  }, []);

  async function train(model: string) {
    const res = await apiFetch<{ job_id: string }>(`/ml/train/${model}`, { method: "POST" });
    setJob(res.job_id);
  }

  async function checkJob() {
    if (!job) return;
    const res = await apiFetch<{ status: string; result?: unknown; error?: string }>(`/ml/jobs/${job}`);
    alert(JSON.stringify(res));
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader><CardTitle>Machine Learning</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1 text-sm">
            {readiness &&
              Object.entries(readiness).map(([name, ready]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span>{ready ? "siap" : "belum dilatih"}</span>
                </div>
              ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["forecasting", "rfm", "mba", "churn", "anomaly"].map((m) => (
              <Button key={m} size="sm" variant="outline" onClick={() => train(m)}>
                Latih {m}
              </Button>
            ))}
          </div>
          {job && (
            <Button size="sm" onClick={checkJob}>
              Cek job {job.slice(0, 8)}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}