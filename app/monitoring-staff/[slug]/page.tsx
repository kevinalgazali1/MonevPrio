"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  getMetodePengadaan,
  MetodePengadaanOption,
} from "@/services/metodePengadaan";
import MultiSelectMetode, {
  SelectedMetode,
} from "@/components/MultiSelectMetode";
import {
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  X,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";

interface ProgramItem {
  id: number;
  namaProgram: string;
  slug: string;
  anggaran: string;
  tanggalMulai: string;
  createdAt: string;
  pengadaanList: {
    id: number;
    metode: string;
    title: string;
    anggaran: number;
  }[];
  status: "menunggu" | "terima";
  isSelesai: boolean;
  isTerlambat: boolean;
  tahapanSaatIni: string;
  keteranganSaatIni: string | null;
}

interface CreateProgramResponse {
  msg: string;
  data: {
    id: number;
    namaProgram: string;
    slug: string;
  };
}

export default function StaffProgramPage() {
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
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNamaProgram, setEditNamaProgram] = useState("");
  const [editTanggalMulai, setEditTanggalMulai] = useState("");
  const [editMetode, setEditMetode] = useState<SelectedMetode[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const params = useParams();
  const router = useRouter();
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
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/${slug}/program`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json?.data) setProgramList(json.data);
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
      const data = await getMetodePengadaan("staff");
      setMetodeOptions(data);
    };
    fetchMetode();
  }, []);

  /* ── Tambah: metode handlers ── */
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

  /* ── Edit: metode handlers ── */
  const handleEditMetodeChange = (id: number) => {
    setEditMetode((prev) => [
      ...prev,
      { key: crypto.randomUUID(), pengadaanId: id, title: "", anggaran: "" },
    ]);
  };
  const handleEditMetodeRemove = (key: string) => {
    setEditMetode((prev) => prev.filter((m) => m.key !== key));
  };
  const handleEditMetodeUpdateItem = (
    key: string,
    field: "title" | "anggaran",
    value: string,
  ) => {
    setEditMetode((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)),
    );
  };

  /* ── Submit tambah ── */
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
        pengadaanList: metode.map((m) => ({
          pengadaanId: m.pengadaanId,
          title: m.title,
          anggaran: Number(m.anggaran.replace(/\./g, "")),
        })),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program`,
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

  /* ── Buka modal edit — populate dari data yang sudah ada ── */
  const handleOpenEdit = (item: ProgramItem) => {
    setEditId(item.id);
    setEditNamaProgram(item.namaProgram);
    setEditTanggalMulai(
      item.tanggalMulai ? item.tanggalMulai.slice(0, 10) : "",
    );
    setEditMetode([]);
    setOpenEdit(true);
  };

  /* ── Submit edit ── */
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editNamaProgram.trim()) {
      toast.error("Nama program wajib diisi");
      return;
    }
    if (!editTanggalMulai) {
      toast.error("Tanggal mulai wajib diisi");
      return;
    }
    if (editMetode.length === 0) {
      toast.error("Pilih minimal satu metode pengadaan");
      return;
    }
    const invalidAnggaran = editMetode.some(
      (m) =>
        !m.anggaran || Number(m.anggaran.toString().replace(/\./g, "")) <= 0,
    );
    if (invalidAnggaran) {
      toast.error("Anggaran setiap metode harus diisi");
      return;
    }

    try {
      setSubmittingEdit(true);
      const token = getCookie("accessToken");
      const payload = {
        namaProgram: editNamaProgram,
        tanggalMulai: editTanggalMulai,
        pengadaanList: editMetode.map((m) => ({
          pengadaanId: m.pengadaanId,
          title: m.title,
          anggaran: Number(m.anggaran.toString().replace(/\./g, "")),
        })),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program/${editId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success(json.msg ?? "Program berhasil diperbarui");
      setOpenEdit(false);
      setEditId(null);
      setEditMetode([]);
      fetchProgram();
    } catch {
      toast.error("Gagal memperbarui program");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Hapus Program?",
      text: "Data program tidak dapat dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#CB0E0E",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;
    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error();
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Program berhasil dihapus",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchProgram();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat menghapus program",
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

        {/* ================= SEARCH + DIVIDER + TAMBAH ================= */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <hr className="hidden sm:block flex-1 border-gray-300" />
          <div className="flex items-center gap-3 sm:ml-6">
            <div className="relative flex-1 sm:flex-none sm:w-64">
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
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 bg-[#CB0E0E] hover:bg-red-800 text-white px-3 sm:px-4 py-2 cursor-pointer rounded-lg shadow transition text-sm whitespace-nowrap shrink-0"
            >
              <Plus size={15} />
              Tambah
            </button>
          </div>
        </div>

        <hr className="sm:hidden mb-4 border-gray-300" />

        {/* ================= BACK BUTTON ================= */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-white px-3 py-2 sm:px-4 rounded-lg shadow hover:bg-gray-100 transition mb-6 sm:mb-10 cursor-pointer text-sm"
        >
          <ArrowLeft size={15} />
          Kembali
        </button>

        {/* ================= PROGRAM CARDS ================= */}
        {loading && <p className="text-gray-500 text-sm">Memuat data...</p>}

        {!loading && filteredProgram.length === 0 && (
          <p className="text-gray-500 col-span-full text-center text-sm">
            Program tidak ditemukan
          </p>
        )}

        {!loading && filteredProgram.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-6 text-black items-stretch">
            {filteredProgram.map((item) => {
              const isMenunggu = item.status === "menunggu";
              const showTerlambat = item.isTerlambat && !item.isSelesai;

              return (
                <div key={item.id} className="relative group">
                  {isMenunggu && (
                    <div className="absolute top-3 right-3 mt-2 flex gap-1.5 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="p-1.5 rounded-lg border bg-white hover:bg-gray-100 shadow-sm"
                        title="Edit program"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-1.5 rounded-lg border bg-white hover:bg-red-50 text-red-600 shadow-sm"
                        title="Hapus program"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Tooltip nama program */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 hidden group-hover:block pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg w-max max-w-[260px] text-center leading-snug break-words">
                      {item.namaProgram}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>

                  <Link
                    href={
                      isMenunggu
                        ? "#"
                        : `/monitoring-staff/${slug}/${item.slug}`
                    }
                    className={`block h-full ${isMenunggu ? "pointer-events-none cursor-not-allowed" : ""}`}
                  >
                    <div className="relative bg-white rounded-3xl shadow-lg p-4 lg:p-5 hover:shadow-xl transition border-t-[12px] border-[#CB0E0E] flex flex-col cursor-pointer hover:scale-[1.02] duration-200 h-full min-h-[220px] sm:min-h-[240px]">
                      {showTerlambat && !isMenunggu && (
                        <div
                          title="Program terlambat"
                          className="absolute top-3 right-3 bg-yellow-400 rounded-full p-1 shadow"
                        >
                          <AlertTriangle size={13} className="text-white" />
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-4 mb-4">
                        <div className="bg-[#CB0E0E] w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center text-white shadow">
                          <BookOpen size={20} />
                        </div>
                        {item.isSelesai ? (
                          <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                            <Check size={12} /> Selesai
                          </div>
                        ) : item.status === "terima" ? (
                          <div className="flex items-center gap-1.5 bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                            <Clock size={12} /> Aktif
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-[10px] lg:text-xs shadow-sm">
                            <Clock size={12} /> Menunggu
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h2 className="text-sm lg:text-base font-bold leading-snug mb-2 line-clamp-3">
                          {item.namaProgram}
                        </h2>
                        <p className="text-[10px] lg:text-xs text-gray-500 line-clamp-2">
                          METODE :{" "}
                          {item.pengadaanList.map((p) => p.metode).join(", ")}
                        </p>
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

      {/* ================= MODAL TAMBAH ================= */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-[#f2f2f2] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-black border-t-8 sm:border-t-[16px] border-[#CB0E0E] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modalIn 0.2s ease" }}
          >
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
            <hr className="my-5 sm:my-6 border-gray-300" />
            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm text-gray-600">
                  Nama Strong Point
                </label>
                <input
                  type="text"
                  value={namaProgram}
                  onChange={(e) => setNamaProgram(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Tanggal Mulai</label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
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
              <div className="flex justify-between pt-4 sm:pt-6 gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 sm:flex-none bg-gray-300 text-gray-600 hover:bg-gray-400 px-6 sm:px-8 py-2 rounded-lg text-sm"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-2 rounded-lg shadow text-white text-sm ${submitting ? "bg-red-400 cursor-not-allowed" : "bg-[#CB0E0E] hover:bg-red-700"}`}
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

      {/* ================= MODAL EDIT ================= */}
      {openEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setOpenEdit(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-[#f2f2f2] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-black border-t-8 sm:border-t-[16px] border-[#CB0E0E] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            <div className="relative mt-4 sm:mt-8 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold italic">EDIT PROGRAM</p>
                <p className="text-xs text-gray-600">{formatNamaDinas(slug)}</p>
              </div>
              <button
                onClick={() => setOpenEdit(false)}
                className="text-gray-600 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>
            <hr className="my-5 sm:my-6 border-gray-300" />
            <form
              className="space-y-4 sm:space-y-5"
              onSubmit={handleEditSubmit}
            >
              <div>
                <label className="text-sm text-gray-600">
                  Nama Strong Point
                </label>
                <input
                  type="text"
                  value={editNamaProgram}
                  onChange={(e) => setEditNamaProgram(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Tanggal Mulai</label>
                <input
                  type="date"
                  value={editTanggalMulai}
                  onChange={(e) => setEditTanggalMulai(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">
                  Metode Pengadaan
                </label>
                <MultiSelectMetode
                  options={metodeOptions}
                  selected={editMetode}
                  onChange={handleEditMetodeChange}
                  onRemove={handleEditMetodeRemove}
                  onUpdateItem={handleEditMetodeUpdateItem}
                />
              </div>
              <div className="flex justify-between pt-4 sm:pt-6 gap-3">
                <button
                  type="button"
                  onClick={() => setOpenEdit(false)}
                  className="flex-1 sm:flex-none bg-gray-300 text-gray-600 hover:bg-gray-400 px-6 sm:px-8 py-2 rounded-lg text-sm"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 sm:px-8 py-2 rounded-lg shadow text-white text-sm ${submittingEdit ? "bg-red-400 cursor-not-allowed" : "bg-[#CB0E0E] hover:bg-red-700"}`}
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
