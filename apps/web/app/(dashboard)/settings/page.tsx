"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function SettingsPage() {
  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader><CardTitle>Pengaturan</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pengaturan tenant akan ditambahkan pada milestone berikutnya.
        </CardContent>
      </Card>
    </div>
  );
}
