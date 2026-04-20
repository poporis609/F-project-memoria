import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Globe,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  type: "toggle" | "select" | "link";
  value?: boolean | string;
}

const settingsData: SettingItem[] = [
  {
    id: "notifications",
    label: "settings.notifications.label",
    description: "settings.notifications.description",
    icon: Bell,
    type: "toggle",
    value: true,
  },
  {
    id: "theme",
    label: "settings.theme.label",
    description: "settings.theme.description",
    icon: Moon,
    type: "select",
    value: "settings.theme.night",
  },
  {
    id: "language",
    label: "settings.language.label",
    description: "settings.language.description",
    icon: Globe,
    type: "select",
    value: "settings.language.current",
  },
  {
    id: "privacy",
    label: "settings.privacy.label",
    description: "settings.privacy.description",
    icon: Shield,
    type: "link",
  },
];

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(settingsData);
  const [theme, setTheme] = useState<"night" | "day">("night");

  /* =============================
     THEME APPLY
     ============================= */
  useEffect(() => {
    document.body.setAttribute(
      "data-theme",
      theme === "night" ? "night-library" : "day-library"
    );
  }, [theme]);

  /* =============================
     TOGGLE (알림)
     ============================= */
  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((item) =>
        item.id === id && item.type === "toggle"
          ? { ...item, value: !item.value }
          : item
      )
    );
  };

  /* =============================
     LANGUAGE CHANGE
     ============================= */
  const changeLanguage = () => {
    const current = i18n.language;
    if (current === "ko") i18n.changeLanguage("en");
    else if (current === "en") i18n.changeLanguage("ja");
    else i18n.changeLanguage("ko");
  };

  /* =============================
     THEME CHANGE
     ============================= */
  const changeTheme = () => {
    setTheme((prev) => (prev === "night" ? "day" : "night"));

    setSettings((prev) =>
      prev.map((item) =>
        item.id === "theme"
          ? {
              ...item,
              value:
                theme === "night"
                  ? "settings.theme.day"
                  : "settings.theme.night",
            }
          : item
      )
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
              <SettingsIcon className="w-8 h-8 text-gold" />
            </div>
            <h1 className="font-serif text-3xl mb-2 gold-accent">
              {t("settings.title")}
            </h1>
          </header>

          {/* Settings list */}
          <div className="paper-texture rounded-lg overflow-hidden shadow-book relative">
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-leather to-transparent" />

            <div className="divide-y divide-ink/10">
              {settings.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className="p-5 pl-6 flex items-center gap-4 animate-fade-in group hover:bg-secondary/20 transition-colors cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => {
                      if (item.type === "toggle") toggleSetting(item.id);
                      if (item.id === "language") changeLanguage();
                      if (item.id === "theme") changeTheme();
                    }}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-ink/70 group-hover:text-gold transition-colors" />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <h3 className="font-serif font-semibold text-ink">
                        {t(item.label)}
                      </h3>
                      <p className="font-handwriting text-sm text-ink/70">
                        {t(item.description)}
                      </p>
                    </div>

                    {/* Control */}
                    {item.type === "toggle" && (
                      <div
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative",
                          item.value ? "bg-gold" : "bg-secondary"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-1 w-5 h-5 rounded-full bg-aged-paper shadow-sm transition-transform",
                            item.value ? "left-6" : "left-1"
                          )}
                        />
                      </div>
                    )}

                    {item.type === "select" && (
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-medium text-ink">
                          {typeof item.value === "string"
                            ? t(item.value)
                            : item.value}
                        </span>
                        <ChevronRight className="w-4 h-4 text-ink/50" />
                      </div>
                    )}

                    {item.type === "link" && (
                      <ChevronRight className="w-5 h-5 text-ink/50 group-hover:text-gold transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;