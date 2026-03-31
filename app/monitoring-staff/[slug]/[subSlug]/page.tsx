"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TimelineTable from "@/components/TimelineTable";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  Layers,
  Loader2,
  Menu,
} from "lucide-react";
import { getCookie } from "cookies-next";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Progres {
  idProgres: number;
  status: string;
  planningTanggalMulai: string | null;
  planningTanggalSelesai: string | null;
  aktualTanggalMulai: string | null;
  aktualTanggalSelesai: string | null;
  keterangan: string | null;
  dokumenBukti: string[];
  updatedAt: string;
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
  title: string;
  anggaran: number;
  createdAt: string;
  tahapanList: Tahapan[];
}

interface ProgramDetail {
  id: number;
  namaProgram: string;
  slug: string;
  anggaran: string;
  isPrioritas: boolean;
  isPlanningLocked: boolean;
  createdAt: string;
  dinas: { namaDinas: string };
  dokumenProgram: string[];
  pengadaanList: Pengadaan[];
}

// ─── Helper ──────────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────────

export default function MonitoringProgramPage() {
  const { slug, subSlug } = useParams() as { slug: string; subSlug: string };

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const filterTabs = [
    { id: "semua", label: "Semua" },
    { id: "aman", label: "Aman" },
    { id: "terlambat", label: "Terlambat" },
  ];

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchProgram = async () => {
    try {
      const token = getCookie("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program/${subSlug}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json?.data) setProgram(json.data);
    } catch (err) {
      console.error("Error fetch program:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subSlug) fetchProgram();
  }, [subSlug]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const pengadaanList = program?.pengadaanList ?? [];
  const allTahapan = pengadaanList.flatMap((p) => p.tahapanList);

  // Total tahapan & tahapan selesai
  const totalTahapan = allTahapan.length;
  const totalTahapanSelesai = allTahapan.filter(
    (t) => !!t.progres.aktualTanggalSelesai,
  ).length;

  const tahapanDenganAktual = allTahapan.filter(
    (t) => !!t.progres.aktualTanggalMulai,
  );
  const totalAman = tahapanDenganAktual.filter(
    (t) => getTahapanBarStatus(t) === "aman",
  ).length;
  const totalKendala = tahapanDenganAktual.filter(
    (t) => getTahapanBarStatus(t) === "terlambat",
  ).length;

  const formatAnggaran = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleDownloadPDF = () => {
    if (!timelineRef.current || !program) return;
    setExportingPdf(true);

    const styleSheets = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          if (!sheet.href) {
            const rules = Array.from(sheet.cssRules)
              .map((r) => r.cssText)
              .join("\n");
            return `<style>${rules}</style>`;
          }
          return `<link rel="stylesheet" href="${sheet.href}" />`;
        } catch {
          return sheet.href
            ? `<link rel="stylesheet" href="${sheet.href}" />`
            : "";
        }
      })
      .join("\n");

    const clone = timelineRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("button, [role='button']").forEach((el) => el.remove());
    clone.querySelectorAll<HTMLElement>(".overflow-x-auto.overflow-y-auto, .overflow-y-auto").forEach((el) => {
      el.style.maxHeight = "none";
      el.style.overflow = "visible";
      el.style.height = "auto";
    });
    clone.querySelectorAll<HTMLElement>(".overflow-x-auto").forEach((el) => {
      el.style.overflow = "visible";
    });

    const printTitle = `Timeline: ${program.namaProgram}`;
    const printSubtitle = `${program.dinas?.namaDinas ?? ""} · Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${printTitle}</title>
  ${styleSheets}
  <style>
    @page { size: A3 landscape; margin: 10mm 10mm 12mm 10mm; }
    * { box-sizing: border-box; }
    body { font-family: sans-serif; font-size: 10px; background: #fff; color: #111; margin: 0; padding: 0; }
    .print-header { margin-bottom: 6px; padding-bottom: 5px; border-bottom: 1.5px solid #cb0e0e; }
    .print-header h1 { font-size: 14px; font-weight: 700; margin: 0 0 2px 0; color: #1a1a1a; }
    .print-header p { font-size: 8px; color: #666; margin: 0; }
    table { width: 100% !important; border-collapse: collapse !important; table-layout: auto !important; }
    th, td { font-size: 7.5px !important; padding: 2px 3px !important; border: 1px solid #d1d5db !important; word-break: break-word; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    button, [role='button'] { display: none !important; }
    tr { page-break-inside: avoid; }
    [class*="overflow"] { overflow: visible !important; max-height: none !important; }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>${printTitle}</h1>
    <p>${printSubtitle}</p>
  </div>
  ${clone.innerHTML}
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); window.close(); }, 900);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      alert("Popup diblokir oleh browser.\nSilakan izinkan popup untuk halaman ini, lalu coba lagi.");
      setExportingPdf(false);
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => setExportingPdf(false), 1500);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#ECECEC] text-black">
      {/* Sidebar — sama dengan gubernur */}
      <Sidebar
        pengadaanList={pengadaanList}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        namaDinas={program?.dinas?.namaDinas}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-auto">

        {/* ── Topbar ── */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-0">
          {/* Burger button — mobile & tablet */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow text-[#CB0E0E] hover:bg-gray-50 transition shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Right: Search + Arsip */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto flex-wrap justify-end">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari item"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white outline-none focus:ring-2 focus:ring-red-500 w-36 sm:w-48"
              />
            </div>

            <Link
              href={`/monitoring-staff/${slug}/${subSlug}/arsip`}
              className="flex items-center gap-1.5 sm:gap-2 bg-[#CB0E0E] text-white hover:bg-red-900 px-3 sm:px-4 py-2 rounded-lg transition-all text-xs sm:text-sm whitespace-nowrap"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Arsip Digital Program</span>
              <span className="sm:hidden">Arsip</span>
            </Link>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">

          {/* Total Tahapan */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow flex gap-3 sm:gap-4 items-center">
            <Layers className="text-gray-500 shrink-0" size={20} />
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Tahapan</p>
              <p className="text-base sm:text-lg font-bold">
                {loading ? "—" : `${totalTahapanSelesai} / ${totalTahapan}`}
              </p>
            </div>
          </div>

          {/* Status Aman */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow flex gap-3 sm:gap-4 items-center">
            <CheckCircle className="text-green-500 shrink-0" size={20} />
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Status Aman</p>
              <p className="text-base sm:text-lg font-bold">{loading ? "—" : totalAman}</p>
            </div>
          </div>

          {/* Kendala */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow flex gap-3 sm:gap-4 items-center">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Kendala</p>
              <p className="text-base sm:text-lg font-bold">{loading ? "—" : totalKendala}</p>
            </div>
          </div>

          {/* Download */}
          <div
            onClick={() => { if (!exportingPdf && !loading) handleDownloadPDF(); }}
            className={`bg-white p-3 sm:p-4 rounded-xl shadow flex gap-3 sm:gap-4 items-center cursor-pointer transition-colors
              ${exportingPdf || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
          >
            <Download className="text-gray-600 shrink-0" size={20} />
            <p className="text-xs sm:text-sm font-semibold uppercase">Download</p>
          </div>
        </div>

        {/* ── Header Program ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mt-6 sm:mt-10">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 sm:items-center">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold max-w-full lg:max-w-[420px] line-clamp-2">
                {loading ? (
                  <span className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                    Memuat...
                  </span>
                ) : (
                  (program?.namaProgram ?? "—")
                )}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                {program?.dinas?.namaDinas ?? "—"} &mdash;{" "}
                {pengadaanList.map((p) => p.jenisPengadaan).join(" & ")}
              </p>
            </div>

            {program?.anggaran && (
              <div className="bg-white text-[#CB0E0E] font-bold rounded-xl px-3 sm:px-4 py-2 border-2 border-red-100 flex items-center justify-center whitespace-nowrap self-start sm:self-auto">
                <h1 className="text-base sm:text-xl lg:text-2xl">
                  {formatAnggaran(Number(program.anggaran))}
                </h1>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-gray-300 rounded-md px-3 sm:px-4 py-2 gap-1 sm:gap-2 w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 sm:px-4 py-1 rounded-md text-xs sm:text-sm transition-all duration-200 ${
                  filterStatus === tab.id
                    ? "bg-white text-[#CB0E0E] border border-red-100"
                    : "bg-gray-300 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Timeline Table ── */}
        <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Memuat data timeline...</span>
            </div>
          ) : (
            <div ref={timelineRef}>
              <TimelineTable
                namaProgram={program?.namaProgram ?? ""}
                pengadaanList={pengadaanList}
                isPlanningLocked={program?.isPlanningLocked}
                filterStatus={filterStatus}
                activeTab={activeTab}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}