"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Option = {
  id: number;
  label: string;
  value: string;
};

export type SelectedMetode = {
  key: string;
  pengadaanId: number;
  title: string;
  anggaran: string;
};

type Props = {
  options: Option[];
  selected: SelectedMetode[];
  onChange: (id: number) => void;
  onRemove: (key: string) => void;
  onUpdateItem: (
    key: string,
    field: "title" | "anggaran",
    value: string,
  ) => void;
};

export default function MultiSelectMetode({
  options,
  selected,
  onChange,
  onRemove,
  onUpdateItem,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open, selected]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.top + window.scrollY - 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(!open);
  };

  const formatRupiah = (value: string) => {
    const number = value.replace(/\D/g, "");
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="relative space-y-3" ref={ref}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 cursor-pointer flex justify-between items-center focus:ring-2 focus:ring-red-500"
      >
        <span className="text-gray-700">
          {selected.length > 0
            ? `${selected.length} metode dipilih`
            : "Pilih Metode"}
        </span>
        <ChevronDown size={18} />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            transform: "none",
            zIndex: 9999,
          }}
          className="bg-white border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {options.map((item) => {
            const count = selected.filter(
              (s) => s.pengadaanId === item.id,
            ).length;

            return (
              <div
                key={item.id}
                onClick={() => onChange(item.id)}
                className="px-4 py-2 hover:bg-red-50 cursor-pointer flex justify-between items-center"
              >
                <span>{item.label}</span>
                {count > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                    <Check size={16} className="text-red-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input keterangan + anggaran per metode */}
      {selected.map((item) => {
        const metodeData = options.find((m) => m.id === item.pengadaanId);

        return (
          <div
            key={item.key}
            className="mt-1 bg-gray-100 rounded-2xl p-3 shadow-inner space-y-2"
          >
            {/* Header metode */}
            <div className="flex justify-between items-center">
              <p className="text-red-600 font-semibold text-sm">
                {metodeData?.label}
              </p>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>

            {/* Keterangan / title */}
            <textarea
              placeholder="Tambahkan keterangan"
              value={item.title}
              onChange={(e) => onUpdateItem(item.key, "title", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
              rows={1}
            />

            {/* Anggaran per metode */}
            <div>
              <label className="text-xs text-gray-500">Anggaran</label>
              <input
                type="text"
                placeholder="0"
                value={item.anggaran}
                onChange={(e) =>
                  onUpdateItem(
                    item.key,
                    "anggaran",
                    formatRupiah(e.target.value),
                  )
                }
                className="w-full mt-1 px-4 py-2 rounded-xl bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
