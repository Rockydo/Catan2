import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
try {
  mkdirSync("releases", { recursive: true });
  for (const lang of ["en", "fr"]) {
    const page = await browser.newPage();
    await page.goto(
      `${process.env.RULES_URL || "http://127.0.0.1:4173"}/rules${lang === "fr" ? "-fr" : ""}.html`,
    );
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.locator(".print-content").waitFor();
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: `releases/rules-${lang}.pdf`,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    await page.close();
  }
} finally {
  await browser.close();
}
