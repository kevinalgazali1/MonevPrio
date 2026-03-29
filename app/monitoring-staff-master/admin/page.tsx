"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Plus, Pencil, Menu } from "lucide-react";
import { getCookie } from "cookies-next";
import SidebarAdmin from "@/components/SidebarAdmin";
import toast from "react-hot-toast";

interface Dinas {
  id: number;
  namaDinas: string;
  slug: string;
  totalProgram: number;
  programPrioritas: number;
}

interface Staff {
  id: number;
  username: string;
  name: string;
  dinas: {
    namaDinas: string;
  };
  createdAt: string;
}

interface ModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function TambahDinasModal({ onClose, onSuccess }: ModalProps) {
  const [namaDinas, setNamaDinas] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!namaDinas.trim()) {
      setError("Nama instansi wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ namaDinas }),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.msg || "Gagal menambahkan instansi");
      }

      toast.success(json?.msg || "Instansi berhasil ditambahkan");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error tambah dinas:", err);
      toast.error("Gagal menambahkan instansi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in border-t-[16px] border-red-700"
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Instansi Baru</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
          </div>

          <div className="mb-2">
            <label className="text-sm font-semibold">Nama Instansi</label>
          </div>

          <input
            type="text"
            placeholder="Masukkan nama instansi"
            value={namaDinas}
            onChange={(e) => setNamaDinas(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
          />

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          <div className="flex justify-between mt-8 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 flex-1 rounded-lg text-white text-sm ${
                loading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Menyimpan..." : "SIMPAN DATA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DropdownDinas {
  id: number;
  namaDinas: string;
}

function TambahUserModal({ onClose, onSuccess }: ModalProps) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    dinasId: "",
  });

  const [dropdown, setDropdown] = useState<DropdownDinas[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchDropdown = async () => {
      try {
        const token = getCookie("accessToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas/dropdown`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        setDropdown(data.data || []);
      } catch (err) {
        console.error("Error fetch dropdown:", err);
      }
    };
    fetchDropdown();
  }, []);

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.name || !form.dinasId) {
      setError("Semua field wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = getCookie("accessToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/staff`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...form, dinasId: Number(form.dinasId) }),
        },
      );

      const json = await res.json();

      if (!res.ok) throw new Error(json?.msg || "Gagal membuat akun staff");

      toast.success(json?.msg || "User berhasil ditambahkan");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error create staff:", err);
      toast.error("Gagal membuat akun staff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50 px-4 py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in border-t-[16px] border-red-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Pengguna Baru</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Nama Lengkap</label>
            <input
              placeholder="Masukkan Nama Lengkap"
              value={form.name}
              className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Username & Password — stack di mobile, 2 kolom di sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Username</label>
              <input
                placeholder="Masukkan Username"
                value={form.username}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input
                placeholder="Masukkan Password"
                type="password"
                value={form.password}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Pilih Dinas</label>
            <select
              value={form.dinasId}
              className="w-full bg-gray-100 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
              onChange={(e) => setForm({ ...form, dinasId: e.target.value })}
            >
              <option value="">Pilih Dinas</option>
              {dropdown.map((d) => (
                <option key={d.id} value={d.id}>{d.namaDinas}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <div className="flex justify-between mt-8 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 flex-1 rounded-lg text-white text-sm ${
                loading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Menyimpan..." : "SIMPAN DATA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  staff: Staff;
  onClose: () => void;
  onSuccess: () => void;
}

interface UpdateStaffPayload {
  username: string;
  name: string;
  dinasId: number;
  password?: string;
}

function EditUserModal({ staff, onClose, onSuccess }: EditUserModalProps) {
  const [form, setForm] = useState({
    username: staff.username,
    password: "",
    name: staff.name,
    dinasId: "",
  });

  const [dropdown, setDropdown] = useState<DropdownDinas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDinasDropdown = async () => {
      try {
        const token = getCookie("accessToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas/dropdown`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json();
        if (json?.data) setDropdown(json.data);
      } catch (err) {
        console.error("Error fetch dropdown:", err);
      }
    };
    fetchDinasDropdown();
  }, []);

  useEffect(() => {
    if (dropdown.length > 0 && staff?.dinas?.namaDinas) {
      const matchedDinas = dropdown.find((d) => d.namaDinas === staff.dinas.namaDinas);
      if (matchedDinas) {
        setForm((prev) => ({ ...prev, dinasId: String(matchedDinas.id) }));
      }
    }
  }, [dropdown, staff]);

  const handleSubmit = async () => {
    if (!form.username || !form.name || !form.dinasId) {
      setError("Username, Nama dan Dinas wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = getCookie("accessToken");

      const payload: UpdateStaffPayload = {
        username: form.username,
        name: form.name,
        dinasId: Number(form.dinasId),
      };

      if (form.password.trim()) payload.password = form.password;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/master/staff/${staff.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!res.ok) throw new Error(json?.msg || "Gagal update");

      toast.success(json?.msg || "User berhasil diperbarui");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error update staff:", err);
      toast.error("Gagal memperbarui user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50 px-4 py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in border-t-[16px] border-red-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Edit Pengguna</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
          </div>

          <label className="text-sm font-semibold">Nama Lengkap</label>
          <input
            value={form.name}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1 outline-none focus:ring-2 focus:ring-red-500"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label className="text-sm font-semibold">Username</label>
          <input
            value={form.username}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1 outline-none focus:ring-2 focus:ring-red-500"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <label className="text-sm font-semibold">Password (Opsional)</label>
          <input
            type="password"
            placeholder="Isi jika ingin mengganti password"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1 outline-none focus:ring-2 focus:ring-red-500"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <label className="text-sm font-semibold">Pilih Dinas</label>
          <select
            value={form.dinasId}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-red-500"
            onChange={(e) => setForm({ ...form, dinasId: e.target.value })}
          >
            <option value="" disabled>Pilih Dinas</option>
            {dropdown.map((d) => (
              <option key={d.id} value={d.id}>{d.namaDinas}</option>
            ))}
          </select>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          <div className="flex justify-between mt-8 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 flex-1 rounded-lg text-white text-sm ${
                loading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Menyimpan..." : "UPDATE DATA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const [dinasList, setDinasList] = useState<Dinas[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDinasModal, setShowDinasModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const token = getCookie("accessToken");

      const [dinasRes, staffRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/master/staff`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dinasData = await dinasRes.json();
      const staffData = await staffRes.json();

      setDinasList(dinasData.data ?? []);
      setStaffList(staffData.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#2d0000]">
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="lg:ml-64 bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-10">

        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-3 mb-6 sm:mb-10">
          {/* Burger — mobile & tablet only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow text-[#8A0707] hover:bg-gray-50 transition shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold italic text-black">
            ADMIN PANEL
          </h1>
        </div>

        <hr className="mb-6 sm:mb-8 border-gray-300" />

        {/* ================= PANEL GRID ================= */}
        {/* 1 kolom di mobile, 2 kolom di md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 w-full max-w-5xl mx-auto">

          {/* ================= INSTANSI ================= */}
          <div className="bg-white rounded-xl shadow-md border border-red-300 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
                <h2 className="font-semibold text-base sm:text-lg text-black">Instansi</h2>
              </div>

              <button
                onClick={() => setShowDinasModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-2.5 sm:px-3 py-2 rounded-md transition whitespace-nowrap"
              >
                <Plus size={13} />
                Tambah Instansi
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-80 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : dinasList.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada data instansi</p>
              ) : (
                dinasList.map((dinas) => (
                  <div
                    key={dinas.id}
                    className="bg-gray-100 border border-red-200 rounded-md px-3 sm:px-4 py-2 text-sm text-black"
                  >
                    {dinas.namaDinas}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================= PENGGUNA ================= */}
          <div className="bg-white rounded-xl shadow-md border border-red-300 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black shrink-0" />
                <h2 className="font-semibold text-base sm:text-lg text-black">Pengguna</h2>
              </div>

              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-2.5 sm:px-3 py-2 rounded-md transition whitespace-nowrap"
              >
                <Plus size={13} />
                Tambah User
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-80 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : staffList.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada data staff</p>
              ) : (
                staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="bg-gray-100 border border-red-200 rounded-md px-3 sm:px-4 py-2 flex justify-between items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">{staff.name}</p>
                      <p className="text-xs text-gray-600 truncate">{staff.dinas?.namaDinas}</p>
                    </div>

                    <button
                      onClick={() => setSelectedStaff(staff)}
                      className="text-gray-600 hover:text-red-600 transition ml-2 shrink-0"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {showDinasModal && (
        <TambahDinasModal
          onClose={() => setShowDinasModal(false)}
          onSuccess={fetchData}
        />
      )}

      {showUserModal && (
        <TambahUserModal
          onClose={() => setShowUserModal(false)}
          onSuccess={fetchData}
        />
      )}

      {selectedStaff && (
        <EditUserModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onSuccess={() => {
            fetchData();
            setSelectedStaff(null);
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}