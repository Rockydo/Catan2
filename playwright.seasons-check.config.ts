import config from "./playwright.config";
const baseURL = process.env.SEASONS_TEST_URL ?? "http://127.0.0.1:4174";
export default {
  ...config,
  webServer: process.env.SEASONS_TEST_URL
    ? undefined
    : {
        command: "npx vite --host 127.0.0.1 --port 4174 --strictPort",
        url: baseURL,
        reuseExistingServer: true,
      },
  use: { ...config.use, baseURL },
  workers: 1,
};
