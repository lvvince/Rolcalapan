import {
  Users, User, QrCode, ClipboardCheck, ClipboardList, Megaphone, MapPin,
  CalendarClock, CalendarDays, CalendarCheck, Gift, BarChart3, Mic, Bell,
  HandHelping, HeartHandshake, Sparkles, Languages, LayoutDashboard,
} from "lucide-react";

export const CARD_ICONS = {
  Users, User, QrCode, ClipboardCheck, ClipboardList, Megaphone, MapPin,
  CalendarClock, CalendarDays, CalendarCheck, Gift, BarChart3, Mic, Bell,
  HandHelping, HeartHandshake, Sparkles, Languages,
};

export const cardIcon = (item) => CARD_ICONS[item.cardIcon] || LayoutDashboard;