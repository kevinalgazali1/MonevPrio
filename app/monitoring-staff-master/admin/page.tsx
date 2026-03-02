"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Plus, Pencil } from "lucide-react";
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
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[500px] rounded-[30px] shadow-2xl overflow-hidden animate-fade-in border-t-16 border-red-700"
      >
        <div className="p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Instansi Baru</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose}>✕</button>
          </div>

          {/* LABEL */}
          <div className="mb-2">
            <label className="text-sm font-semibold">Nama Instansi</label>
          </div>

          <input
            type="text"
            placeholder="Masukkan nama instansi"
            value={namaDinas}
            onChange={(e) => setNamaDinas(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-4 py-3"
          />

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 w-full rounded-lg text-white ${
                loading
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
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
          {
            headers: { Authorization: `Bearer ${token}` },
          },
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
          body: JSON.stringify({
            ...form,
            dinasId: Number(form.dinasId),
          }),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.msg || "Gagal membuat akun staff");
      }

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
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[550px] rounded-[30px] shadow-2xl overflow-hidden animate-fade-in border-t-16 border-red-700"
      >
        <div className="p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Pengguna Baru</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose}>✕</button>
          </div>

          {/* ================= NAMA ================= */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Nama Lengkap
            </label>
            <input
              placeholder="Masukkan Nama Lengkap"
              value={form.name}
              className="w-full bg-gray-100 rounded-lg px-4 py-3"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* ================= USERNAME & PASSWORD ================= */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Username
              </label>
              <input
                placeholder="Masukkan Username"
                value={form.username}
                className="w-full bg-gray-100 rounded-lg px-4 py-3"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Password
              </label>
              <input
                placeholder="Masukkan Password"
                type="password"
                value={form.password}
                className="w-full bg-gray-100 rounded-lg px-4 py-3"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {/* ================= DINAS ================= */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Pilih Dinas
            </label>
            <select
              value={form.dinasId}
              className="w-full bg-gray-100 rounded-lg px-4 py-3"
              onChange={(e) => setForm({ ...form, dinasId: e.target.value })}
            >
              <option value="">Pilih Dinas</option>
              {dropdown.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.namaDinas}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 w-full rounded-lg text-white ${
                loading
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
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

  // Fetch dropdown dinas
  useEffect(() => {
    const fetchDinasDropdown = async () => {
      try {
        const token = getCookie("accessToken");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API}/master/dinas/dropdown`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const json = await res.json();

        if (json?.data) {
          setDropdown(json.data);
        }
      } catch (err) {
        console.error("Error fetch dropdown:", err);
      }
    };

    fetchDinasDropdown();
  }, []);

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

      if (form.password.trim()) {
        payload.password = form.password;
      }

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

      if (!res.ok) {
        throw new Error(json?.msg || "Gagal update");
      }

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

  useEffect(() => {
    if (dropdown.length > 0 && staff?.dinas?.namaDinas) {
      const matchedDinas = dropdown.find(
        (d) => d.namaDinas === staff.dinas.namaDinas,
      );

      if (matchedDinas) {
        setForm((prev) => ({
          ...prev,
          dinasId: String(matchedDinas.id),
        }));
      }
    }
  }, [dropdown, staff]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 text-black bg-black/40 flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[550px] rounded-[30px] shadow-2xl overflow-hidden animate-fade-in border-t-16 border-red-700"
      >
        <div className="p-8">
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="font-bold italic text-lg">Edit Pengguna</h2>
              <p className="text-sm text-gray-500">E-Monitoring</p>
            </div>
            <button onClick={onClose}>✕</button>
          </div>

          {/* Nama */}
          <label className="text-sm font-semibold">Nama Lengkap</label>
          <input
            value={form.name}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Username */}
          <label className="text-sm font-semibold">Username</label>
          <input
            value={form.username}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          {/* Password */}
          <label className="text-sm font-semibold">Password (Opsional)</label>
          <input
            type="password"
            placeholder="Isi jika ingin mengganti password"
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mb-4 mt-1"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {/* Dinas */}
          <label className="text-sm font-semibold">Pilih Dinas</label>
          <select
            value={form.dinasId}
            className="w-full bg-gray-100 rounded-lg px-4 py-3 mt-1"
            onChange={(e) => setForm({ ...form, dinasId: e.target.value })}
          >
            <option value="" disabled>Pilih Dinas</option>
            {dropdown.map((d) => (
              <option key={d.id} value={d.id}>
                {d.namaDinas}
              </option>
            ))}
          </select>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg"
            >
              BATALKAN
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-6 py-2 w-full rounded-lg text-white ${
                loading
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
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

  const refreshData = () => {
    fetchData();
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <SidebarAdmin />

      <main className="ml-64 flex-1 p-10">
        <h1 className="text-3xl font-extrabold italic mb-10 text-black">
          ADMIN PANEL
        </h1>

        <hr className="mb-8 border-gray-300" />

        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="grid grid-cols-2 gap-10 w-full max-w-5xl">
            {/* ================= INSTANSI ================= */}
            <div className="bg-white rounded-lg shadow-md border border-red-300 p-6 w-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-black" />
                  <h2 className="font-semibold text-lg text-black">Instansi</h2>
                </div>

                <button
                  onClick={() => setShowDinasModal(true)}
                  className="flex items-center gap-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition"
                >
                  <Plus size={14} />
                  Tambah Instansi
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : dinasList.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Tidak ada data instansi
                  </p>
                ) : (
                  dinasList.map((dinas) => (
                    <div
                      key={dinas.id}
                      className="bg-gray-100 border border-red-200 rounded-md px-4 py-2 text-sm text-black"
                    >
                      {dinas.namaDinas}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ================= PENGGUNA ================= */}
            <div className="bg-white rounded-lg shadow-md border border-red-300 p-6 w-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-black" />
                  <h2 className="font-semibold text-lg text-black">Pengguna</h2>
                </div>

                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition"
                >
                  <Plus size={14} />
                  Tambah User
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : staffList.length === 0 ? (
                  <p className="text-sm text-gray-500">Tidak ada data staff</p>
                ) : (
                  staffList.map((staff) => (
                    <div
                      key={staff.id}
                      className="bg-gray-100 border border-red-200 rounded-md px-4 py-2 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-black">
                          {staff.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {staff.dinas?.namaDinas}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedStaff(staff)}
                        className="text-gray-600 hover:text-red-600 transition"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showDinasModal && (
        <TambahDinasModal
          onClose={() => setShowDinasModal(false)}
          onSuccess={refreshData}
        />
      )}

      {showUserModal && (
        <TambahUserModal
          onClose={() => setShowUserModal(false)}
          onSuccess={refreshData}
        />
      )}

      {selectedStaff && (
        <EditUserModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onSuccess={() => {
            refreshData();
            setSelectedStaff(null);
          }}
        />
      )}

      <style>{`@keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
        }

        .animate-fade-in {
        animation: fadeIn 0.2s ease-out forwards;
        }`}</style>
    </div>
  );
}
