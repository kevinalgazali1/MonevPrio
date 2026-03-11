"use client";

import { useEffect, useState } from "react";
import {
  Search,
  LogOut,
  ArrowRight,
  BookOpen,
  UserCircle2,
} from "lucide-react";
import { getCookie, deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";

interface DinasItem {
  id: number;
  namaDinas: string;
  totalProgram: number;
  programPrioritas: number;
}

export default function GubernurInstansiPage() {
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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/gubernur/dinas`,
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

  const handleMasukInstansi = (namaDinas: string) => {
    const slug = generateSlug(namaDinas);
    router.push(`/monitoring-gubernur/${slug}`);
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

  return (
    <section className="min-h-screen bg-[#2d0000]">
      <div className="bg-[#ececec] min-h-screen py-10 px-32">
        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-6">
            <div className="bg-[#CB0E0E] w-16 h-16 rounded-2xl rotate-6 flex items-center justify-center text-white text-3xl shadow-lg">
              <BookOpen />
            </div>

            <div>
              <p className="text-xs text-[#CB0E0E] tracking-widest uppercase">
                Sulawesi Selatan
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold italic tracking-wide text-black">
                PILIH INSTANSI
              </h1>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="bg-white px-4 py-2 rounded-xl shadow flex items-center gap-3">
              <UserCircle2 size={24} color="green" />
              <div>
                <p className="text-sm font-semibold text-black">
                  {user?.username ?? "Loading..."}
                </p>
                <p className="text-xs text-black">{user?.role ?? ""}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm bg-[#CB0E0E] text-white px-4 py-2 cursor-pointer rounded-lg shadow hover:bg-red-800 transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <hr className="mb-8 border-gray-300" />

        {/* ================= CARD GRID ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-10 text-black">
          {loading && <p>Loading...</p>}

          {!loading &&
            instansiList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMasukInstansi(item.namaDinas)}
                className="relative w-50 bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition border-t-16 border-[#CB0E0E] cursor-pointer"
              >
                <div className="flex justify-between items-center mt-6 mb-6">
                  <div className="bg-[#CB0E0E] w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow">
                    <BookOpen />
                  </div>
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
