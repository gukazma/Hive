import { create } from "zustand";

const KEY = "hive_theme";
const initialDark = localStorage.getItem(KEY) === "dark";
if (initialDark) document.documentElement.dataset.theme = "dark";

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  dark: initialDark,
  toggle: () => {
    const dark = !get().dark;
    localStorage.setItem(KEY, dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    set({ dark });
  },
}));
