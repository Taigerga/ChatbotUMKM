"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@workspace/ui/components/input";

export type ComboOption = { id: string; label: string; hint?: string; price?: string };

export function EntityCombobox({
  value,
  initialLabel = "",
  load,
  onChange,
  placeholder,
  clearLabel = "Tanpa pelanggan",
}: {
  value: string;
  initialLabel?: string;
  load: (query: string) => Promise<ComboOption[]>;
  onChange: (option: ComboOption | null) => void;
  placeholder?: string;
  clearLabel?: string;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    setLabel(initialLabel);
  }, [initialLabel]);

  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      load(query)
        .then((items) => {
          if (id === requestId.current) setOptions(items);
        })
        .catch(() => {
          if (id === requestId.current) setOptions([]);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [open, query, load]);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Input
        value={open ? query : label}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setLabel("");
          if (value) onChange(null);
        }}
      />
      {open && (
        <div className="bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-md">
          <button
            type="button"
            className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
            onClick={() => {
              onChange(null);
              setLabel("");
              setOpen(false);
            }}
          >
            {clearLabel}
          </button>
          {loading && <p className="text-muted-foreground px-3 py-2 text-xs">Mencari...</p>}
          {!loading && options.length === 0 && <p className="text-muted-foreground px-3 py-2 text-xs">Tidak ada hasil.</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
              onClick={() => {
                onChange(option);
                setLabel(option.label);
                setOpen(false);
              }}
            >
              {option.label}
              {option.hint && <span className="text-muted-foreground ml-2 text-xs">{option.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
