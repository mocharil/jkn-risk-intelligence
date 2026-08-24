import { ProvinceRiskData } from "@/types/risk";

export interface ProvinceGeo {
  code: string;
  name: string;
  island: "Sumatera" | "Jawa" | "Kalimantan" | "Sulawesi" | "Bali & Nusa Tenggara" | "Maluku & Papua";
  lat: number;
  lng: number;
  x: number; // Normalized SVG X coordinate (0 - 1000)
  y: number; // Normalized SVG Y coordinate (0 - 500)
}

export const INDONESIA_PROVINCES: ProvinceGeo[] = [
  // Sumatera
  { code: "ID-AC", name: "Aceh", island: "Sumatera", lat: 4.6951, lng: 96.7494, x: 80, y: 110 },
  { code: "ID-SU", name: "Sumatera Utara", island: "Sumatera", lat: 2.1154, lng: 99.5451, x: 125, y: 150 },
  { code: "ID-SB", name: "Sumatera Barat", island: "Sumatera", lat: -0.7399, lng: 100.8000, x: 160, y: 220 },
  { code: "ID-RI", name: "Riau", island: "Sumatera", lat: 0.2933, lng: 101.7068, x: 195, y: 190 },
  { code: "ID-KR", name: "Kepulauan Riau", island: "Sumatera", lat: 3.9456, lng: 108.1428, x: 280, y: 150 },
  { code: "ID-JA", name: "Jambi", island: "Sumatera", lat: -1.4852, lng: 102.4381, x: 210, y: 245 },
  { code: "ID-SS", name: "Sumatera Selatan", island: "Sumatera", lat: -3.3194, lng: 104.9144, x: 240, y: 290 },
  { code: "ID-BE", name: "Bengkulu", island: "Sumatera", lat: -3.5778, lng: 102.3464, x: 195, y: 300 },
  { code: "ID-BB", name: "Kep. Bangka Belitung", island: "Sumatera", lat: -2.7410, lng: 106.4406, x: 285, y: 275 },
  { code: "ID-LA", name: "Lampung", island: "Sumatera", lat: -4.5586, lng: 105.4068, x: 260, y: 335 },

  // Jawa
  { code: "ID-BT", name: "Banten", island: "Jawa", lat: -6.4058, lng: 106.0640, x: 290, y: 380 },
  { code: "ID-JK", name: "DKI Jakarta", island: "Jawa", lat: -6.2088, lng: 106.8456, x: 315, y: 375 },
  { code: "ID-JB", name: "Jawa Barat", island: "Jawa", lat: -6.9175, lng: 107.6191, x: 335, y: 390 },
  { code: "ID-JT", name: "Jawa Tengah", island: "Jawa", lat: -7.1509, lng: 110.1403, x: 385, y: 400 },
  { code: "ID-YO", name: "DI Yogyakarta", island: "Jawa", lat: -7.7956, lng: 110.3695, x: 395, y: 418 },
  { code: "ID-JI", name: "Jawa Timur", island: "Jawa", lat: -7.5361, lng: 112.2384, x: 445, y: 405 },

  // Bali & Nusa Tenggara
  { code: "ID-BA", name: "Bali", island: "Bali & Nusa Tenggara", lat: -8.4095, lng: 115.1889, x: 505, y: 420 },
  { code: "ID-NB", name: "Nusa Tenggara Barat", island: "Bali & Nusa Tenggara", lat: -8.6529, lng: 117.3616, x: 545, y: 425 },
  { code: "ID-NT", name: "Nusa Tenggara Timur", island: "Bali & Nusa Tenggara", lat: -8.6574, lng: 121.0794, x: 620, y: 430 },

  // Kalimantan
  { code: "ID-KB", name: "Kalimantan Barat", island: "Kalimantan", lat: -0.0000, lng: 109.3333, x: 340, y: 210 },
  { code: "ID-KT", name: "Kalimantan Tengah", island: "Kalimantan", lat: -1.6815, lng: 113.3824, x: 410, y: 250 },
  { code: "ID-KS", name: "Kalimantan Selatan", island: "Kalimantan", lat: -3.0926, lng: 115.2838, x: 450, y: 300 },
  { code: "ID-KI", name: "Kalimantan Timur", island: "Kalimantan", lat: 0.5387, lng: 116.4194, x: 470, y: 190 },
  { code: "ID-KU", name: "Kalimantan Utara", island: "Kalimantan", lat: 3.0731, lng: 116.0414, x: 460, y: 120 },

  // Sulawesi
  { code: "ID-SA", name: "Sulawesi Utara", island: "Sulawesi", lat: 0.6247, lng: 123.9750, x: 620, y: 130 },
  { code: "ID-GO", name: "Gorontalo", island: "Sulawesi", lat: 0.6999, lng: 122.4467, x: 585, y: 145 },
  { code: "ID-ST", name: "Sulawesi Tengah", island: "Sulawesi", lat: -1.4300, lng: 121.4456, x: 575, y: 220 },
  { code: "ID-SR", name: "Sulawesi Barat", island: "Sulawesi", lat: -2.8441, lng: 119.2321, x: 535, y: 260 },
  { code: "ID-SN", name: "Sulawesi Selatan", island: "Sulawesi", lat: -3.6688, lng: 119.9741, x: 545, y: 310 },
  { code: "ID-SG", name: "Sulawesi Tenggara", island: "Sulawesi", lat: -4.1449, lng: 122.1746, x: 600, y: 315 },

  // Maluku & Papua
  { code: "ID-MU", name: "Maluku Utara", island: "Maluku & Papua", lat: 1.5709, lng: 127.8088, x: 690, y: 155 },
  { code: "ID-MA", name: "Maluku", island: "Maluku & Papua", lat: -3.2385, lng: 130.1453, x: 730, y: 280 },
  { code: "ID-PB", name: "Papua Barat", island: "Maluku & Papua", lat: -1.3361, lng: 133.1747, x: 800, y: 215 },
  { code: "ID-PA", name: "Papua", island: "Maluku & Papua", lat: -4.2699, lng: 138.0804, x: 890, y: 250 },
];
