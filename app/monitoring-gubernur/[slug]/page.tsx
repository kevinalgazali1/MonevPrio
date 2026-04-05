"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  AlertTriangle,
  Clock,
  LayoutGrid,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

interface ProgramItem {
  id: number;
  namaProgram: string;
  slug: string;
  anggaran: string;
  createdAt: string;
  pengadaanList: string[];
  isSelesai: boolean;
  isTerlambat: boolean;
  isPrioritas: boolean;
  tahapanSaatIni: string | null;
  keteranganSaatIni: string | null;
  status: string;
}

type FilterStatus = "semua" | "terlambat" | "aman";

export default function GubernurProgramPage() {
  const [programList, setProgramList] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const formatNamaDinas = (slug: string) =>
    slug?.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const fetchProgram = async () => {
    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/gubernur/dinas/${slug}/program`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json?.data) setProgramList(json.data);
    } catch (err) {
      console.error("Error fetch program:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (slug) fetchProgram(); }, [slug]);

  const formatRupiahCompact = (value: number) => {
    if (value >= 1_000_000_000_000)
      return `Rp ${(value / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Triliun`;
    if (value >= 1_000_000_000)
      return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Miliar`;
    if (value >= 1_000_000)
      return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Juta`;
    if (value >= 1_000)
      return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ribu`;
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const countTerlambat = programList.filter((i) => i.isTerlambat && !i.isSelesai).length;
  const countAman = programList.filter((i) => !(i.isTerlambat && !i.isSelesai)).length;

  const filterOptions: {
    value: FilterStatus;
    label: string;
    icon: React.ReactNode;
    count: number;
    iconColor: string;
  }[] = [
    { value: "semua",     label: "Semua",     icon: <LayoutGrid size={14} />,    count: programList.length, iconColor: "text-gray-500"    },
    { value: "terlambat", label: "Terlambat", icon: <AlertTriangle size={14} />, count: countTerlambat,     iconColor: "text-red-500"     },
    { value: "aman",      label: "Aman",      icon: <CheckCircle2 size={14} />,  count: countAman,          iconColor: "text-emerald-600" },
  ];

  const selected = filterOptions.find((o) => o.value === filterStatus)!;

  const filteredProgram = programList
    .filter((item) => {
      const matchSearch = item.namaProgram.toLowerCase().includes(searchTerm.toLowerCase());
      const isTerlambatAktif = item.isTerlambat && !item.isSelesai;
      const matchFilter =
        filterStatus === "semua" ? true
        : filterStatus === "terlambat" ? isTerlambatAktif
        : !isTerlambatAktif;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => Number(b.anggaran) - Number(a.anggaran));

  return (
    <section className="min-h-screen">
      <div className="bg-[#ececec] min-h-screen py-6 px-4 sm:py-8 sm:px-8 lg:py-10 lg:px-16 xl:px-32 text-black">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-4 sm:items-start sm:gap-6">
            <div className="bg-[#CB0E0E] w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl rotate-6 flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg shrink-0">
              <BookOpen />
            </div>
            <div>
              <p className="text-xs text-[#CB0E0E] uppercase tracking-widest">
                {formatNamaDinas(slug)}
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold italic tracking-wide">
                DASHBOARD
              </h1>
            </div>
          </div>
        </div>

        {/* ================= FILTER DROPDOWN + SEARCH ================= */}
        <div className="flex items-center gap-3 mb-6">

          {/* Dropdown Filter */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 transition cursor-pointer min-w-[130px]"
            >
              <span className={selected.iconColor}>{selected.icon}</span>
              <span className="flex-1 text-left text-black">{selected.label}</span>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {selected.count}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setFilterStatus(opt.value); setDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition cursor-pointer
                      ${filterStatus === opt.value
                        ? "bg-gray-50 font-semibold text-black"
                        : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <span className={opt.iconColor}>{opt.icon}</span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border placeholder:text-gray-500 border-gray-300 bg-white focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
            />
          </div>
        </div>

        <hr className="mb-6 border-gray-300" />

        {/* ================= BACK BUTTON ================= */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-white px-3 py-2 sm:px-4 rounded-lg shadow hover:bg-gray-100 transition mb-6 sm:mb-10 cursor-pointer text-sm"
        >
          <ArrowLeft size={15} />
          Kembali
        </button>

        {/* ================= PROGRAM CARD ================= */}
        {loading && <p className="text-gray-500 text-sm">Memuat data...</p>}

        {!loading && filteredProgram.length === 0 && (
          <p className="text-gray-500 col-span-full text-center text-sm">
            Program tidak ditemukan
          </p>
        )}

        {!loading && filteredProgram.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6 text-black items-stretch">
            {filteredProgram.map((item) => {
              const showTerlambat = item.isTerlambat && !item.isSelesai;

              return (
                <div key={item.id} className="relative group h-full">
                  {/* Tooltip nama program */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 hidden group-hover:block pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg w-max max-w-[260px] text-center leading-snug break-words">
                      {item.namaProgram}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>

                  <Link href={`/monitoring-gubernur/${slug}/${item.slug}`} className="block h-full">
                    <div className="relative bg-white rounded-3xl shadow-lg p-4 lg:p-5 hover:shadow-xl transition border-t-[12px] border-[#CB0E0E] flex flex-col cursor-pointer hover:scale-[1.02] duration-200 h-full min-h-[220px] sm:min-h-[240px]">

                      {showTerlambat && (
                        <div title="Program terlambat" className="absolute top-3 right-3 bg-yellow-400 rounded-full p-1 shadow">
                          <AlertTriangle size={13} className="text-white" />
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-4 mb-4">
                        <div className="bg-[#CB0E0E] w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow">
                          <BookOpen size={20} />
                        </div>
                        {item.isSelesai ? (
                          <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                            <Check size={12} />
                            Selesai
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                            <Clock size={12} />
                            Aktif
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h2 className="text-sm lg:text-base font-bold leading-snug mb-2 line-clamp-3">
                          {item.namaProgram}
                        </h2>
                        <p className="text-[10px] lg:text-xs text-gray-500 line-clamp-2">
                          METODE : {item.pengadaanList.join(", ")}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[9px] lg:text-[10px] text-gray-400 uppercase tracking-wide shrink-0 mt-0.5">Tahapan</span>
                          <span className="text-[10px] lg:text-xs font-semibold text-[#CB0E0E] leading-tight">{item.tahapanSaatIni ?? "-"}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-[9px] lg:text-[10px] text-gray-400 uppercase tracking-wide shrink-0 mt-0.5">Ket.</span>
                          <span className="text-[10px] lg:text-xs text-gray-600 leading-tight line-clamp-2">{item.keteranganSaatIni ?? "-"}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <p className="text-[#CB0E0E] text-sm lg:text-base font-bold">
                          {formatRupiahCompact(Number(item.anggaran))}
                        </p>
                        <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border border-gray-400 flex items-center justify-center shrink-0">
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}