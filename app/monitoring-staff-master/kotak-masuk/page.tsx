"use client";

import { useEffect, useState } from "react";
import SidebarAdmin from "@/components/SidebarAdmin";
import { getCookie } from "cookies-next";
import Swal from "sweetalert2";
import { Check, X, Menu, Mail } from "lucide-react";

interface InboxItem {
  id: number;
  namaProgram: string;
  dinasPemohon: string;
  slug: string;
  status: "menunggu" | "terima" | "tolak";
  totalAnggaran: number;
  tanggalPengajuan: string;
  pengadaanList: string[];
}

export default function KotakMasuk() {
  const [data, setData] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const fetchInbox = async () => {
    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/inbox`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const json = await res.json();
      setData(json.data || []);
    } catch (err) {
      console.error("Gagal mengambil inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  /* ================= TERIMA ================= */

  const handleTerima = async (item: InboxItem) => {
    const result = await Swal.fire({
      title: "Terima Program?",
      text: `${item.namaProgram} akan disetujui`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Terima",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/program/${item.slug}/terima`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const json = await res.json();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: json.msg,
        timer: 1500,
        showConfirmButton: false,
      });

      fetchInbox();
    } catch {
      Swal.fire("Error", "Gagal menerima program", "error");
    }
  };

  /* ================= TOLAK ================= */

  const handleTolak = async (item: InboxItem) => {
    const result = await Swal.fire({
      title: "Tolak Program?",
      text: `${item.namaProgram} akan ditolak`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Tolak",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/program/${item.slug}/tolak`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const json = await res.json();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: json.msg,
        timer: 1500,
        showConfirmButton: false,
      });

      fetchInbox();
    } catch {
      Swal.fire("Error", "Gagal menolak program", "error");
    }
  };

  /* ================= RENDER ================= */

  return (
    <section className="min-h-screen bg-[#2d0000]">
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="lg:ml-64 bg-[#ececec] min-h-screen py-6 px-4 sm:py-8 sm:px-8 lg:py-10 lg:px-10 overflow-y-auto text-black">

        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          {/* Burger — mobile & tablet only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow text-[#8A0707] hover:bg-gray-50 transition shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-[#8A0707] w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
              <Mail size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Kotak Masuk</h1>
          </div>
        </div>

        <hr className="mb-5 sm:mb-6 border-gray-300" />

        {/* ================= STATE ================= */}

        {loading && (
          <p className="text-gray-500 text-sm">Memuat data...</p>
        )}

        {!loading && data.length === 0 && (
          <p className="text-gray-500 text-sm">Tidak ada pengajuan program</p>
        )}

        {/* ================= LIST ================= */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg border-l-[6px] sm:border-l-8 border-[#CB0E0E] p-4 sm:p-6"
            >
              {/* Konten + Aksi: stack di mobile, row di sm+ */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">

                {/* LEFT: Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold mb-1 leading-snug line-clamp-2">
                    {item.namaProgram}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Pemohon : {item.dinasPemohon}
                  </p>

                  <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-1">
                    Metode : {item.pengadaanList.join(", ")}
                  </p>

                  <p className="text-sm sm:text-base font-semibold text-[#CB0E0E]">
                    {formatRupiah(item.totalAnggaran)}
                  </p>
                </div>

                {/* RIGHT: Action buttons */}
                <div className="flex gap-2 sm:gap-3 shrink-0 flex-wrap">
                  {item.status === "menunggu" && (
                    <>
                      <button
                        onClick={() => handleTerima(item)}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition"
                      >
                        <Check size={14} />
                        Terima
                      </button>

                      <button
                        onClick={() => handleTolak(item)}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition"
                      >
                        <X size={14} />
                        Tolak
                      </button>
                    </>
                  )}

                  {item.status === "terima" && (
                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium">
                      <Check size={13} />
                      Sudah Disetujui
                    </span>
                  )}

                  {item.status === "tolak" && (
                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium">
                      <X size={13} />
                      Ditolak
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}