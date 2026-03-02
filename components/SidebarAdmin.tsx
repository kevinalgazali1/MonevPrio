"use client";

import {
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { getCookie, deleteCookie } from "cookies-next";
import { useRouter, usePathname } from "next/navigation";

export default function SidebarAdmin() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const token = getCookie("accessToken");

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/auth/logout`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      deleteCookie("accessToken");
      router.push("/");
    }
  };

  const menuClass = (path: string) =>
    `flex items-center gap-3 px-4 py-2 rounded-md transition font-medium ${
      pathname === path
        ? "bg-white text-[#8A0707]"
        : "hover:bg-red-700 text-white"
    }`;

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen bg-[#8A0707] text-white flex flex-col justify-between overflow-hidden shadow-lg">
      
      {/* ===== TOP SECTION ===== */}
      <div>
        {/* Logo */}
        <div className="flex flex-col items-center py-8 border-b border-white/20">
          <div className="bg-white p-3 rounded-lg mb-3 rotate-8">
            <BookOpen className="text-black w-12 h-12" />
          </div>
          <h1 className="font-bold text-lg italic">SULSEL PROV</h1>
          <p className="text-xs opacity-80">E-MONITORING</p>
        </div>

        {/* Menu */}
        <nav className="mt-6 px-4 space-y-3">
          <Link
            href="/monitoring-staff-master"
            className={menuClass("/monitoring-staff-master")}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          <Link
            href="/monitoring-staff-master/admin"
            className={menuClass("/monitoring-staff-master/admin")}
          >
            <Settings size={18} />
            Admin Panel
          </Link>
        </nav>
      </div>

      {/* ===== BOTTOM SECTION ===== */}
      <div className="px-4 pb-6 space-y-4">
        <div className="px-4 py-6 bg-[#8A0707] rounded-md text-sm flex gap-2 border border-white/20">
          <User size={18} />
          Super Admin
        </div>

        <button
          onClick={handleLogout}
          className="flex px-4 py-4 items-start gap-2 w-full cursor-pointer bg-white text-[#8A0707] rounded-md font-semibold hover:bg-gray-200 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}