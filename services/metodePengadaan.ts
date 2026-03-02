import { getCookie } from "cookies-next";

export interface MetodePengadaanOption {
  id: number;
  label: string;
  value: string;
}

interface PengadaanItem {
  id: number;
  namaPengadaan: string;
}

interface PengadaanResponse {
  msg: string;
  data: PengadaanItem[];
}

type RoleType = "staff" | "admin";

export const getMetodePengadaan = async (
  role: RoleType
): Promise<MetodePengadaanOption[]> => {
  try {
    const token = getCookie("accessToken");

    const endpointMap: Record<RoleType, string> = {
      staff: "https://sulsel.cloud/api/staff/pengadaan",
      admin: "https://sulsel.cloud/api/master/pengadaan",
    };

    const res = await fetch(endpointMap[role], {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Gagal mengambil data pengadaan");
    }

    const json: PengadaanResponse = await res.json();

    return json.data.map((item) => ({
      id: item.id,
      label: item.namaPengadaan,
      value: item.namaPengadaan
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_"),
    }));
  } catch (error) {
    console.error("Error fetch metode pengadaan:", error);
    return [];
  }
};