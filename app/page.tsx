"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading("Memproses login...");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        },
      );

      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();

      document.cookie = `accessToken=${data.accessToken}; path=/`;

      toast.success("Login berhasil", { id: toastId });

      switch (data.role) {
        case "staff":
          router.push("/monitoring-staff");
          break;
        case "staff_master":
          router.push("/monitoring-staff-master");
          break;
        case "gubernur":
          router.push("/monitoring-gubernur");
          break;
        default:
          router.push("/");
      }
    } catch {
      toast.error("Username atau password salah", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#3a0000]">
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <Image
          src="/background.png"
          alt="Background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        {/* ===================== MOBILE & TABLET (< lg / < 1024px) ===================== */}
        {/* Layout: susun atas ke bawah — judul → deskripsi → gambar → card */}
        <div className="relative z-10 flex lg:hidden min-h-screen flex-col items-center px-5 sm:px-16 pt-10 pb-10">

          {/* 1. Judul */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-widest text-white drop-shadow text-center">
            MONEVPRIO
          </h1>

          {/* 2. Deskripsi */}
          <p className="text-gray-300 text-sm sm:text-base mt-3 text-center leading-relaxed px-2 max-w-lg">
            MONEVPRIO (Monitoring dan Evaluasi Program Prioritas) merupakan
            aplikasi berbasis digital yang dikembangkan oleh Pemerintah Provinsi
            Sulawesi Selatan untuk mendukung proses pemantauan dan evaluasi
            pelaksanaan program kerja prioritas secara terintegrasi, efektif,
            dan akuntabel.
          </p>

          {/* 3. Gambar gubernur & wakil */}
          <div className="flex items-end justify-center mt-4 -mb-4">
            <Image
              src="/gubernur.png"
              alt="Gubernur"
              width={260}
              height={340}
              className="object-contain w-[160px] sm:w-[220px]"
            />
            <Image
              src="/wakil.png"
              alt="Wakil"
              width={230}
              height={300}
              className="object-contain -ml-6 sm:-ml-10 w-[140px] sm:w-[200px]"
            />
          </div>

          {/* 4. Card login */}
          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl p-7 sm:p-9 border-t-8 border-[#CB0E0E]">
            <div className="flex justify-center mb-4 sm:mb-5">
              <div className="bg-[#CB0E0E] w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-9 h-9 sm:w-10 sm:h-10"
                />
              </div>
            </div>

            <h2 className="text-center text-lg sm:text-xl font-bold text-gray-800">
              MONEVPRIO
            </h2>
            <p className="text-center text-gray-500 text-xs sm:text-sm mb-6 tracking-widest">
              SULAWESI SELATAN
            </p>

            <form onSubmit={handleLogin} className="space-y-4 text-black">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full mt-1.5 px-4 py-2.5 border border-gray-300 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="*********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#CB0E0E] hover:bg-red-700 active:bg-red-800 transition text-white py-2.5 rounded-lg font-semibold shadow-md disabled:opacity-70 text-sm"
              >
                {loading ? "Loading..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        {/* ===================== DESKTOP ONLY (lg+ / 1024px+) — TIDAK DIUBAH ===================== */}
        <div className="relative z-10 hidden lg:flex min-h-screen flex-row">

          {/* LEFT */}
          <div className="flex-1 flex flex-col justify-center px-12 pt-4 md:px-20 text-white">
            <h1 className="text-5xl font-extrabold tracking-wide mb-6">
              MONEVPRIO
            </h1>

            <p className="max-w-xl text-lg text-gray-200 leading-relaxed">
              MONEVPRIO (Monitoring dan Evaluasi Program Prioritas) merupakan
              aplikasi berbasis digital yang dikembangkan oleh Pemerintah
              Provinsi Sulawesi Selatan untuk mendukung proses pemantauan dan
              evaluasi pelaksanaan program kerja prioritas secara terintegrasi,
              efektif, dan akuntabel.
            </p>

            <div className="relative mt-10 flex items-end">
              <Image
                src="/gubernur.png"
                alt="Gubernur"
                width={420}
                height={550}
                className="object-contain z-10"
              />
              <Image
                src="/wakil.png"
                alt="Wakil"
                width={380}
                height={520}
                className="object-contain -ml-16"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex-1 flex items-center justify-center px-10 md:px-20">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border-t-[16px] border-[#CB0E0E]">
              <div className="flex justify-center mb-6">
                <div className="bg-[#CB0E0E] w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={50}
                    height={50}
                  />
                </div>
              </div>

              <h2 className="text-center text-2xl font-bold text-gray-800">
                MONEVPRIO
              </h2>
              <p className="text-center text-gray-500 text-sm mb-8">
                SULAWESI SELATAN
              </p>

              <form onSubmit={handleLogin} className="space-y-5 text-black">
                <div>
                  <label className="text-sm">Username</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full mt-2 px-4 py-2 border border-gray-300 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-sm">Password</label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="*********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#CB0E0E] hover:bg-red-700 transition text-white py-2 rounded-lg font-semibold shadow-md disabled:opacity-70"
                >
                  {loading ? "Loading..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
