"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef } from "react";
import { X, Save, Upload } from "lucide-react";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";

/** Decode JWT payload tanpa library eksternal */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

interface Progres {
  idProgres: number;
  status: string;
  planningTanggalMulai: string | null;
  planningTanggalSelesai: string | null;
  aktualTanggalMulai: string | null;
  aktualTanggalSelesai: string | null;
  keterangan: string | null;
  dokumenBukti: string[];
}

interface Tahapan {
  idTahapan: number;
  noUrut: number;
  namaTahapan: string;
  standarWaktuHari: number | null;
  isWaktuEditable: boolean;
  bobot: number;
  progres: Progres;
}

interface Pengadaan {
  id: number;
  namaTransaksi: string;
  jenisPengadaan: string;
  tahapanList: Tahapan[];
}

interface TimelineTableProps {
  namaProgram?: string;
  pengadaanList?: Pengadaan[];
  filterStatus?: string;
  activeTab?: string;
}

function getTahapanBarStatus(tahapan: Tahapan): "aman" | "terlambat" | "none" {
  const { aktualTanggalMulai, aktualTanggalSelesai, planningTanggalSelesai } =
    tahapan.progres;

  if (aktualTanggalMulai) {
    if (aktualTanggalSelesai && planningTanggalSelesai) {
      return new Date(aktualTanggalSelesai) <= new Date(planningTanggalSelesai)
        ? "aman"
        : "terlambat";
    }
    if (planningTanggalSelesai) {
      return new Date() > new Date(planningTanggalSelesai)
        ? "terlambat"
        : "aman";
    }
    return "aman";
  }

  if (planningTanggalSelesai) {
    return new Date() > new Date(planningTanggalSelesai) ? "terlambat" : "aman";
  }

  return "none";
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function buildTimelineColumns(pengadaanList: Pengadaan[]) {
  const allDates: Date[] = [];

  pengadaanList.forEach((p) =>
    p.tahapanList.forEach((t) => {
      if (t.progres.planningTanggalMulai)
        allDates.push(new Date(t.progres.planningTanggalMulai));
      if (t.progres.planningTanggalSelesai)
        allDates.push(new Date(t.progres.planningTanggalSelesai));
      if (t.progres.aktualTanggalMulai)
        allDates.push(new Date(t.progres.aktualTanggalMulai));
      if (t.progres.aktualTanggalSelesai)
        allDates.push(new Date(t.progres.aktualTanggalSelesai));
    }),
  );

  if (allDates.length === 0) {
    const now = new Date();
    allDates.push(now);
    allDates.push(new Date(now.getFullYear(), now.getMonth() + 3, 28));
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

  const columns: {
    label: string;
    month: string;
    year: number;
    monthIndex: number;
    week: number;
    startDay: Date;
  }[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const monthNames = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ];
    const monthName = monthNames[monthIndex];
    const dayOfMonth = cursor.getDate();
    let weekNum: number;
    if (dayOfMonth <= 7) weekNum = 1;
    else if (dayOfMonth <= 14) weekNum = 2;
    else if (dayOfMonth <= 21) weekNum = 3;
    else weekNum = 4;

    columns.push({
      label: `M${weekNum}`,
      month: monthName,
      year,
      monthIndex,
      week: weekNum,
      startDay: new Date(cursor),
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return columns;
}

function getColIndex(
  columns: ReturnType<typeof buildTimelineColumns>,
  dateStr: string | null,
): number {
  if (!dateStr) return -1;
  const date = new Date(dateStr);
  for (let i = 0; i < columns.length; i++) {
    const nextCol = columns[i + 1];
    if (!nextCol || date < nextCol.startDay) return i;
  }
  return columns.length - 1;
}

function groupByMonth(columns: ReturnType<typeof buildTimelineColumns>) {
  const groups: { key: string; label: string; count: number }[] = [];
  columns.forEach((col) => {
    const key = `${col.month}-${col.year}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.count++;
    } else {
      groups.push({ key, label: col.month, count: 1 });
    }
  });
  return groups;
}

// ─── Modal Components ───────────────────────────────────────────────────────────

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function formatToMMDDYYYY(dateStr: string) {
  const date = new Date(dateStr);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function ModalShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-[440px] overflow-hidden"
        style={{
          borderTop: "6px solid #22c55e",
          animation: "modalIn 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ModalHeader({
  subtitle: title,
  onClose,
}: {
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex justify-between items-start mb-1">
        <div>
          <h2 className="font-bold text-gray-900 text-base tracking-wide">
            KONFIGURASI TAHAPAN
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 italic">{title}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <hr className="my-4 border-gray-200" />
    </>
  );
}

function DateSelectors({
  mulai,
  selesai,
  onMulai,
  onSelesai,
}: {
  mulai: string;
  selesai: string;
  onMulai: (v: string) => void;
  onSelesai: (v: string) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-4">
      {[
        { label: "MULAI", value: mulai, onChange: onMulai, isSelesai: false },
        { label: "SELESAI", value: selesai, onChange: onSelesai, isSelesai: true },
      ].map(({ label, value, onChange, isSelesai }) => (
        <div key={label} className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wider">
            {label}
          </label>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={isSelesai ? mulai : undefined}
            disabled={isSelesai && !mulai}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
          />
        </div>
      ))}
    </div>
  );
}

function PlanModal({ tahapan, onClose }: { tahapan: Tahapan; onClose: () => void }) {
  const [mulai, setMulai] = useState(formatDateForInput(tahapan.progres.planningTanggalMulai));
  const [selesai, setSelesai] = useState(formatDateForInput(tahapan.progres.planningTanggalSelesai));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!mulai || !selesai) { toast.error("Tanggal mulai dan selesai wajib diisi"); return; }
    if (new Date(selesai) < new Date(mulai)) { toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }

    try {
      setLoading(true);
      const token = getCookie("accessToken");
      if (!token) { toast.error("Session habis, silakan login ulang"); return; }

      const body = JSON.stringify({
        planningTanggalMulai: formatToMMDDYYYY(mulai),
        planningTanggalSelesai: formatToMMDDYYYY(selesai),
      });
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      const [resStaff, resMaster] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/progres/${tahapan.progres.idProgres}/planning`,
          { method: "PATCH", headers, body },
        ),
        fetch(
          `https://sulsel.cloud/api/master/progres/${tahapan.progres.idProgres}/planning`,
          { method: "PATCH", headers, body },
        ),
      ]);

      const resultStaff = await resStaff.json().catch(() => ({}));
      const resultMaster = await resMaster.json().catch(() => ({}));

      if (!resStaff.ok && !resMaster.ok) {
        throw new Error(resultStaff?.msg || resultMaster?.msg || "Gagal update planning");
      }
      // Tampilkan warning jika salah satu gagal
      if (resStaff.ok && !resMaster.ok && resultMaster?.msg) {
        toast(`Master: ${resultMaster.msg}`, { icon: "⚠️" });
      }
      if (!resStaff.ok && resMaster.ok && resultStaff?.msg) {
        toast(`Staff: ${resultStaff.msg}`, { icon: "⚠️" });
      }
      const successMsg =
        (resStaff.ok ? resultStaff?.msg : null) ||
        (resMaster.ok ? resultMaster?.msg : null) ||
        "Berhasil mengatur ulang jadwal planning";
      toast.success(successMsg);
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat update planning");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-6 pb-7">
        <ModalHeader subtitle={tahapan.namaTahapan} onClose={onClose} />
        <p className="text-sm font-semibold text-gray-800 mb-3">
          Target Waktu <span className="italic font-normal">(planning)</span>
        </p>
        <DateSelectors mulai={mulai} selesai={selesai} onMulai={setMulai} onSelesai={setSelesai} />
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200">BATALKAN</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2">
            <Save size={15} />
            {loading ? "MENYIMPAN..." : "SIMPAN DATA"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function UpdateModal({ tahapan, onClose }: { tahapan: Tahapan; onClose: () => void }) {
  const [selesai, setSelesai] = useState(formatDateForInput(tahapan.progres.aktualTanggalSelesai));
  const [fileName, setFileName] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState(tahapan.progres.keterangan ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const planningSelesai = tahapan.progres.planningTanggalSelesai;
  const isTerlambat = selesai && planningSelesai && new Date(selesai) > new Date(formatDateForInput(planningSelesai));
  const planningMulai = tahapan.progres.planningTanggalMulai ? formatDateForInput(tahapan.progres.planningTanggalMulai) : "";

  async function handleSave() {
    if (!selesai) { toast.error("Tanggal selesai wajib diisi"); return; }
    if (isTerlambat && !keterangan.trim()) { toast.error("Keterangan wajib diisi karena melewati planning"); return; }

    try {
      setLoading(true);
      const loadingToast = toast.loading("Menyimpan data aktual...");
      const token = getCookie("accessToken");
      if (!token) { toast.dismiss(loadingToast); toast.error("Session habis, silakan login ulang"); return; }

      const buildFormData = () => {
        const fd = new FormData();
        fd.append("aktualTanggalMulai", formatToMMDDYYYY(formatDateForInput(tahapan.progres.planningTanggalMulai)));
        fd.append("aktualTanggalSelesai", formatToMMDDYYYY(selesai));
        if (keterangan.trim()) fd.append("keterangan", keterangan);
        if (selectedFile) fd.append("dokumen", selectedFile);
        return fd;
      };

      const authHeader = { Authorization: `Bearer ${token}` };

      const [resStaff, resMaster] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/progres/${tahapan.progres.idProgres}/aktual`,
          { method: "PATCH", headers: authHeader, body: buildFormData() },
        ),
        fetch(
          `https://sulsel.cloud/api/master/progres/${tahapan.progres.idProgres}/aktual`,
          { method: "PATCH", headers: authHeader, body: buildFormData() },
        ),
      ]);

      const resultStaff = await resStaff.json().catch(() => ({}));
      const resultMaster = await resMaster.json().catch(() => ({}));

      toast.dismiss(loadingToast);
      if (!resStaff.ok && !resMaster.ok) {
        throw new Error(resultStaff?.msg || resultMaster?.msg || "Gagal menyimpan aktual");
      }
      // Tampilkan warning jika salah satu gagal
      if (resStaff.ok && !resMaster.ok && resultMaster?.msg) {
        toast(`Master: ${resultMaster.msg}`, { icon: "⚠️" });
      }
      if (!resStaff.ok && resMaster.ok && resultStaff?.msg) {
        toast(`Staff: ${resultStaff.msg}`, { icon: "⚠️" });
      }
      const successMsg =
        (resStaff.ok ? resultStaff?.msg : null) ||
        (resMaster.ok ? resultMaster?.msg : null) ||
        "Berhasil menyimpan data aktual";
      toast.success(successMsg);
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-6 pb-7">
        <ModalHeader subtitle={tahapan.namaTahapan} onClose={onClose} />
        <p className="text-sm font-semibold text-gray-800 mb-3">
          Realisasi Lapangan <span className="italic font-normal">(actual)</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Selesai Aktual</label>
            <input
              type="date"
              value={selesai}
              min={planningMulai}
              disabled={!planningMulai}
              onChange={(e) => setSelesai(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
            />
            {!planningMulai && <p className="text-xs text-red-500 mt-1">Planning mulai belum diatur</p>}
          </div>
        </div>

        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Upload size={15} className="text-gray-500" />
            Unggah Dokumen Pendukung (PDF)
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-xs font-semibold border-2 border-red-400 text-red-500 rounded-full hover:bg-red-50 transition-colors whitespace-nowrap">
              Choose File
            </button>
            <span className="text-sm text-gray-500 truncate">{fileName ?? "Belum ada file dipilih"}</span>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); setFileName(file.name); } }} />
          </div>
        </div>

        {isTerlambat && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keterangan (Wajib karena melewati planning)</label>
            <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Jelaskan alasan keterlambatan..." rows={3} className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-red-50 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-gray-400" />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200">BATALKAN</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2">
            <Save size={15} />
            {loading ? "MENYIMPAN..." : "SIMPAN DATA"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

type ModalType = "plan" | "update";

async function handleOpenPDF(dokumenBukti: any[]) {
  if (!dokumenBukti || dokumenBukti.length === 0) { toast.error("Dokumen belum tersedia"); return; }
  const token = getCookie("accessToken");
  if (!token) { toast.error("Session habis, silakan login ulang"); return; }
  const fileUrl = dokumenBukti[0].fileUrl;
  window.open(`https://sulsel.cloud${fileUrl}`, "_blank");
}

export default function TimelineTable({
  namaProgram = "Program",
  pengadaanList = [],
  filterStatus = "semua",
  activeTab = "semua",
}: TimelineTableProps) {
  const [modal, setModal] = useState<{ type: ModalType; tahapan: Tahapan } | null>(null);

  // ─── Decode JWT → ambil role ─────────────────────────────────────────────────
  // Sembunyikan tombol PLAN & ACTUAL hanya untuk role "gubernur"
  const isGubernur = (() => {
    const token = getCookie("accessToken");
    if (!token || typeof token !== "string") return false;
    const payload = decodeJwtPayload(token);
    const role: string =
      payload?.role ?? payload?.roles ?? payload?.user?.role ?? "";
    return role.toLowerCase() === "gubernur";
  })();

  // Tampilkan tombol untuk semua role KECUALI gubernur
  const canEditTimeline = !isGubernur;

  // ─── Step 1: Filter by sidebar activeTab ────────────────────────────────────
  let tabFilteredList = pengadaanList;

  if (activeTab.startsWith("pengadaan-")) {
    const pengId = parseInt(activeTab.replace("pengadaan-", ""), 10);
    tabFilteredList = pengadaanList.filter((p) => p.id === pengId);
  } else if (activeTab.startsWith("tahapan-")) {
    const parts = activeTab.split("-");
    const pengId = parseInt(parts[1], 10);
    const tahId = parseInt(parts[2], 10);
    tabFilteredList = pengadaanList
      .filter((p) => p.id === pengId)
      .map((p) => ({
        ...p,
        tahapanList: p.tahapanList.filter((t) => t.idTahapan === tahId),
      }))
      .filter((p) => p.tahapanList.length > 0);
  }

  // ─── Step 2: Filter by status (aman / terlambat) ────────────────────────────
  const filteredPengadaanList =
    filterStatus === "semua"
      ? tabFilteredList
      : tabFilteredList
          .map((pengadaan) => ({
            ...pengadaan,
            tahapanList: pengadaan.tahapanList.filter(
              (tahapan) => getTahapanBarStatus(tahapan) === filterStatus,
            ),
          }))
          .filter((pengadaan) => pengadaan.tahapanList.length > 0);

  const columns = buildTimelineColumns(pengadaanList.length > 0 ? pengadaanList : filteredPengadaanList);
  const monthGroups = groupByMonth(columns);

  // ─── Hitung lebar kolom dinamis berdasarkan jumlah bulan ────────────────────
  // Jika data >= 6 bulan (~24 kolom minggu), pakai lebar lebih kecil agar muat
  // Tetap ada min-width agar teks tidak terlalu sempit
  const totalMonths = monthGroups.length;
  const colMinWidth = totalMonths >= 10 ? 28 : totalMonths >= 6 ? 32 : 36;

  // ─── Sync scroll: header dan body scroll horizontal bersamaan ───────────────
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  function onHeaderScroll() {
    if (bodyScrollRef.current && headerScrollRef.current) {
      bodyScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
  }

  function onBodyScroll() {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  }

  return (
    <>
      <div className="font-sans p-2 bg-white">
        {filteredPengadaanList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filterStatus === "semua"
              ? "Belum ada data pengadaan"
              : filterStatus === "aman"
                ? "Tidak ada tahapan dengan status Aman"
                : "Tidak ada tahapan dengan status Terlambat"}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* ── Sticky Header: scroll horizontal sinkron dengan body ── */}
            <div
              ref={headerScrollRef}
              onScroll={onHeaderScroll}
              className="overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-gray-200 px-4 py-3 bg-gray-100 text-center font-semibold text-gray-700 w-52 min-w-[200px]"
                    >
                      Tahapan Proses
                    </th>
                    {monthGroups.map((g) => (
                      <th
                        key={g.key}
                        colSpan={g.count}
                        className="border border-gray-200 py-2 bg-gray-100 text-center font-semibold text-gray-700 text-xs"
                      >
                        {g.label}
                      </th>
                    ))}
                    <th
                      rowSpan={2}
                      className="border border-gray-200 px-4 py-3 bg-gray-100 text-center font-semibold text-gray-700 w-64 min-w-[250px]"
                    >
                      Keterangan
                    </th>
                  </tr>
                  <tr>
                    {columns.map((col, i) => (
                      <th
                        key={i}
                        className="border border-gray-200 py-1 px-1 text-xs font-medium text-gray-500 bg-gray-50 text-center"
                        style={{ width: colMinWidth, minWidth: colMinWidth }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* ── Scrollable Body: scroll horizontal + vertikal ── */}
            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: "60vh" }}
            >
              <table className="min-w-full text-sm border-collapse">
                {/* Ghost thead to keep column widths in sync */}
                <thead className="invisible" aria-hidden="true">
                  <tr>
                    <th className="w-52 min-w-[200px] border border-gray-200 px-4 py-3" rowSpan={2} />
                    {monthGroups.map((g) => (
                      <th key={g.key} colSpan={g.count} className="border border-gray-200 py-2" />
                    ))}
                    <th className="w-64 min-w-[250px] border border-gray-200 px-4 py-3" rowSpan={2} />
                  </tr>
                  <tr>
                    {columns.map((_, i) => (
                      <th
                        key={i}
                        className="border border-gray-200 py-1 px-1"
                        style={{ width: colMinWidth, minWidth: colMinWidth }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPengadaanList.map((pengadaan) => (
                    <>
                      <tr key={`header-${pengadaan.id}`}>
                        <td
                          colSpan={columns.length + 2}
                          className="border border-gray-200 px-4 py-2 bg-red-50 text-xs font-bold text-[#CB0E0E] uppercase tracking-wide"
                        >
                          {pengadaan.namaTransaksi}
                        </td>
                      </tr>

                      {pengadaan.tahapanList.map((tahapan) => {
                        const planStart = getColIndex(columns, tahapan.progres.planningTanggalMulai);
                        const planEnd = getColIndex(columns, tahapan.progres.planningTanggalSelesai);
                        const actualStart = getColIndex(columns, tahapan.progres.aktualTanggalMulai);
                        const actualEnd = getColIndex(columns, tahapan.progres.aktualTanggalSelesai);

                        let actualBarColor = "#CB0E0E";
                        if (tahapan.progres.aktualTanggalSelesai && tahapan.progres.planningTanggalSelesai) {
                          actualBarColor =
                            new Date(tahapan.progres.aktualTanggalSelesai) <= new Date(tahapan.progres.planningTanggalSelesai)
                              ? "#22c55e"
                              : "#CB0E0E";
                        }

                        const planSpan = planStart >= 0 && planEnd >= planStart ? planEnd - planStart + 1 : 0;
                        const actualSpan = actualStart >= 0 && actualEnd >= actualStart ? actualEnd - actualStart + 1 : 0;

                        const cells = Array(columns.length).fill(null).map(() => ({
                          plan: false, actual: false, planStart: false, actualStart: false,
                        }));

                        if (planSpan > 0) {
                          for (let i = planStart; i <= planEnd && i < columns.length; i++) {
                            cells[i].plan = true;
                            if (i === planStart) cells[i].planStart = true;
                          }
                        }
                        if (actualSpan > 0) {
                          for (let i = actualStart; i <= actualEnd && i < columns.length; i++) {
                            cells[i].actual = true;
                            if (i === actualStart) cells[i].actualStart = true;
                          }
                        }

                        return (
                          <tr
                            key={tahapan.idTahapan}
                            className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="border border-gray-200 px-3 py-3 bg-white align-top items-center">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                                  {tahapan.noUrut}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-[#CB0E0E] mt-0.5">
                                    {tahapan.namaTahapan}
                                  </div>
                                  <div className="flex gap-1 mt-2">
                                    {/* Tombol PDF selalu tampil untuk semua role */}
                                    <button
                                      onClick={() => handleOpenPDF(tahapan.progres.dokumenBukti)}
                                      disabled={!tahapan.progres.dokumenBukti?.length}
                                      className={`px-2 py-0.5 text-[10px] border rounded-full shadow-sm ${
                                        tahapan.progres.dokumenBukti?.length
                                          ? "border-gray-300 text-black hover:bg-gray-50"
                                          : "border-gray-200 text-gray-400 cursor-not-allowed"
                                      }`}
                                    >
                                      PDF
                                    </button>
                                    {/* Tombol PLAN & ACTUAL disembunyikan khusus untuk gubernur */}
                                    {canEditTimeline && (
                                      <>
                                        <button
                                          onClick={() => setModal({ type: "plan", tahapan })}
                                          className="px-2 py-0.5 text-[10px] border bg-gray-300 border-gray-300 rounded-full text-black hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                                        >
                                          PLAN
                                        </button>
                                        <button
                                          onClick={() => setModal({ type: "update", tahapan })}
                                          className="px-2 py-0.5 text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                                        >
                                          ACTUAL
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {columns.map((_, i) => {
                              const cell = cells[i];
                              const planTitle = tahapan.progres.planningTanggalMulai && tahapan.progres.planningTanggalSelesai
                                ? `Planning: ${tahapan.progres.planningTanggalMulai.split("T")[0]} - ${tahapan.progres.planningTanggalSelesai.split("T")[0]}`
                                : "";
                              const actualTitle = tahapan.progres.aktualTanggalMulai && tahapan.progres.aktualTanggalSelesai
                                ? `Aktual: ${tahapan.progres.aktualTanggalMulai.split("T")[0]} - ${tahapan.progres.aktualTanggalSelesai.split("T")[0]}`
                                : "";

                              return (
                                <td key={i} className="border border-gray-200 p-0 relative" style={{ height: 32 }}>
                                  <div className="relative w-full h-10">
                                    {cell.plan && (
                                      <div className="absolute left-0 right-0 top-2 h-2 bg-gray-300 rounded-full" title={planTitle} />
                                    )}
                                    {cell.actual && (
                                      <div className="absolute left-0 right-0 bottom-2 h-2 rounded-full" style={{ backgroundColor: actualBarColor }} title={actualTitle} />
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            <td className="border border-gray-200 px-3 py-2 text-xs bg-white align-top min-w-[250px]">
                              {tahapan.progres.keterangan ? (
                                <div className="text-gray-700 leading-snug">{tahapan.progres.keterangan}</div>
                              ) : (
                                <span className="text-gray-400 italic">Belum ada keterangan</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal?.type === "plan" && (
        <PlanModal tahapan={modal.tahapan} onClose={() => setModal(null)} />
      )}
      {modal?.type === "update" && (
        <UpdateModal tahapan={modal.tahapan} onClose={() => setModal(null)} />
      )}
    </>
  );
}