"use client";

import { Button } from "@workspace/ui/components/button";

export function DataPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return <p className="text-muted-foreground text-xs">{total} data</p>;
  }
  return (
    <div className="flex items-center justify-between gap-2 pt-2 text-sm">
      <span className="text-muted-foreground text-xs">
        Halaman {page} dari {lastPage} · {total} data
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </Button>
        <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
