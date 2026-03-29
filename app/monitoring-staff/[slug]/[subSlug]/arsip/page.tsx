"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { BookOpen, X, FileText, Eye, Download, Upload } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getCookie } from "cookies-next";
import toast from "react-hot-toast";

interface DocumentItem {
  id: number;
  programId: number;
  namaFile: string;
  fileUrl: string;
  createdAt: string;
}

export default function ArsipDigitalProgram() {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDokumen, setLoadingDokumen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const params = useParams();

  const slug = params?.slug as string;
  const subSlug = params?.subSlug as string;

  /* ================= FETCH DATA ================= */

  const fetchDokumen = async () => {
    try {
      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program/${subSlug}/dokumen`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Gagal mengambil dokumen");
      }

      const json = await res.json();
      console.log(json);
      setDocuments(json.data || []);
    } catch (err) {
      console.error("Error fetch dokumen:", err);
    } finally {
      setLoadingDokumen(false);
    }
  };

  useEffect(() => {
    if (subSlug) fetchDokumen();
  }, [subSlug]);

  /* ================= HANDLERS ================= */

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    const loadingToast = toast.loading("Mengupload dokumen...");

    try {
      setUploading(true);

      const token = getCookie("accessToken");

      const formData = new FormData();
      formData.append("dokumen", uploadedFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/staff/program/${subSlug}/dokumen`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("SERVER ERROR:", errorText);
        throw new Error(errorText);
      }

      const json = await res.json();

      setDocuments(json.data);

      toast.dismiss(loadingToast);
      toast.success("Dokumen berhasil diupload");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Upload gagal, coba lagi");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);

      // ✅ Reset state
      setUploadedFile(null);

      // ✅ Reset input file DOM
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Maksimal ukuran file 100MB");
      return;
    }

    setUploadedFile(file);
  };

  useEffect(() => {
    if (uploadedFile) {
      handleUpload();
    }
  }, [uploadedFile]);

  const handleDownload = async (fileUrl: string, fileName: string) => {
    const extension = fileName
      .substring(fileName.lastIndexOf("."))
      .toLowerCase();

    if (!allowedTypes.includes(extension)) {
      toast.error("Tipe file tidak diizinkan");
      return;
    }

    try {
      const response = await fetch(`https://sulsel.cloud${fileUrl}`);
      if (!response.ok) {
        throw new Error("Gagal mengunduh file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("File berhasil didownload");
    } catch (error) {
      toast.error("Download gagal");
      console.error(error);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-lg md:max-w-2xl overflow-hidden border-t-8 sm:border-t-[16px] border-[#CB0E0E]">

        {/* ================= HEADER ================= */}
        <div className="bg-white px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3 sm:gap-6 md:gap-10">
            {/* Icon — dikecilkan di mobile */}
            <div className="bg-red-600 rounded-xl w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center shadow-md rotate-6 shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" strokeWidth={2} />
            </div>

            <div>
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold italic tracking-wide text-black leading-tight">
                Arsip Digital Program
              </h1>
              <p className="text-xs sm:text-sm text-black font-semibold capitalize mt-0.5 line-clamp-1">
                {subSlug?.replace(/-/g, " ")}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => router.back()}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black flex items-center justify-center cursor-pointer text-black hover:bg-gray-100 shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={4} />
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="p-4 sm:p-6 text-black">

          {/* ================= DOCUMENT LIST ================= */}
          <h2 className="text-sm font-bold mb-3">Daftar Dokumen</h2>

          {loadingDokumen ? (
            <p className="text-xs text-gray-400">Memuat data...</p>
          ) : documents.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada dokumen diupload</p>
          ) : (
            /* 1 kolom di mobile, 2 kolom di sm+ */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1 mb-4 sm:mb-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 sm:px-4 py-3 border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all"
                >
                  {/* File icon */}
                  <div className="bg-red-100 rounded-lg w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{doc.namaFile}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`https://sulsel.cloud${doc.fileUrl}`}
                      target="_blank"
                      className="text-gray-600 hover:text-blue-500 transition-colors"
                      title="Lihat dokumen"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDownload(doc.fileUrl, doc.namaFile)}
                      className="text-gray-600 hover:text-green-500 transition-colors"
                      title="Unduh dokumen"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================= UPLOAD AREA ================= */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 sm:p-8 cursor-pointer transition-all
              ${
                dragOver
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 bg-gray-50 hover:border-red-400 hover:bg-red-50"
              }`}
            style={{ minHeight: 130 }}
          >
            <div className="bg-gray-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mb-2 sm:mb-3">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </div>

            <p className="text-sm font-bold uppercase">Upload File</p>

            <p className="text-xs text-gray-400 text-center mt-1">
              {uploading
                ? "Mengupload..."
                : uploadedFile
                  ? uploadedFile.name
                  : "Pilih PDF atau Foto Dokumen"}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <p className="text-xs text-gray-400 mt-2 sm:mt-3 text-center">
            Mendukung PDF, JPG, PNG, Doc
          </p>
        </div>
      </div>
    </div>
  );
}