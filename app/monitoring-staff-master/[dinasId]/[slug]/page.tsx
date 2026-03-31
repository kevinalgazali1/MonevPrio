"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";
import Link from "next/link";
import SidebarAdmin from "@/components/SidebarAdmin";
import {
  getMetodePengadaan,
  MetodePengadaanOption,
} from "@/services/metodePengadaan";
import MultiSelectMetode, {
  SelectedMetode,
} from "@/components/MultiSelectMetode";
import Swal from "sweetalert2";
import {
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  X,
  Menu,
  Clock,
  AlertTriangle,
  Lock,
  LockOpen,
  Trash2,
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
  isPlanningLocked: boolean;
  status: string;
}

interface CreateProgramResponse {
  msg: string;
  data: {
    id: number;
    namaProgram: string;
    slug: string;
  };
}

export default function AdminProgramPage() {
  const [open, setOpen] = useState(false);
  const [metodeOptions, setMetodeOptions] = useState<MetodePengadaanOption[]>(
    [],
  );
  const [programList, setProgramList] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaProgram, setNamaProgram] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [metode, setMetode] = useState<SelectedMetode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const dinasId = Number(params?.dinasId);
  const slug = params?.slug as string;

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const formatNamaDinas = (slug: string) =>
    slug
      ?.split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const fetchProgram = async () => {
    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas/${slug}/program`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json?.data) setProgramList(json.data);
      console.log(json);
    } catch (err) {
      console.error("Error fetch program:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchProgram();
  }, [slug]);

  useEffect(() => {
    const fetchMetode = async () => {
      const data = await getMetodePengadaan("admin");
      setMetodeOptions(data);
    };
    fetchMetode();
  }, []);

  /* ── MultiSelectMetode handlers ── */

  const handleMetodeChange = (id: number) => {
    setMetode((prev) => [
      ...prev,
      { key: crypto.randomUUID(), pengadaanId: id, title: "", anggaran: "" },
    ]);
  };

  const handleMetodeRemove = (key: string) => {
    setMetode((prev) => prev.filter((m) => m.key !== key));
  };

  const handleMetodeUpdateItem = (
    key: string,
    field: "title" | "anggaran",
    value: string,
  ) => {
    setMetode((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)),
    );
  };

  /* ── Submit ── */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!namaProgram.trim()) {
      toast.error("Nama strong point wajib diisi");
      return;
    }
    if (!tanggalMulai) {
      toast.error("Tanggal mulai wajib diisi");
      return;
    }
    if (metode.length === 0) {
      toast.error("Pilih minimal satu metode pengadaan");
      return;
    }
    const invalidAnggaran = metode.some(
      (m) => !m.anggaran || Number(m.anggaran.replace(/\./g, "")) <= 0,
    );
    if (invalidAnggaran) {
      toast.error("Anggaran setiap metode harus diisi");
      return;
    }

    try {
      setSubmitting(true);
      const token = getCookie("accessToken");

      const payload = {
        namaProgram,
        tanggalMulai,
        dinasId,
        pengadaanList: metode.map((m) => ({
          pengadaanId: m.pengadaanId,
          title: m.title,
          anggaran: Number(m.anggaran.replace(/\./g, "")),
        })),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/program`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error();

      const json: CreateProgramResponse = await res.json();
      toast.success(json.msg);

      setNamaProgram("");
      setTanggalMulai("");
      setMetode([]);
      setOpen(false);
      fetchProgram();
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan program");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (item: ProgramItem) => {
    const isLocked = item.isPlanningLocked;
    const result = await Swal.fire({
      title: isLocked ? "Buka Kunci Planning?" : "Kunci Planning?",
      text: isLocked
        ? `Planning program "${item.namaProgram}" akan dibuka kembali`
        : `Planning program "${item.namaProgram}" akan dikunci, staff tidak bisa mengubah plan`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: isLocked ? "#16a34a" : "#f59e0b",
      cancelButtonColor: "#6b7280",
      confirmButtonText: isLocked ? "Buka Kunci" : "Kunci",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/program/${item.slug}/toggle-lock`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.msg);
      toast.success(json.msg);
      fetchProgram();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status lock");
    }
  };

  const handleDeleteACC = async (item: ProgramItem) => {
    const result = await Swal.fire({
      title: "Hapus Program?",
      text: `Program "${item.namaProgram}" yang sudah diterima akan dihapus permanen`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;

    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/program/${item.slug}/diterima`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.msg);
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: json.msg,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchProgram();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Gagal menghapus program",
      });
    }
  };

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

  const filteredProgram = programList.filter((item) =>
    item.namaProgram.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <section className="min-h-screen bg-[#2d0000] text-black">
      {/* Sidebar */}
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="lg:ml-64 bg-[#ececec] min-h-screen py-6 px-4 sm:py-8 sm:px-8 lg:py-10 lg:px-16 xl:px-32">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Burger — mobile & tablet only */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow text-[#CB0E0E] hover:bg-gray-50 transition shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={22} />
            </button>

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

        {/* ================= SEARCH + DIVIDER ================= */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <hr className="hidden sm:block flex-1 border-gray-300" />
          <div className="relative w-full sm:w-64 sm:ml-6">
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
              className="w-full pl-9 pr-4 py-2 rounded-lg border placeholder:text-gray-500 border-gray-300 bg-white focus:ring-2 focus:ring-red-500 outline-none text-black text-sm"
            />
          </div>
        </div>

        {/* Divider mobile */}
        <hr className="sm:hidden mb-4 border-gray-300" />

        {/* ================= ACTION ROW ================= */}
        <div className="flex items-center justify-between mb-6 sm:mb-10 gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white px-3 py-2 sm:px-4 rounded-lg shadow hover:bg-gray-100 transition cursor-pointer text-sm"
          >
            <ArrowLeft size={15} />
            Kembali
          </button>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-[#CB0E0E] hover:bg-red-800 text-white px-3 py-2 sm:px-4 cursor-pointer rounded-lg shadow transition text-sm"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">Tambah</span>
            <span className="xs:hidden">Tambah</span>
          </button>
        </div>

        {/* ================= PROGRAM CARDS ================= */}
        {loading && <p className="text-gray-500 text-sm">Memuat data...</p>}

        {!loading && filteredProgram.length === 0 && (
          <p className="text-gray-500 col-span-full text-center text-sm">
            Program tidak ditemukan
          </p>
        )}

        {!loading && filteredProgram.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6 text-black items-stretch">
            {filteredProgram.map((item) => {
              const subSlug = slugify(item.namaProgram);
              return (
                <div key={item.id} className="relative group">
                  {/* Action buttons — top right */}
                  <div className="absolute top-3 right-3 z-10 flex gap-1.5 mt-2">
                    {/* Lock / Unlock */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleLock(item);
                      }}
                      title={
                        item.isPlanningLocked
                          ? "Buka Kunci Planning"
                          : "Kunci Planning"
                      }
                      className={`p-1.5 rounded-lg border bg-white shadow-sm transition ${
                        item.isPlanningLocked
                          ? "text-amber-500 border-amber-300 hover:bg-amber-50"
                          : "text-gray-500 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {item.isPlanningLocked ? (
                        <LockOpen size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteACC(item);
                      }}
                      title="Hapus program"
                      className="p-1.5 rounded-lg border bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-sm transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <Link
                    href={`/monitoring-staff-master/${dinasId}/${slug}/${subSlug}`}
                    className="block"
                  >
                    <div className="relative bg-white rounded-3xl shadow-lg p-4 lg:p-5 hover:shadow-xl transition border-t-[12px] border-[#CB0E0E] flex flex-col cursor-pointer hover:scale-[1.02] duration-200 h-full min-h-[220px] sm:min-h-[240px]">
                      {/* Atas: icon + badge */}
                      <div className="flex justify-between items-center mt-4 mb-4">
                        <div className="bg-[#CB0E0E] w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow">
                          <BookOpen size={20} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Badge Lock */}
                          {item.isPlanningLocked && (
                            <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                              <Lock size={10} />
                              Terkunci
                            </div>
                          )}
                          {/* Badge Terlambat */}
                          {item.isTerlambat && (
                            <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                              <AlertTriangle size={11} />
                            </div>
                          )}
                          {/* Badge Status */}
                          {item.isSelesai ? (
                            <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                              <Check size={12} /> Selesai
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                              <Clock size={12} /> Aktif
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Konten */}
                      <div className="flex-1">
                        <h2 className="text-sm lg:text-base font-bold leading-snug mb-2 line-clamp-3">
                          {item.namaProgram}
                        </h2>
                        <p className="text-[10px] lg:text-xs text-gray-500 line-clamp-2">
                          METODE : {item.pengadaanList.join(", ")}
                        </p>
                      </div>

                      {/* Footer */}
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

      {/* ================= MODAL ================= */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm py-6 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#f2f2f2] rounded-3xl shadow-2xl p-6 sm:p-8 text-black border-t-[16px] border-[#CB0E0E] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {/* Header */}
            <div className="relative mt-4 sm:mt-8 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold italic">REGISTRASI BARU</p>
                <p className="text-xs text-gray-600">{formatNamaDinas(slug)}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>

            <hr className="my-4 sm:my-6 border-gray-300" />

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm text-gray-600">
                  Nama Strong Point
                </label>
                <input
                  type="text"
                  value={namaProgram}
                  onChange={(e) => setNamaProgram(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Tanggal Mulai</label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Metode Pengadaan
                </label>
                <MultiSelectMetode
                  options={metodeOptions}
                  selected={metode}
                  onChange={handleMetodeChange}
                  onRemove={handleMetodeRemove}
                  onUpdateItem={handleMetodeUpdateItem}
                />
              </div>

              <div className="flex justify-between pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="bg-gray-300 text-gray-600 hover:bg-gray-400 px-6 sm:px-8 py-2 rounded-lg text-sm"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-6 sm:px-10 py-2 rounded-lg shadow text-white text-sm ${
                    submitting
                      ? "bg-red-400 cursor-not-allowed"
                      : "bg-[#CB0E0E] hover:bg-red-700"
                  }`}
                >
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>

          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.95) translateY(8px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
