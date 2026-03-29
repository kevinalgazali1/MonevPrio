"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Menu,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { getCookie, deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import SidebarAdmin from "@/components/SidebarAdmin";

interface DinasItem {
  id: number;
  namaDinas: string;
  totalProgram: number;
  programPrioritas: number;
  programTerlambat?: number;
}

export default function StaffMasterPage() {
  const [instansiList, setInstansiList] = useState<DinasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const fetchInstansi = async () => {
    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const json = await res.json();

      if (json?.data) {
        setInstansiList(json.data);
      }

      if (json?.user) {
        setUser(json.user);
      }
    } catch (err) {
      console.error("Error fetch dinas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstansi();
  }, []);

  const generateSlug = (nama: string) => {
    return nama
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  const handleMasukInstansi = (id: number, namaDinas: string) => {
    const slug = generateSlug(namaDinas);
    router.push(`/monitoring-staff-master/${id}/${slug}`);
  };

  const handleLogout = async () => {
    try {
      const token = getCookie("accessToken");

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/auth/logout`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      deleteCookie("accessToken");
      router.push("/");
    }
  };

  const filteredList = instansiList.filter((item) =>
    item.namaDinas.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <section className="min-h-screen bg-[#2d0000]">
      {/* Sidebar */}
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="lg:ml-64 bg-[#ececec] min-h-screen py-6 px-4 sm:py-8 sm:px-8 lg:py-10 lg:px-16 xl:px-32">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8">

          {/* Kiri: Burger + Logo + Judul */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Burger — visible on mobile & tablet only */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow text-[#CB0E0E] hover:bg-gray-50 transition shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={22} />
            </button>

            <div className="bg-[#CB0E0E] w-12 h-12 sm:w-16 sm:h-16 rounded-2xl rotate-6 flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg shrink-0">
              <BookOpen />
            </div>

            <div>
              <p className="text-xs text-[#CB0E0E] tracking-widest uppercase">
                Sulawesi Selatan
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold italic tracking-wide text-black">
                PILIH INSTANSI
              </h1>
            </div>
          </div>

          {/* Kanan: User info + Logout */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-4">
            <div className="bg-white px-3 sm:px-4 py-2 rounded-xl shadow flex items-center gap-2 sm:gap-3">
              <UserCircle2 size={20} color="green" className="shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-black">
                  {user?.username ?? "Loading..."}
                </p>
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

        {/* ================= SEARCH + DIVIDER ================= */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <hr className="hidden sm:block flex-1 border-gray-300" />

          <div className="relative w-full sm:w-64 sm:ml-6">
            <Search
              size={16}
              color="grey"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari instansi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border placeholder:text-gray-500 border-gray-300 bg-white focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
            />
          </div>
        </div>

        {/* Divider mobile */}
        <hr className="sm:hidden mb-6 border-gray-300" />

        {/* ================= CARD GRID ================= */}
        {loading && (
          <p className="text-gray-500 text-sm">Memuat data...</p>
        )}

        {!loading && filteredList.length === 0 && (
          <p className="text-gray-500 text-sm">
            Tidak ada instansi yang cocok dengan pencarian.
          </p>
        )}

        {!loading && filteredList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 text-black">
            {filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMasukInstansi(item.id, item.namaDinas)}
                className="relative bg-white rounded-3xl shadow-lg p-4 lg:p-5 hover:shadow-xl transition border-t-[12px] border-[#CB0E0E] cursor-pointer flex flex-col"
              >
                {/* Icon terlambat */}
                {item.programTerlambat && item.programTerlambat > 0 ? (
                  <div
                    title={`${item.programTerlambat} program terlambat`}
                    className="absolute top-3 right-3 bg-yellow-400 rounded-full p-1 shadow"
                  >
                    <AlertTriangle size={13} className="text-white" />
                  </div>
                ) : null}

                {/* Icon BookOpen */}
                <div className="mt-3 mb-4">
                  <div className="bg-[#CB0E0E] w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow">
                    <BookOpen size={20} />
                  </div>
                </div>

                {/* Konten */}
                <div className="flex-1">
                  <h2 className="text-sm lg:text-base font-bold mb-1 leading-snug line-clamp-3">
                    {item.namaDinas}
                  </h2>
                  <p className="text-[10px] lg:text-xs text-gray-500 mt-2">Program Prioritas</p>
                  <p className="text-xs lg:text-sm text-[#CB0E0E] font-semibold">
                    {item.programPrioritas} / {item.totalProgram}
                  </p>
                </div>

                {/* Footer */}
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