"use client";

import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tahapan {
  idTahapan: number;
  noUrut: number;
  namaTahapan: string;
  bobot: number;
  progres: {
    status: string;
  };
}

interface Pengadaan {
  id: number;
  namaTransaksi: string;
  jenisPengadaan: string;
  title: string;
  anggaran: number;
  tahapanList: Tahapan[];
}

interface SidebarProps {
  pengadaanList?: Pengadaan[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

const formatRupiahCompact = (value: number): string => {
  if (value >= 1_000_000_000_000)
    return `Rp ${(value / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (value >= 1_000_000_000)
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (value >= 1_000_000)
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
  if (value >= 1_000)
    return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Rb`;
  return `Rp ${value.toLocaleString("id-ID")}`;
};

export default function Sidebar({
  pengadaanList = [],
  activeTab,
  onTabChange,
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const router = useRouter();
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});

  const toggleDropdown = (id: number) => {
    setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-64
          bg-white shadow-lg
          flex flex-col justify-between
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Scrollable Content */}
        <div className="overflow-y-auto">
          {/* Logo */}
          <div className="p-6 pb-4">
            <div className="relative bg-[#CB0E0E] w-14 h-14 mx-auto rounded-xl rotate-6 flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-white -rotate-6" />
            </div>
            <h2 className="font-bold text-lg text-center">SULSEL PROV</h2>
            <p className="text-xs text-gray-500 text-center">E-MONITORING</p>
          </div>

          <nav className="px-4 space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => {
                onTabChange?.("semua");
                router.back();
              }}
              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "semua"
                  ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>

            {/* Pengadaan Dropdown */}
            {pengadaanList.map((pengadaan) => (
              <div key={pengadaan.id}>
                <button
                  onClick={() => {
                    const isOpen = openDropdowns[pengadaan.id];
                    toggleDropdown(pengadaan.id);
                    if (isOpen) {
                      onTabChange?.("semua");
                    } else {
                      onTabChange?.(`pengadaan-${pengadaan.id}`);
                    }
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === `pengadaan-${pengadaan.id}`
                      ? "bg-[#CB0E0E] text-white"
                      : "bg-[#CB0E0E]/10 text-[#CB0E0E] hover:bg-[#CB0E0E]/20"
                  }`}
                >
                  <div className="flex items-center gap-1 truncate">
                    <FileText size={20} className="shrink-0" />
                    <div className="flex flex-col text-start">
                      <span className="truncate font-semibold">
                        {pengadaan.jenisPengadaan}
                      </span>
                      <span className="text-xs opacity-80">
                        {pengadaan.title}
                      </span>
                      {/* Anggaran dalam format rupiah compact */}
                      <span
                        className={`text-xs font-bold mt-0.5 ${
                          activeTab === `pengadaan-${pengadaan.id}`
                            ? "text-white/90"
                            : "text-[#CB0E0E]"
                        }`}
                      >
                        {formatRupiahCompact(pengadaan.anggaran)}
                      </span>
                    </div>
                  </div>
                  {openDropdowns[pengadaan.id] ? (
                    <ChevronDown size={14} className="shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="shrink-0" />
                  )}
                </button>

                {openDropdowns[pengadaan.id] && (
                  <div className="ml-4 mt-1 border-l-2 border-red-200 pl-3 space-y-0.5">
                    {pengadaan.tahapanList.map((tahapan) => {
                      const tabKey = `tahapan-${pengadaan.id}-${tahapan.idTahapan}`;
                      return (
                        <button
                          key={tahapan.idTahapan}
                          onClick={() => onTabChange?.(tabKey)}
                          className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-colors text-left ${
                            activeTab === tabKey
                              ? "bg-red-50 text-[#CB0E0E] font-semibold"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {tahapan.noUrut}
                          </span>
                          <span className="truncate">{tahapan.namaTahapan}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex flex-row items-center gap-2 bg-gray-100 p-3 rounded-lg text-sm">
            <Building2 color="#CB0E0E" size={20} />
            <div>
              <p className="text-[#CB0E0E] font-semibold text-xs">Instansi</p>
              <p className="text-gray-700 text-xs">DINAS BMBK</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}