"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TimelineTable from "@/components/TimelineTable";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Search,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  Building2,
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
  createdAt: string;
  dinas: { namaDinas: string };
  dokumenProgram: string[];
  pengadaanList: Pengadaan[];
}

// ─── Helper: classify a tahapan's bar status ────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────────

export default function MonitoringProgramPage() {
  const { slug, subSlug } = useParams() as { slug: string; subSlug: string };

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filterTabs = [
    { id: "semua", label: "Semua" },
    { id: "aman", label: "Aman" },
    { id: "terlambat", label: "Terlambat" },
  ];

  // ─── Fetch ────────────────────────────────────────────────────────────────────
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

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const pengadaanList = program?.pengadaanList ?? [];

  /**
   * Hitung status hanya dari tahapan yang SUDAH ada aktualnya
   * (aktualTanggalMulai terisi) — supaya card mencerminkan realisasi
   */
  const allTahapan = pengadaanList.flatMap((p) => p.tahapanList);
  const tahapanDenganAktual = allTahapan.filter(
    (t) => !!t.progres.aktualTanggalMulai,
  );
  const totalAman = tahapanDenganAktual.filter(
    (t) => getTahapanBarStatus(t) === "aman",
  ).length;
  const totalKendala = tahapanDenganAktual.filter(
    (t) => getTahapanBarStatus(t) === "terlambat",
  ).length;

  // Format budget
  const formatAnggaran = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleDownloadTimeline = () => {
    if (!program) return;

    const data: any[] = [];
    const formatDate = (dateString: string | null) => {
      if (!dateString) return "";
      return new Date(dateString);
    };

    program.pengadaanList.forEach((pengadaan) => {
      pengadaan.tahapanList.forEach((tahapan) => {
        const status = getTahapanBarStatus(tahapan);
        data.push({
          Program: program.namaProgram,
          Dinas: program.dinas?.namaDinas ?? "",
          Pengadaan: pengadaan.namaTransaksi,
          Tahapan: tahapan.namaTahapan,
          "Planning Mulai": formatDate(tahapan.progres.planningTanggalMulai),
          "Planning Selesai": formatDate(
            tahapan.progres.planningTanggalSelesai,
          ),
          "Aktual Mulai": formatDate(tahapan.progres.aktualTanggalMulai),
          "Aktual Selesai": formatDate(tahapan.progres.aktualTanggalSelesai),
          Status: status,
          Keterangan: tahapan.progres.keterangan ?? "",
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const range = XLSX.utils.decode_range(worksheet["!ref"]!);
    for (let R = 1; R <= range.e.r; ++R) {
      ["E", "F", "G", "H"].forEach((col) => {
        const cellAddress = col + (R + 1);
        const cell = worksheet[cellAddress];
        if (cell && cell.v instanceof Date) {
          cell.t = "d";
          cell.z = "dd/mm/yyyy";
        }
      });
    }

    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) =>
          row[key] instanceof Date
            ? 12
            : row[key]
              ? row[key].toString().length
              : 10,
        ),
      ),
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timeline");
    XLSX.writeFile(
      workbook,
      `Timeline-${program.slug}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#ECECEC] text-black">
      <Sidebar
        pengadaanList={pengadaanList}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebarOpen={true}
        setSidebarOpen={() => {}}
      />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-[#245CCE] sm:hidden mb-4"
      >
        <Menu size={26} />
      </button>

      <div className="flex-1 lg:ml-64 p-8 overflow-auto">
        {/* ── Topbar ── */}
        <div className="flex justify-end items-center gap-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="cari item"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border-2 border-gray-300 bg-white outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <Link
            href={`/monitoring-staff/${slug}/${subSlug}/arsip`}
            className="flex items-center gap-2 bg-[#CB0E0E] text-white hover:bg-red-900 px-4 py-2 rounded-lg transition-all"
          >
            <Upload size={16} />
            Arsip Digital Program
          </Link>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-4 gap-6 mt-6">
          <div className="bg-white p-4 rounded-xl shadow flex gap-4 items-center">
            <Building2 className="text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">TOTAL PROYEK</p>
              <p className="text-lg font-bold">
                {loading ? "—" : pengadaanList.length}
              </p>
            </div>
          </div>

          {/* STATUS AMAN — hanya tahapan yang sudah ada aktualnya */}
          <div className="bg-white p-4 rounded-xl shadow flex gap-4 items-center">
            <CheckCircle className="text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">STATUS AMAN</p>
              <p className="text-lg font-bold">{loading ? "—" : totalAman}</p>
            </div>
          </div>

          {/* KENDALA — hanya tahapan yang sudah ada aktualnya */}
          <div className="bg-white p-4 rounded-xl shadow flex gap-4 items-center">
            <AlertTriangle className="text-red-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">KENDALA</p>
              <p className="text-lg font-bold">
                {loading ? "—" : totalKendala}
              </p>
            </div>
          </div>

          <div
            onClick={handleDownloadTimeline}
            className="bg-white p-4 rounded-xl shadow flex gap-4 items-center cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Download className="text-gray-600 shrink-0" />
            <p className="text-sm font-semibold">DOWNLOAD</p>
          </div>
        </div>

        {/* ── Header Program ── */}
        <div className="flex justify-between items-center mt-10">
          <div className="flex flex-row gap-6 items-center">
            <div>
              <h1 className="text-3xl font-bold max-w-105 line-clamp-2">
                {loading ? (
                  <span className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={24} className="animate-spin" />
                    Memuat...
                  </span>
                ) : (
                  (program?.namaProgram ?? "—")
                )}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {program?.dinas?.namaDinas ?? "—"} &mdash;{" "}
                {pengadaanList.map((p) => p.jenisPengadaan).join(" & ")}
              </p>
            </div>

            {program?.anggaran && (
              <div className="bg-white text-[#CB0E0E] font-bold rounded-xl px-4 py-2 border-2 border-red-100 flex items-center justify-center whitespace-nowrap">
                <h1 className="text-2xl">{formatAnggaran(Number(program.anggaran))}</h1>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-gray-300 rounded-md px-4 py-2 gap-2 mt-4 w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-1 rounded-md text-sm transition-all duration-200 ${
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
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Memuat data timeline...</span>
            </div>
          ) : (
            <TimelineTable
              namaProgram={program?.namaProgram ?? ""}
              pengadaanList={pengadaanList}
              filterStatus={filterStatus}
              activeTab={activeTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}
