"use client";

import { useEffect, useState } from "react";
import {
  Search,
  LogOut,
  ArrowRight,
  BookOpen,
  UserCircle2,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { getCookie, deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";

interface DinasItem {
  id: number;
  namaDinas: string;
  totalProgram: number;
  programPrioritas: number;
  programTerlambat: number;
  slug: string;
}

type FilterStatus = "semua" | "terlambat" | "aman";

export default function GubernurInstansiPage() {
  const [instansiList, setInstansiList] = useState<DinasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const fetchInstansi = async () => {
    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/gubernur/dinas`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json?.data) setInstansiList(json.data);
      if (json?.user) setUser(json.user);
    } catch (err) {
      console.error("Error fetch dinas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInstansi(); }, []);

  const handleMasukInstansi = (slug: string) => router.push(`/monitoring-gubernur/${slug}`);

  const handleLogout = async () => {
    try {
      const token = getCookie("accessToken");
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/auth/logout`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      deleteCookie("accessToken");
      router.push("/");
    }
  };

  const countTerlambat = instansiList.filter((i) => i.programTerlambat > 0).length;
  const countAman = instansiList.filter((i) => i.programTerlambat === 0).length;

  const filterOptions: {
    value: FilterStatus;
    label: string;
    icon: React.ReactNode;
    count: number;
    iconColor: string;
  }[] = [
    { value: "semua",     label: "Semua",    icon: <LayoutGrid size={14} />,    count: instansiList.length, iconColor: "text-gray-500" },
    { value: "terlambat", label: "Terlambat", icon: <AlertTriangle size={14} />, count: countTerlambat,      iconColor: "text-red-500"  },
    { value: "aman",      label: "Aman",      icon: <CheckCircle2 size={14} />,  count: countAman,           iconColor: "text-emerald-600" },
  ];

  const selected = filterOptions.find((o) => o.value === filterStatus)!;

  const filteredList = instansiList.filter((item) => {
    const matchSearch = item.namaDinas.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      filterStatus === "semua" ? true
      : filterStatus === "terlambat" ? item.programTerlambat > 0
      : item.programTerlambat === 0;
    return matchSearch && matchFilter;
  });

  return (
    <section className="min-h-screen bg-[#2d0000]">
      <div className="bg-[#ececec] min-h-screen py-6 px-4 sm:py-8 sm:px-8 lg:py-10 lg:px-16 xl:px-32">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8">
          <div className="flex items-center gap-4 sm:items-start sm:gap-6">
            <div className="bg-[#CB0E0E] w-12 h-12 sm:w-16 sm:h-16 rounded-2xl rotate-6 flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg shrink-0">
              <BookOpen />
            </div>
            <div>
              <p className="text-xs text-[#CB0E0E] tracking-widest uppercase">Sulawesi Selatan</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold italic tracking-wide text-black">
                PILIH INSTANSI
              </h1>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-4">
            <div className="bg-white px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2 sm:gap-3">
              <UserCircle2 size={20} color="green" className="shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-black">{user?.username ?? "Loading..."}</p>
                <p className="text-[10px] sm:text-xs text-black">{user?.role ?? ""}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs sm:text-sm bg-[#CB0E0E] text-white px-3 sm:px-4 py-2 cursor-pointer rounded-lg shadow hover:bg-red-800 transition shrink-0"
            >
              <LogOut size={14} />
              Logout
            </button>
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
              placeholder="Cari instansi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border placeholder:text-gray-500 border-gray-300 bg-white focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
            />
          </div>
        </div>

        <hr className="mb-6 border-gray-300" />

        {/* ================= CARD GRID ================= */}
        {loading && <p className="text-gray-500 text-sm">Memuat data...</p>}

        {!loading && filteredList.length === 0 && (
          <p className="text-gray-500 text-sm">Tidak ada instansi yang cocok dengan pencarian.</p>
        )}

        {!loading && filteredList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 text-black">
            {filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMasukInstansi(item.slug)}
                className="relative bg-white rounded-3xl shadow-lg p-4 lg:p-5 hover:shadow-xl transition border-t-[12px] border-[#CB0E0E] cursor-pointer flex flex-col"
              >
                {item.programTerlambat > 0 && (
                  <div
                    title={`${item.programTerlambat} program terlambat`}
                    className="absolute top-3 right-3 bg-yellow-400 rounded-full p-1 shadow"
                  >
                    <AlertTriangle size={13} className="text-white" />
                  </div>
                )}

                <div className="mt-3 mb-4">
                  <div className="bg-[#CB0E0E] w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow">
                    <BookOpen size={20} />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-sm lg:text-base font-bold mb-1 leading-snug line-clamp-3">
                    {item.namaDinas}
                  </h2>
                  <p className="text-[10px] lg:text-xs text-gray-500 mt-2">Program Prioritas</p>
                  <p className="text-xs lg:text-sm text-[#CB0E0E] font-semibold">
                    {item.programPrioritas} / {item.totalProgram}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-[10px] lg:text-xs text-[#CB0E0E] tracking-widest uppercase font-medium">
                    Masuk Instansi
                  </span>
                  <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full border border-gray-400 flex items-center justify-center shrink-0">
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}