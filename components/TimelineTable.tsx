"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef } from "react";
import { X, Save, Upload, Lock } from "lucide-react";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const padded = base64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Satu entri keterangan dari API */
interface KeteranganItem {
  catatan: string;
  tanggal?: string | null;
  penulis?: string | null;
}

interface Progres {
  idProgres: number;
  status: string;
  planningTanggalMulai: string | null;
  planningTanggalSelesai: string | null;
  aktualTanggalMulai: string | null;
  aktualTanggalSelesai: string | null;
  /** API mengembalikan array of objects {catatan, tanggal, penulis} */
  keterangan: KeteranganItem[] | string[] | string | null;
  dokumenBukti: string[];
  lastUpdatePlan?: string | null;
  lastUpdateAktual?: string | null;
}

interface Tahapan {
  idTahapan: number;
  noUrut: number;
  namaTahapan: string;
  standarWaktuHari: number | null;
  isWaktuEditable: boolean;
  bobot: number;
  progres: Progres;
  isLocked?: boolean;
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

// ─── Date helpers ──────────────────────────────────────────────────────────────

function parseLocalDate(dateStr: string): Date {
  const s = dateStr.split("T")[0];
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function msToIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Forecasting logic (variance-based) ───────────────────────────────────────
//
// Algoritma:
//   1. Iterasi tahapan secara berurutan.
//   2. Jika tahapan sudah selesai aktual (ada aktualStart + aktualEnd):
//        variance  = durasiAktual - durasiPlan  (hari, bisa negatif = lebih cepat)
//        accVariance += variance
//        forecastEnd = aktualEnd
//        prevEnd     = aktualEnd
//   3. Jika tahapan in-progress (ada aktualStart, belum ada aktualEnd):
//        forecastStart   = aktualStart
//        forecastDuration = durasiPlan + accVariance  (min 1 hari)
//        forecastEnd     = forecastStart + forecastDuration
//        prevEnd         = forecastEnd
//        accVariance tetap (belum kita tahu variance sebenarnya)
//   4. Jika tahapan belum mulai:
//        forecastStart   = prevEnd + 1 hari  (atau planStart jika belum ada prevEnd)
//        forecastDuration = durasiPlan + accVariance  (min 1 hari)
//        forecastEnd     = forecastStart + forecastDuration
//        prevEnd         = forecastEnd
//
// Return: array forecastEndMs (ms) per tahapan, null jika tidak ada plan.

const DAY_MS = 86_400_000;

interface ForecastResult {
  forecastStartMs: number | null;
  forecastEndMs: number | null;
  varianceDays: number; // variance tahapan ini saja (0 jika belum ada aktual)
  accVarianceDays: number; // akumulasi variance s.d. tahapan ini
}

function computeAllForecasts(tahapanList: Tahapan[]): ForecastResult[] {
  if (tahapanList.length === 0) return [];

  let accVarianceMs = 0; // akumulasi variance dalam ms
  let prevEndMs: number | null = null;

  return tahapanList.map((t) => {
    const {
      planningTanggalMulai: planStart,
      planningTanggalSelesai: planEnd,
      aktualTanggalMulai: aktualStart,
      aktualTanggalSelesai: aktualEnd,
    } = t.progres;

    // Tidak ada plan → tidak bisa forecast
    if (!planStart || !planEnd) {
      return {
        forecastStartMs: null,
        forecastEndMs: null,
        varianceDays: 0,
        accVarianceDays: Math.round(accVarianceMs / DAY_MS),
      };
    }

    const planStartMs = parseLocalDate(planStart).getTime();
    const planEndMs = parseLocalDate(planEnd).getTime();
    const planDurMs = Math.max(planEndMs - planStartMs, 0);

    // ── Kasus 1: Sudah selesai aktual ────────────────────────────────────────
    if (aktualStart && aktualEnd) {
      const aStartMs = parseLocalDate(aktualStart).getTime();
      const aEndMs = parseLocalDate(aktualEnd).getTime();
      const aktualDurMs = Math.max(aEndMs - aStartMs, 0);
      const varianceMs = aktualDurMs - planDurMs;

      accVarianceMs += varianceMs;
      prevEndMs = aEndMs;

      return {
        forecastStartMs: aStartMs,
        forecastEndMs: aEndMs,
        varianceDays: Math.round(varianceMs / DAY_MS),
        accVarianceDays: Math.round(accVarianceMs / DAY_MS),
      };
    }

    // ── Kasus 2: Sedang in-progress (ada aktualStart, belum aktualEnd) ───────
    if (aktualStart) {
      const aStartMs = parseLocalDate(aktualStart).getTime();
      const forecastDurMs = Math.max(planDurMs + accVarianceMs, 0);
      const forecastEndMs = aStartMs + forecastDurMs;
      prevEndMs = forecastEndMs;

      return {
        forecastStartMs: aStartMs,
        forecastEndMs,
        varianceDays: 0,
        accVarianceDays: Math.round(accVarianceMs / DAY_MS),
      };
    }

    // ── Kasus 3: Belum mulai ──────────────────────────────────────────────────
    const forecastStartMs =
      prevEndMs !== null ? prevEndMs + DAY_MS : planStartMs;
    const forecastDurMs = Math.max(planDurMs + accVarianceMs, 0);
    const forecastEndMs = forecastStartMs + forecastDurMs;
    prevEndMs = forecastEndMs;

    return {
      forecastStartMs,
      forecastEndMs,
      varianceDays: 0,
      accVarianceDays: Math.round(accVarianceMs / DAY_MS),
    };
  });
}

function computeProgramForecast(tahapanList: Tahapan[]): {
  forecastEndMs: number | null;
  planEndMs: number | null;
  deltaMs: number;
} {
  if (tahapanList.length === 0)
    return { forecastEndMs: null, planEndMs: null, deltaMs: 0 };

  // Plan end program = planSelesai tahapan terakhir yang punya plan
  let programPlanEndMs: number | null = null;
  for (const t of tahapanList) {
    if (t.progres.planningTanggalSelesai) {
      const ms = parseLocalDate(t.progres.planningTanggalSelesai).getTime();
      if (programPlanEndMs === null || ms > programPlanEndMs)
        programPlanEndMs = ms;
    }
  }
  if (programPlanEndMs === null)
    return { forecastEndMs: null, planEndMs: null, deltaMs: 0 };

  const forecasts = computeAllForecasts(tahapanList);

  // Forecast program = forecastEnd tahapan terakhir yang punya plan
  let programForecastMs: number | null = null;
  for (let i = tahapanList.length - 1; i >= 0; i--) {
    if (
      forecasts[i].forecastEndMs !== null &&
      tahapanList[i].progres.planningTanggalSelesai
    ) {
      programForecastMs = forecasts[i].forecastEndMs;
      break;
    }
  }
  if (programForecastMs === null)
    return {
      forecastEndMs: programPlanEndMs,
      planEndMs: programPlanEndMs,
      deltaMs: 0,
    };

  const deltaMs = Math.max(0, programForecastMs - programPlanEndMs);
  return {
    forecastEndMs: programForecastMs,
    planEndMs: programPlanEndMs,
    deltaMs,
  };
}

// ─── Status helper ─────────────────────────────────────────────────────────────

function getTahapanBarStatus(tahapan: Tahapan): "aman" | "terlambat" | "none" {
  const { aktualTanggalMulai, aktualTanggalSelesai, planningTanggalSelesai } =
    tahapan.progres;
  if (aktualTanggalMulai) {
    if (aktualTanggalSelesai && planningTanggalSelesai) {
      return parseLocalDate(aktualTanggalSelesai) <=
        parseLocalDate(planningTanggalSelesai)
        ? "aman"
        : "terlambat";
    }
    if (planningTanggalSelesai) {
      return new Date() > parseLocalDate(planningTanggalSelesai)
        ? "terlambat"
        : "aman";
    }
    return "aman";
  }
  if (planningTanggalSelesai) {
    return new Date() > parseLocalDate(planningTanggalSelesai)
      ? "terlambat"
      : "aman";
  }
  return "none";
}

// ─── Timeline columns ──────────────────────────────────────────────────────────

function buildTimelineColumns(pengadaanList: Pengadaan[]) {
  const allDates: Date[] = [];

  pengadaanList.forEach((p) => {
    const forecasts = computeAllForecasts(p.tahapanList);
    p.tahapanList.forEach((t, i) => {
      if (t.progres.planningTanggalMulai)
        allDates.push(parseLocalDate(t.progres.planningTanggalMulai));
      if (t.progres.planningTanggalSelesai)
        allDates.push(parseLocalDate(t.progres.planningTanggalSelesai));
      if (t.progres.aktualTanggalMulai)
        allDates.push(parseLocalDate(t.progres.aktualTanggalMulai));
      if (t.progres.aktualTanggalSelesai)
        allDates.push(parseLocalDate(t.progres.aktualTanggalSelesai));
      const fr = forecasts[i];
      if (fr.forecastStartMs !== null)
        allDates.push(new Date(fr.forecastStartMs));
      if (fr.forecastEndMs !== null) allDates.push(new Date(fr.forecastEndMs));
    });
  });

  if (allDates.length === 0) {
    const now = new Date();
    allDates.push(now);
    allDates.push(new Date(now.getFullYear(), now.getMonth() + 3, 28));
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const columns: {
    label: string;
    month: string;
    year: number;
    monthIndex: number;
    week: number;
    startDay: Date;
    endDay: Date;
  }[] = [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    for (const b of [
      { week: 1, s: 1, e: 7 },
      { week: 2, s: 8, e: 14 },
      { week: 3, s: 15, e: 21 },
      { week: 4, s: 22, e: lastDay },
    ]) {
      columns.push({
        label: `M${b.week}`,
        month: monthNames[monthIndex],
        year,
        monthIndex,
        week: b.week,
        startDay: new Date(year, monthIndex, b.s),
        endDay: new Date(year, monthIndex, b.e),
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return columns;
}

type Columns = ReturnType<typeof buildTimelineColumns>;

function getColIndex(columns: Columns, dateStr: string | null): number {
  if (!dateStr) return -1;
  return getColIndexFromMs(columns, parseLocalDate(dateStr).getTime());
}

function getColIndexFromMs(columns: Columns, ms: number): number {
  for (let i = 0; i < columns.length; i++) {
    if (
      ms >= columns[i].startDay.getTime() &&
      ms <= columns[i].endDay.getTime()
    )
      return i;
  }
  if (ms > columns[columns.length - 1].endDay.getTime())
    return columns.length - 1;
  return 0;
}

function groupByMonth(columns: Columns) {
  const groups: { key: string; label: string; count: number }[] = [];
  columns.forEach((col) => {
    const key = `${col.month}-${col.year}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.count++;
    else groups.push({ key, label: col.month, count: 1 });
  });
  return groups;
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const s = dateStr.split("T")[0];
  const [y, m, d] = s.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatToMMDDYYYY(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const s = dateStr.split("T")[0];
  const [y, m, d] = s.split("-").map(Number);
  const mn = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${String(d).padStart(2, "0")} ${mn[m - 1]} ${y}`;
}

function formatDisplayDateMs(ms: number): string {
  return formatDisplayDate(msToIso(ms));
}

// ─── Modal Shell ───────────────────────────────────────────────────────────────

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
        className="relative bg-white rounded-3xl shadow-2xl w-[460px] max-h-[90vh] overflow-y-auto"
        style={{
          borderTop: "6px solid #22c55e",
          animation: "modalIn 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

function ModalHeader({
  subtitle,
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
          <p className="text-sm text-gray-500 mt-0.5 italic">{subtitle}</p>
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

function LastUpdateBadge({
  label,
  date,
}: {
  label: string;
  date: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
      <span className="font-semibold text-gray-500">{label}:</span>
      <span>
        {date ? (
          formatDisplayDate(date)
        ) : (
          <span className="italic">Belum diupdate</span>
        )}
      </span>
    </div>
  );
}

// ─── Plan Modal ────────────────────────────────────────────────────────────────

function PlanModal({
  tahapan,
  prevTahapanSelesai,
  onClose,
}: {
  tahapan: Tahapan;
  prevTahapanSelesai: string | null;
  onClose: () => void;
}) {
  const [mulai, setMulai] = useState(
    formatDateForInput(tahapan.progres.planningTanggalMulai),
  );
  const [selesai, setSelesai] = useState(
    formatDateForInput(tahapan.progres.planningTanggalSelesai),
  );
  const [loading, setLoading] = useState(false);
  const minMulai = prevTahapanSelesai
    ? formatDateForInput(prevTahapanSelesai)
    : undefined;

  async function handleSave() {
    if (!mulai || !selesai) {
      toast.error("Tanggal mulai dan selesai wajib diisi");
      return;
    }
    if (new Date(selesai) < new Date(mulai)) {
      toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai");
      return;
    }
    if (minMulai && new Date(mulai) < new Date(minMulai)) {
      toast.error(
        "Tanggal mulai tidak boleh sebelum selesai tahapan sebelumnya",
      );
      return;
    }
    try {
      setLoading(true);
      const token = getCookie("accessToken");
      if (!token) {
        toast.error("Session habis, silakan login ulang");
        return;
      }
      const body = JSON.stringify({
        planningTanggalMulai: formatToMMDDYYYY(mulai),
        planningTanggalSelesai: formatToMMDDYYYY(selesai),
      });
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
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
      const rs = await resStaff.json().catch(() => ({}));
      const rm = await resMaster.json().catch(() => ({}));
      if (!resStaff.ok && !resMaster.ok)
        throw new Error(rs?.msg || rm?.msg || "Gagal update planning");
      if (resStaff.ok && !resMaster.ok && rm?.msg)
        toast(`Master: ${rm.msg}`, { icon: "⚠️" });
      if (!resStaff.ok && resMaster.ok && rs?.msg)
        toast(`Staff: ${rs.msg}`, { icon: "⚠️" });
      toast.success(
        (resStaff.ok ? rs?.msg : null) ||
          (resMaster.ok ? rm?.msg : null) ||
          "Berhasil mengatur ulang jadwal planning",
      );
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat update planning");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-6 pb-7">
        <ModalHeader subtitle={tahapan.namaTahapan} onClose={onClose} />
        <div className="flex gap-4 mb-4 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
          <LastUpdateBadge
            label="Last Update Plan"
            date={tahapan.progres.lastUpdatePlan}
          />
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-3">
          Target Waktu <span className="italic font-normal">(planning)</span>
        </p>
        {minMulai && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
            ⚠️ Tanggal mulai tidak boleh sebelum{" "}
            <strong>{formatDisplayDate(minMulai)}</strong> (selesai tahapan
            sebelumnya)
          </div>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wider">
              MULAI
            </label>
            <input
              type="date"
              value={mulai}
              min={minMulai}
              onChange={(e) => {
                setMulai(e.target.value);
                if (selesai && new Date(e.target.value) > new Date(selesai))
                  setSelesai("");
              }}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wider">
              SELESAI
            </label>
            <input
              type="date"
              value={selesai}
              min={mulai || minMulai}
              disabled={!mulai}
              onChange={(e) => setSelesai(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
          >
            BATALKAN
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <Save size={15} />
            {loading ? "MENYIMPAN..." : "SIMPAN DATA"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Update (Actual) Modal ─────────────────────────────────────────────────────
// PERUBAHAN:
//   1. Keterangan = input baru saja (tidak tampilkan keterangan lama di modal)
//   2. Tombol Kunci → panggil endpoint /selesai (bukan hanya state lokal)

function UpdateModal({
  tahapan,
  onClose,
  onLock,
}: {
  tahapan: Tahapan;
  onClose: () => void;
  onLock: (id: number) => void;
}) {
  const planningMulai = tahapan.progres.planningTanggalMulai
    ? formatDateForInput(tahapan.progres.planningTanggalMulai)
    : "";
  const planningSelesai = tahapan.progres.planningTanggalSelesai;

  const [mulai, setMulai] = useState(
    formatDateForInput(tahapan.progres.aktualTanggalMulai) || planningMulai,
  );
  const [selesai, setSelesai] = useState(
    formatDateForInput(tahapan.progres.aktualTanggalSelesai),
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState(""); // ← selalu kosong, hanya input baru
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isTerlambat = !!(
    selesai &&
    planningSelesai &&
    new Date(selesai) > new Date(formatDateForInput(planningSelesai))
  );

  async function handleSave() {
    if (!mulai) {
      toast.error("Tanggal mulai aktual wajib diisi");
      return;
    }
    if (!selesai) {
      toast.error("Tanggal selesai wajib diisi");
      return;
    }
    if (planningMulai && new Date(mulai) < new Date(planningMulai)) {
      toast.error(
        "Tanggal mulai aktual tidak boleh sebelum tanggal mulai planning",
      );
      return;
    }
    if (new Date(selesai) < new Date(mulai)) {
      toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai");
      return;
    }
    if (isTerlambat && !keterangan.trim()) {
      toast.error("Keterangan wajib diisi karena melewati planning");
      return;
    }
    try {
      setLoading(true);
      const loadingToast = toast.loading("Menyimpan data aktual...");
      const token = getCookie("accessToken");
      if (!token) {
        toast.dismiss(loadingToast);
        toast.error("Session habis, silakan login ulang");
        return;
      }
      const buildFD = () => {
        const fd = new FormData();
        fd.append("aktualTanggalMulai", formatToMMDDYYYY(mulai));
        fd.append("aktualTanggalSelesai", formatToMMDDYYYY(selesai));
        if (keterangan.trim()) fd.append("keterangan", keterangan.trim());
        if (selectedFile) fd.append("dokumen", selectedFile);
        return fd;
      };
      const ah = { Authorization: `Bearer ${token}` };
      const [resStaff, resMaster] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/progres/${tahapan.progres.idProgres}/aktual`,
          { method: "PATCH", headers: ah, body: buildFD() },
        ),
        fetch(
          `https://sulsel.cloud/api/master/progres/${tahapan.progres.idProgres}/aktual`,
          { method: "PATCH", headers: ah, body: buildFD() },
        ),
      ]);
      const rs = await resStaff.json().catch(() => ({}));
      const rm = await resMaster.json().catch(() => ({}));
      toast.dismiss(loadingToast);
      if (!resStaff.ok && !resMaster.ok)
        throw new Error(rs?.msg || rm?.msg || "Gagal menyimpan aktual");
      if (resStaff.ok && !resMaster.ok && rm?.msg)
        toast(`Master: ${rm.msg}`, { icon: "⚠️" });
      if (!resStaff.ok && resMaster.ok && rs?.msg)
        toast(`Staff: ${rs.msg}`, { icon: "⚠️" });
      toast.success(
        (resStaff.ok ? rs?.msg : null) ||
          (resMaster.ok ? rm?.msg : null) ||
          "Berhasil menyimpan data aktual",
      );
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  // ── Lock: panggil endpoint /selesai di kedua server ───────────────────────
  async function handleLockConfirm() {
    try {
      setLockLoading(true);
      const token = getCookie("accessToken");
      if (!token) {
        toast.error("Session habis, silakan login ulang");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [resStaff, resMaster] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/progres/${tahapan.progres.idProgres}/selesai`,
          { method: "PATCH", headers },
        ),
        fetch(
          `https://sulsel.cloud/api/master/progres/${tahapan.progres.idProgres}/selesai`,
          { method: "PATCH", headers },
        ),
      ]);
      const rs = await resStaff.json().catch(() => ({}));
      const rm = await resMaster.json().catch(() => ({}));
      if (!resStaff.ok && !resMaster.ok)
        throw new Error(rs?.msg || rm?.msg || "Gagal mengunci tahapan");
      if (resStaff.ok && !resMaster.ok && rm?.msg)
        toast(`Master: ${rm.msg}`, { icon: "⚠️" });
      if (!resStaff.ok && resMaster.ok && rs?.msg)
        toast(`Staff: ${rs.msg}`, { icon: "⚠️" });
      toast.success("Tahapan berhasil dikunci");
      onLock(tahapan.idTahapan);
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunci tahapan");
    } finally {
      setLockLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-7 pt-6 pb-7">
        <ModalHeader subtitle={tahapan.namaTahapan} onClose={onClose} />
        <div className="flex gap-4 mb-4 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
          <LastUpdateBadge
            label="Last Update Aktual"
            date={tahapan.progres.lastUpdateAktual}
          />
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-3">
          Realisasi Lapangan{" "}
          <span className="italic font-normal">(actual)</span>
        </p>

        {/* Tanggal berdampingan */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wider">
              MULAI AKTUAL
            </label>
            <input
              type="date"
              value={mulai}
              min={planningMulai || undefined}
              onChange={(e) => {
                setMulai(e.target.value);
                if (selesai && new Date(e.target.value) > new Date(selesai))
                  setSelesai("");
              }}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {planningMulai && (
              <p className="text-[10px] text-gray-400 mt-1">
                Min: <strong>{formatDisplayDate(planningMulai)}</strong>
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wider">
              SELESAI AKTUAL
            </label>
            <input
              type="date"
              value={selesai}
              min={mulai || planningMulai || undefined}
              disabled={!mulai}
              onChange={(e) => setSelesai(e.target.value)}
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 disabled:bg-gray-200 disabled:cursor-not-allowed ${isTerlambat ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-green-400"}`}
            />
            {isTerlambat ? (
              <p className="text-[10px] text-red-500 mt-1">
                ⚠️ Melewati plan:{" "}
                <strong>{formatDisplayDate(planningSelesai)}</strong>
              </p>
            ) : planningSelesai ? (
              <p className="text-[10px] text-gray-400 mt-1">
                Plan selesai:{" "}
                <strong>{formatDisplayDate(planningSelesai)}</strong>
              </p>
            ) : null}
          </div>
        </div>

        {/* Upload */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Upload size={15} className="text-gray-500" />
            Unggah Dokumen Pendukung (PDF)
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-xs font-semibold border-2 border-red-400 text-red-500 rounded-full hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              Choose File
            </button>
            <span className="text-sm text-gray-500 truncate">
              {fileName ?? "Belum ada file dipilih"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedFile(f);
                  setFileName(f.name);
                }
              }}
            />
          </div>
        </div>

        {/* Keterangan — hanya input baru, tidak tampilkan riwayat di sini */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Keterangan Baru
            {isTerlambat ? (
              <span className="ml-1 text-red-500 font-normal text-xs">
                (Wajib karena melewati planning)
              </span>
            ) : (
              <span className="ml-1 text-gray-400 font-normal text-xs">
                (Opsional)
              </span>
            )}
          </label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder={
              isTerlambat
                ? "Jelaskan alasan keterlambatan..."
                : "Catatan tambahan (opsional)..."
            }
            rows={3}
            className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 placeholder:text-gray-400 ${isTerlambat ? "border-red-200 bg-red-50 focus:ring-red-400" : "border-gray-200 bg-gray-50 focus:ring-green-400"}`}
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Keterangan akan ditambahkan ke riwayat. Riwayat lengkap dapat
            dilihat pada tabel.
          </p>
        </div>

        {/* Kunci */}
        {confirmLock ? (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-700 mb-3">
              ⚠️ Yakin ingin menandai tahapan ini sebagai{" "}
              <strong>Selesai</strong>? Tombol PLAN &amp; ACTUAL tidak dapat
              diakses lagi.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLock(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleLockConfirm}
                disabled={lockLoading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 flex items-center justify-center gap-1"
              >
                <Lock size={12} />
                {lockLoading ? "Mengunci..." : "Ya, Selesai & Kunci"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLock(true)}
            className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-orange-600 border border-orange-300 bg-orange-50 hover:bg-orange-100 flex items-center justify-center gap-1.5"
          >
            <Lock size={12} /> Tandai Selesai &amp; Kunci Tahapan
          </button>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
          >
            BATALKAN
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <Save size={15} />
            {loading ? "MENYIMPAN..." : "SIMPAN DATA"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type ModalType = "plan" | "update";

async function handleOpenPDF(dokumenBukti: any[]) {
  if (!dokumenBukti || dokumenBukti.length === 0) {
    toast.error("Dokumen belum tersedia");
    return;
  }
  const token = getCookie("accessToken");
  if (!token) {
    toast.error("Session habis, silakan login ulang");
    return;
  }
  window.open(`https://sulsel.cloud${dokumenBukti[0].fileUrl}`, "_blank");
}

export default function TimelineTable({
  namaProgram = "Program",
  pengadaanList = [],
  filterStatus = "semua",
  activeTab = "semua",
}: TimelineTableProps) {
  const [modal, setModal] = useState<{
    type: ModalType;
    tahapan: Tahapan;
    prevTahapanSelesai?: string | null;
  } | null>(null);
  const [lockedTahapan, setLockedTahapan] = useState<Set<number>>(new Set());
  function handleLock(id: number) {
    setLockedTahapan((prev) => new Set(prev).add(id));
  }

  const isGubernur = (() => {
    const token = getCookie("accessToken");
    if (!token || typeof token !== "string") return false;
    const payload = decodeJwtPayload(token);
    const role: string =
      payload?.role ?? payload?.roles ?? payload?.user?.role ?? "";
    return role.toLowerCase() === "gubernur";
  })();
  const canEditTimeline = !isGubernur;

  // Filter by sidebar activeTab
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

  const filteredPengadaanList =
    filterStatus === "semua"
      ? tabFilteredList
      : tabFilteredList
          .map((p) => ({
            ...p,
            tahapanList: p.tahapanList.filter(
              (t) => getTahapanBarStatus(t) === filterStatus,
            ),
          }))
          .filter((p) => p.tahapanList.length > 0);

  const columns = buildTimelineColumns(
    pengadaanList.length > 0 ? pengadaanList : filteredPengadaanList,
  );
  const monthGroups = groupByMonth(columns);
  const totalMonths = monthGroups.length;
  const colMinWidth = totalMonths >= 10 ? 28 : totalMonths >= 6 ? 32 : 36;

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  function onHeaderScroll() {
    if (bodyScrollRef.current && headerScrollRef.current)
      bodyScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
  }
  function onBodyScroll() {
    if (headerScrollRef.current && bodyScrollRef.current)
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
  }

  return (
    <>
      {/* Legend */}
      <div className="flex items-center gap-4 px-2 pt-2 pb-1 text-[11px] text-gray-500 flex-wrap">
        {[
          { color: "#d1d5db", label: "Planning" },
          { color: "#22c55e", label: "Aktual (Aman)" },
          { color: "#dc2626", label: "Aktual (Terlambat)" },
          { color: "#f59e0b", label: "Forecasting" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-6 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Lock
            size={12}
            className="text-orange-500"
            aria-label="Tahapan Terkunci"
          />
          <span>Tahapan Terkunci</span>
        </div>
      </div>

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
            {/* Sticky Header */}
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

            {/* Scrollable Body */}
            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: "60vh" }}
            >
              <table className="min-w-full text-sm border-collapse">
                <thead className="invisible" aria-hidden="true">
                  <tr>
                    <th
                      className="w-52 min-w-[200px] border border-gray-200 px-4 py-3"
                      rowSpan={2}
                    />
                    {monthGroups.map((g) => (
                      <th
                        key={g.key}
                        colSpan={g.count}
                        className="border border-gray-200 py-2"
                      />
                    ))}
                    <th
                      className="w-64 min-w-[250px] border border-gray-200 px-4 py-3"
                      rowSpan={2}
                    />
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
                  {filteredPengadaanList.map((pengadaan) => {
                    const forecastMsList = computeAllForecasts(
                      pengadaan.tahapanList,
                    );
                    const {
                      forecastEndMs: programForecastMs,
                      planEndMs: programPlanEndMs,
                      deltaMs,
                    } = computeProgramForecast(pengadaan.tahapanList);

                    const lastPlanEndCol =
                      programPlanEndMs !== null
                        ? getColIndexFromMs(columns, programPlanEndMs)
                        : -1;
                    const overallForecastCol =
                      programForecastMs !== null
                        ? getColIndexFromMs(columns, programForecastMs)
                        : -1;
                    const showProgramForecast =
                      deltaMs > 0 &&
                      programForecastMs !== null &&
                      overallForecastCol >= 0;

                    // Ambil accVarianceDays dari tahapan terakhir yang punya plan
                    // (bukan total deltaMs program, tapi variance akumulasi tahapan terakhir)
                    const lastForecastWithPlan = (() => {
                      for (let i = forecastMsList.length - 1; i >= 0; i--) {
                        if (
                          forecastMsList[i].forecastEndMs !== null &&
                          pengadaan.tahapanList[i].progres.planningTanggalSelesai
                        )
                          return forecastMsList[i];
                      }
                      return null;
                    })();
                    const forecastDelayDays =
                      lastForecastWithPlan?.accVarianceDays ?? 0;

                    return [
                      // Pengadaan header row
                      <tr key={`header-${pengadaan.id}`}>
                        <td
                          colSpan={columns.length + 2}
                          className="border border-gray-200 px-4 py-2 bg-red-50 text-xs font-bold text-[#CB0E0E] uppercase tracking-wide"
                        >
                          {pengadaan.namaTransaksi}
                        </td>
                      </tr>,

                      // Tahapan rows
                      ...pengadaan.tahapanList.map((tahapan, tahapanIdx) => {
                        // Locked: status API "selesai" ATAU field isLocked dari server ATAU dikunci lokal sesi ini
                        const isLocked =
                          tahapan.progres.status === "selesai" ||
                          !!tahapan.isLocked ||
                          lockedTahapan.has(tahapan.idTahapan);
                        const planStart = getColIndex(
                          columns,
                          tahapan.progres.planningTanggalMulai,
                        );
                        const planEnd = getColIndex(
                          columns,
                          tahapan.progres.planningTanggalSelesai,
                        );
                        const actualStart = getColIndex(
                          columns,
                          tahapan.progres.aktualTanggalMulai,
                        );
                        const actualEnd = getColIndex(
                          columns,
                          tahapan.progres.aktualTanggalSelesai,
                        );

                        let actualBarColor = "#dc2626";
                        if (
                          tahapan.progres.aktualTanggalSelesai &&
                          tahapan.progres.planningTanggalSelesai
                        ) {
                          actualBarColor =
                            parseLocalDate(
                              tahapan.progres.aktualTanggalSelesai,
                            ) <=
                            parseLocalDate(
                              tahapan.progres.planningTanggalSelesai,
                            )
                              ? "#22c55e"
                              : "#dc2626";
                        }

                        const planSpan =
                          planStart >= 0 && planEnd >= planStart
                            ? planEnd - planStart + 1
                            : 0;
                        const actualSpan =
                          actualStart >= 0 && actualEnd >= actualStart
                            ? actualEnd - actualStart + 1
                            : 0;

                        const fr = forecastMsList[tahapanIdx];
                        const forecastEndMs = fr.forecastEndMs;
                        const forecastStartMs = fr.forecastStartMs;
                        const planEndMs = tahapan.progres.planningTanggalSelesai
                          ? parseLocalDate(
                              tahapan.progres.planningTanggalSelesai,
                            ).getTime()
                          : -1;

                        // ── PERUBAHAN 1: showForecastBar tambah !isLocked ──────
                        // Bar forecast hanya tampil jika ada data forecast
                        // DAN tahapan belum selesai/terkunci
                        const showForecastBar =
                          forecastEndMs !== null &&
                          planStart >= 0 &&
                          planEnd >= planStart &&
                          !isLocked; // ← bar forecast hilang jika tahapan selesai

                        const isDelayed =
                          forecastEndMs !== null &&
                          planEndMs > -1 &&
                          forecastEndMs > planEndMs;

                        const cells = Array(columns.length)
                          .fill(null)
                          .map(() => ({
                            plan: false,
                            actual: false,
                            forecast: false,
                          }));
                        if (planSpan > 0)
                          for (
                            let i = planStart;
                            i <= planEnd && i < columns.length;
                            i++
                          )
                            cells[i].plan = true;
                        if (actualSpan > 0)
                          for (
                            let i = actualStart;
                            i <= actualEnd && i < columns.length;
                            i++
                          )
                            cells[i].actual = true;

                        // ── PERUBAHAN 2: forecast bar mulai di tanggal forecast,
                        // panjangnya = jumlah kolom plan (bukan rentang forecast asli)
                        const forecastBarStart =
                          forecastStartMs !== null
                            ? getColIndexFromMs(columns, forecastStartMs)
                            : -1;
                        const planSpanCount =
                          planStart >= 0 && planEnd >= planStart
                            ? planEnd - planStart + 1
                            : 0;
                        if (showForecastBar && forecastBarStart >= 0 && planSpanCount > 0)
                          for (
                            let i = forecastBarStart;
                            i < forecastBarStart + planSpanCount && i < columns.length;
                            i++
                          )
                            cells[i].forecast = true;

                        const prevTahapanSelesai =
                          tahapanIdx > 0
                            ? (pengadaan.tahapanList[tahapanIdx - 1]?.progres
                                .planningTanggalSelesai ?? null)
                            : null;

                        // ── Normalise keterangan → KeteranganItem[] ───────────
                        function normalizeKeterangan(
                          raw: any,
                        ): KeteranganItem[] {
                          if (!raw) return [];
                          if (typeof raw === "string")
                            return raw.trim() ? [{ catatan: raw }] : [];
                          if (Array.isArray(raw)) {
                            return raw
                              .filter(Boolean)
                              .map((item) =>
                                typeof item === "string"
                                  ? { catatan: item }
                                  : {
                                      catatan:
                                        item.catatan ??
                                        item.keterangan ??
                                        String(item),
                                      tanggal: item.tanggal,
                                      penulis: item.penulis,
                                    },
                              );
                          }
                          return [];
                        }
                        const keteranganList = normalizeKeterangan(
                          tahapan.progres.keterangan,
                        );

                        const planTitle =
                          tahapan.progres.planningTanggalMulai &&
                          tahapan.progres.planningTanggalSelesai
                            ? `Planning: ${formatDisplayDate(tahapan.progres.planningTanggalMulai)} → ${formatDisplayDate(tahapan.progres.planningTanggalSelesai)}`
                            : "";
                        const actualTitle =
                          tahapan.progres.aktualTanggalMulai &&
                          tahapan.progres.aktualTanggalSelesai
                            ? `Aktual: ${formatDisplayDate(tahapan.progres.aktualTanggalMulai)} → ${formatDisplayDate(tahapan.progres.aktualTanggalSelesai)}`
                            : tahapan.progres.aktualTanggalMulai
                              ? `Aktual mulai: ${formatDisplayDate(tahapan.progres.aktualTanggalMulai)} (sedang berjalan)`
                              : "";
                        const forecastTitle =
                          forecastEndMs !== null
                            ? `Forecast: ${forecastStartMs ? formatDisplayDateMs(forecastStartMs) + " → " : ""}${formatDisplayDateMs(forecastEndMs)}${fr.accVarianceDays !== 0 ? " (variance: " + (fr.accVarianceDays > 0 ? "+" : "") + fr.accVarianceDays + " hari)" : ""}`
                            : "";

                        return (
                          <tr
                            key={tahapan.idTahapan}
                            className={`border-b border-gray-100 transition-colors ${isLocked ? "bg-orange-50/40" : "hover:bg-gray-50/50"}`}
                          >
                            {/* Left label cell */}
                            <td className="border border-gray-200 px-3 py-3 bg-white align-top">
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                                  {tahapan.noUrut}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <div className="text-xs font-bold text-[#CB0E0E]">
                                      {tahapan.namaTahapan}
                                    </div>
                                    {isLocked && (
                                      <Lock
                                        size={10}
                                        className="text-orange-500 shrink-0"
                                        aria-label="Tahapan terkunci"
                                      />
                                    )}
                                  </div>

                                  <div className="mt-1 space-y-0.5">
                                    {tahapan.progres.lastUpdatePlan && (
                                      <div className="text-[9px] text-gray-400 flex items-center gap-1">
                                        <span className="font-semibold">
                                          Plan:
                                        </span>
                                        <span>
                                          {formatDisplayDate(
                                            tahapan.progres.lastUpdatePlan,
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {tahapan.progres.lastUpdateAktual && (
                                      <div className="text-[9px] text-gray-400 flex items-center gap-1">
                                        <span className="font-semibold">
                                          Aktual:
                                        </span>
                                        <span>
                                          {formatDisplayDate(
                                            tahapan.progres.lastUpdateAktual,
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {forecastEndMs !== null && !isLocked && (
                                      <div
                                        className={`text-[9px] flex items-center gap-1 font-semibold ${isDelayed ? "text-amber-500" : "text-gray-400"}`}
                                      >
                                        <span>Forecast:</span>
                                        <span>
                                          {formatDisplayDateMs(forecastEndMs)}
                                        </span>
                                        {fr.accVarianceDays !== 0 && (
                                          <span
                                            className={`font-normal ${fr.accVarianceDays > 0 ? "text-red-400" : "text-green-500"}`}
                                          >
                                            ({fr.accVarianceDays > 0 ? "+" : ""}
                                            {fr.accVarianceDays}h)
                                          </span>
                                        )}
                                        {isDelayed && (
                                          <span className="font-normal text-amber-400">
                                            (terlambat)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    <button
                                      onClick={() =>
                                        handleOpenPDF(
                                          tahapan.progres.dokumenBukti,
                                        )
                                      }
                                      disabled={
                                        !tahapan.progres.dokumenBukti?.length
                                      }
                                      className={`px-2 py-0.5 text-[10px] border rounded-full shadow-sm ${tahapan.progres.dokumenBukti?.length ? "border-gray-300 text-black hover:bg-gray-50" : "border-gray-200 text-gray-400 cursor-not-allowed"}`}
                                    >
                                      PDF
                                    </button>

                                    {/* Tombol PLAN & ACTUAL hanya muncul jika tidak terkunci */}
                                    {canEditTimeline && !isLocked && (
                                      <>
                                        <button
                                          onClick={() =>
                                            setModal({
                                              type: "plan",
                                              tahapan,
                                              prevTahapanSelesai,
                                            })
                                          }
                                          className="px-2 py-0.5 text-[10px] border bg-gray-300 border-gray-300 rounded-full text-black hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
                                        >
                                          PLAN
                                        </button>
                                        <button
                                          onClick={() =>
                                            setModal({
                                              type: "update",
                                              tahapan,
                                              prevTahapanSelesai,
                                            })
                                          }
                                          className="px-2 py-0.5 text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                                        >
                                          ACTUAL
                                        </button>
                                      </>
                                    )}

                                    {/* Badge terkunci */}
                                    {isLocked && (
                                      <span className="px-2 py-0.5 text-[10px] bg-orange-100 text-orange-600 border border-orange-300 rounded-full flex items-center gap-0.5">
                                        <Lock size={8} />
                                        Selesai
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Timeline cells */}
                            {columns.map((_, i) => {
                              const cell = cells[i];
                              const hasAktual =
                                !!tahapan.progres.aktualTanggalMulai;
                              return (
                                <td
                                  key={i}
                                  className="border border-gray-200 p-0 relative"
                                  style={{ height: hasAktual ? 44 : 32 }}
                                >
                                  <div className="absolute inset-0 flex flex-col justify-around py-1 px-0">
                                    {/* Track 1 — Plan */}
                                    <div className="h-2 w-full relative">
                                      {cell.plan && (
                                        <div
                                          className="absolute left-0 right-0 top-0 h-2 bg-gray-300 rounded-full"
                                          title={planTitle}
                                        />
                                      )}
                                    </div>
                                    {/* Track 2 — Actual */}
                                    {hasAktual && (
                                      <div className="h-2 w-full relative">
                                        {cell.actual && (
                                          <div
                                            className="absolute left-0 right-0 top-0 h-2 rounded-full"
                                            title={actualTitle}
                                            style={{
                                              backgroundColor: actualBarColor,
                                            }}
                                          />
                                        )}
                                      </div>
                                    )}
                                    {/* Track 3 — Forecast */}
                                    <div className="h-2 w-full relative">
                                      {cell.forecast && (
                                        <div
                                          className="absolute left-0 right-0 top-0 h-2 rounded-full opacity-80"
                                          title={forecastTitle}
                                          style={{ backgroundColor: "#f59e0b" }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}

                            {/* ── Keterangan cell — tampilkan semua item array ── */}
                            <td className="border border-gray-200 px-3 py-2 text-xs bg-white align-top min-w-[250px]">
                              {keteranganList.length > 0 ? (
                                <ol className="space-y-1.5 list-none">
                                  {keteranganList.map((item, idx) => (
                                    <li
                                      key={idx}
                                      className="flex gap-1.5 leading-snug"
                                    >
                                      <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-bold mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-gray-700">
                                          {item.catatan}
                                        </p>
                                        {(item.tanggal || item.penulis) && (
                                          <p className="text-[9px] text-gray-400 mt-0.5">
                                            {item.penulis && (
                                              <span className="font-semibold">
                                                {item.penulis}
                                              </span>
                                            )}
                                            {item.penulis &&
                                              item.tanggal &&
                                              " · "}
                                            {item.tanggal && (
                                              <span>
                                                {formatDisplayDate(
                                                  item.tanggal,
                                                )}
                                              </span>
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <span className="text-gray-400 italic">
                                  Belum ada keterangan
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }),

                      // Program forecast summary row
                      ...(showProgramForecast
                        ? [
                            <tr
                              key={`forecast-row-${pengadaan.id}`}
                              className="bg-amber-50/60"
                            >
                              <td className="border border-gray-200 px-3 py-1.5">
                                <div className="text-[10px] text-amber-700 font-semibold">
                                  📅 Estimasi Selesai Program
                                </div>
                                <div className="text-[10px] text-amber-600 mt-0.5">
                                  {formatDisplayDateMs(programForecastMs!)}
                                  <span
                                    className={`ml-1 font-bold ${forecastDelayDays > 0 ? "text-red-500" : forecastDelayDays < 0 ? "text-green-500" : "text-gray-400"}`}
                                  >
                                    {forecastDelayDays > 0 ? "+" : ""}{forecastDelayDays} hari
                                  </span>
                                </div>
                              </td>
                              {columns.map((_, i) => (
                                <td
                                  key={i}
                                  className="border border-gray-200 p-0 relative"
                                  style={{ height: 24 }}
                                >
                                  {i > lastPlanEndCol &&
                                    i <= overallForecastCol && (
                                      <div
                                        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 opacity-50"
                                        style={{ backgroundColor: "#f59e0b" }}
                                      />
                                    )}
                                  {i === overallForecastCol && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div
                                        className="w-3 h-3 rounded-full border-2 border-white shadow-md"
                                        style={{ backgroundColor: "#f59e0b" }}
                                      />
                                    </div>
                                  )}
                                </td>
                              ))}
                              <td className="border border-gray-200 px-3 py-1.5 text-[10px] text-amber-600">
                                Est. {columns[overallForecastCol]?.month}{" "}
                                {columns[overallForecastCol]?.year}
                              </td>
                            </tr>,
                          ]
                        : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal?.type === "plan" && (
        <PlanModal
          tahapan={modal.tahapan}
          prevTahapanSelesai={modal.prevTahapanSelesai ?? null}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "update" && (
        <UpdateModal
          tahapan={modal.tahapan}
          onClose={() => setModal(null)}
          onLock={handleLock}
        />
      )}
    </>
  );
}