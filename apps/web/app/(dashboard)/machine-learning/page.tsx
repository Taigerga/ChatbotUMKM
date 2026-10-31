"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function MachineLearningPage() {
  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader><CardTitle>Machine Learning</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pipeline ML dan layanan FastAPI akan ditambahkan pada milestone berikutnya.
        </CardContent>
      </Card>
    </div>
  );
}
