import { getLocale, setLocale, useLocale } from "../i18n";
export function LanguageSwitch() {
  const locale = useLocale();
  return (
    <label className="language-switch">
      <span>{locale === "fr" ? "Langue" : "Language"}</span>
      <select
        aria-label="Language / Langue"
        value={getLocale()}
        onChange={(e) => setLocale(e.target.value as "en" | "fr")}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </label>
  );
}
