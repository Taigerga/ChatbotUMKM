import { BarChart3, Bot, Boxes, FileUp, LayoutDashboard, PlusCircle, Receipt, Settings, Users } from "lucide-react";

export const NAV = [
  { href: "/chat", label: "Chatbot", icon: Bot, ready: true },
  { href: "/input", label: "Input Cepat", icon: PlusCircle, ready: true },
  { href: "/overview", label: "Ringkasan", icon: LayoutDashboard, ready: true },
  { href: "/transactions", label: "Transaksi", icon: Receipt, ready: true },
  { href: "/products", label: "Produk", icon: Boxes, ready: true },
  { href: "/customers", label: "Pelanggan", icon: Users, ready: true },
  { href: "/imports", label: "Impor Data", icon: FileUp, ready: true },
  { href: "/machine-learning", label: "Machine Learning", icon: BarChart3, ready: true },
  { href: "/settings", label: "Pengaturan", icon: Settings, ready: false },
];
