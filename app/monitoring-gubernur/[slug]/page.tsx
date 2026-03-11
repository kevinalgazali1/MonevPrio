"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import Link from "next/link";
import { Search, ArrowLeft, ArrowRight, Check, BookOpen } from "lucide-react";

interface ProgramItem {
  id: number;
  namaProgram: string;
  slug: string;
  anggaran: string;
  createdAt: string;
  pengadaanList: string[];
}

export default function GubernurProgramPage() {
  const [programList, setProgramList] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const params = useParams();
  const router = useRouter();

  const slug = params?.slug as string;

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  // Format slug jadi Nama Dinas
  const formatNamaDinas = (slug: string) => {
    return slug
      ?.split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const fetchProgram = async () => {
    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/gubernur/dinas/${slug}/program`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const json = await res.json();

      if (json?.data) {
        setProgramList(json.data);
      }
    } catch (err) {
      console.error("Error fetch program:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchProgram();
  }, [slug]);

  const formatRupiahCompact = (value: number) => {
    if (value >= 1_000_000_000_000) {
      return `Rp ${(value / 1_000_000_000_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      })} Triliun`;
    }

    if (value >= 1_000_000_000) {
      return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      })} Miliar`;
    }

    if (value >= 1_000_000) {
      return `Rp ${(value / 1_000_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      })} Juta`;
    }

    if (value >= 1_000) {
      return `Rp ${(value / 1_000).toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      })} Ribu`;
    }

    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const filteredProgram = programList.filter((item) =>
    item.namaProgram.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <section className="min-h-screen">
      <div className="bg-[#ececec] min-h-screen py-10 px-32 text-black">
        {/* ================= TOP RIGHT SEARCH ================= */}
        <div className="flex justify-end gap-4 mb-8">
          <div className="relative w-64">
            <Search
              size={16}
              color="grey"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border placeholder:text-gray-600 border-gray-300 bg-white focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        {/* ================= HEADER ================= */}
        <div className="flex items-start gap-6 mb-6">
          <div className="bg-[#CB0E0E] w-20 h-20 rounded-2xl rotate-6 flex items-center justify-center text-white text-3xl shadow-lg">
            <BookOpen />
          </div>

          <div>
            <p className="text-xs text-[#CB0E0E] uppercase tracking-widest">
              {formatNamaDinas(slug)}
            </p>
            <h1 className="text-4xl font-extrabold italic tracking-wide">
              DASHBOARD
            </h1>
          </div>
        </div>

        <hr className="border-gray-300 mb-6" />

        {/* ================= BACK BUTTON ================= */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition mb-10 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>

        {/* ================= PROGRAM CARD ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 text-black items-stretch">
          {loading && <p>Loading...</p>}

          {!loading && filteredProgram.length === 0 && (
            <p className="text-gray-500 col-span-full text-center">
              Program tidak ditemukan
            </p>
          )}

          {!loading &&
            filteredProgram.length > 0 &&
            filteredProgram.map((item) => {
              const subSlug = slugify(item.namaProgram);

              return (
                <Link
                  key={item.id}
                  href={`/monitoring-gubernur/${slug}/${subSlug}`}
                  className="block"
                >
                  <div
                    className="relative bg-white rounded-3xl shadow-lg p-4 
                    hover:shadow-xl transition border-t-16 border-[#CB0E0E] 
                    flex flex-col cursor-pointer hover:scale-[1.02] duration-200
                    h-90"
                  >
                    <div>
                      <div className="relative flex justify-between items-center mt-10 mb-6">
                        <div className="bg-[#CB0E0E] w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow">
                          <BookOpen />
                        </div>

                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs shadow-md shadow-black/20">
                          <Check size={14} />
                          Aktif
                        </div>
                      </div>

                      <h2 className="text-xl font-bold leading-snug mb-2 line-clamp-3">
                        {item.namaProgram}
                      </h2>

                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                        METODE : {item.pengadaanList.join(", ")}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                      <p className="text-[#CB0E0E] text-xl font-bold">
                        {formatRupiahCompact(Number(item.anggaran))}
                      </p>

                      <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </section>
  );
}
