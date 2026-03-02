"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import SidebarAdmin from "@/components/SidebarAdmin";

interface DinasItem {
  id: number;
  namaDinas: string;
  totalProgram: number;
  programPrioritas: number;
}

export default function StaffMasterPage() {
  const [instansiList, setInstansiList] = useState<DinasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(
    null,
  );

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

  return (
    <section className="min-h-screen bg-[#2d0000]">
      <SidebarAdmin />
      <div className="ml-64 bg-[#ececec] min-h-screen py-10 px-10 overflow-y-auto">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col items-start mb-8">
          <p className="text-red-700 italic">Sulawesi Selatan</p>
          <h1 className="text-3xl md:text-4xl font-extrabold italic tracking-wide text-black">
            PILIH INSTANSI
          </h1>
        </div>

        <hr className="mb-8 border-gray-300" />

        {/* ================= CARD GRID ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 text-black">
          {loading && <p>Loading...</p>}

          {!loading &&
            instansiList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMasukInstansi(item.id, item.namaDinas)}
                className="relative w-50 bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition border-t-16 border-[#CB0E0E] cursor-pointer"
              >
                <div className="flex justify-between items-center mt-6 mb-6">
                  <div className="bg-[#CB0E0E] w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow">
                    <BookOpen />
                  </div>

                  {item.programPrioritas === 0 && (
                    <div className="bg-red-100 text-[#CB0E0E] px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow">
                      ⚠
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold mb-1">{item.namaDinas}</h2>

                <p className="text-xs text-gray-500">Program Prioritas</p>

                <p className="text-sm text-[#CB0E0E] font-semibold mb-8">
                  {item.programPrioritas} / {item.totalProgram}
                </p>

                <div className="flex justify-between items-center">
                  <button className="text-xs text-[#CB0E0E] tracking-widest uppercase">
                    Masuk Instansi
                  </button>

                  <div className="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
