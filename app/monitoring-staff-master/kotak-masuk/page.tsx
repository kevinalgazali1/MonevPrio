"use client";

import { useEffect, useState } from "react";
import SidebarAdmin from "@/components/SidebarAdmin";
import { getCookie } from "cookies-next";
import Swal from "sweetalert2";
import { Check, X } from "lucide-react";

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

  // ================= TERIMA =================

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  // ================= TOLAK =================

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  return (
    <section className="min-h-screen bg-[#2d0000]">
      <SidebarAdmin />

      <div className="ml-64 bg-[#ececec] min-h-screen py-10 px-10 overflow-y-auto text-black">
        <h1 className="text-2xl font-bold mb-6">Kotak Masuk</h1>

        {loading && <p>Loading...</p>}

        {!loading && data.length === 0 && (
          <p className="text-gray-500">Tidak ada pengajuan program</p>
        )}

        <div className="flex flex-col gap-6">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-center border-l-8 border-[#CB0E0E]"
            >
              {/* LEFT CONTENT */}
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold mb-1">{item.namaProgram}</h2>

                <p className="text-sm text-gray-600 mb-2">
                  Pemohon : {item.dinasPemohon}
                </p>

                <p className="text-sm text-gray-500 mb-2">
                  Metode : {item.pengadaanList.join(", ")}
                </p>

                <p className="text-sm font-semibold text-[#CB0E0E]">
                  {formatRupiah(item.totalAnggaran)}
                </p>
              </div>

              {/* RIGHT BUTTON */}
              <div className="flex gap-3">
                {item.status === "menunggu" && (
                  <>
                    <button
                      onClick={() => handleTerima(item)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Check size={16} />
                      Terima
                    </button>

                    <button
                      onClick={() => handleTolak(item)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      <X size={16} />
                      Tolak
                    </button>
                  </>
                )}

                {item.status === "terima" && (
                  <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
                    Sudah Disetujui
                  </span>
                )}

                {item.status === "tolak" && (
                  <span className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
                    Ditolak
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
