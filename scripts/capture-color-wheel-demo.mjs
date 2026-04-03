/**
 * Opens the built app, opens the stroke color picker, captures a screenshot,
 * and drags on the hue wheel. Set PUPPETEER_HEADLESS=1 in environments
 * without a display (artifacts still capture; x11grab then only records blank video).
 */
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const buildDir = path.join(root, "excalidraw-app", "build");
const shotPath = path.join(
  root,
  "artifacts",
  "screenshots",
  "stroke-color-wheel.png",
);

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve();
          } else if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server ${url} bad status ${res.statusCode}`));
          } else {
            setTimeout(tryOnce, 200);
          }
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url}`));
          } else {
            setTimeout(tryOnce, 200);
          }
        });
    };
    tryOnce();
  });
}

const chromePath = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";

async function main() {
  const httpServerBin = path.join(root, "node_modules", ".bin", "http-server");
  const port =
    Number(process.env.CAPTURE_HTTP_PORT) ||
    52000 + Math.floor(Math.random() * 8000);
  const handler = spawn(
    httpServerBin,
    [buildDir, "-a", "127.0.0.1", "-p", String(port)],
    {
      cwd: root,
      stdio: "ignore",
    },
  );

  const base = `http://127.0.0.1:${port}`;

  try {
    await waitForServer(base);
  } catch (e) {
    handler.kill();
    throw e;
  }

  const useHeadless = process.env.PUPPETEER_HEADLESS === "1";
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: useHeadless ? "new" : false,
    defaultViewport: { width: 1280, height: 720 },
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--window-size=1280,720",
      "--window-position=0,0",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".excalidraw", { timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.keyboard.press("2");
    await new Promise((r) => setTimeout(r, 300));

    const mainCanvas = await page.waitForSelector(".excalidraw-container canvas", {
      timeout: 60000,
    });
    const c = await mainCanvas.boundingBox();
    if (c) {
      await page.mouse.click(c.x + c.width * 0.35, c.y + c.height * 0.35);
      await page.mouse.move(c.x + c.width * 0.65, c.y + c.height * 0.55);
      await page.mouse.down();
      await page.mouse.up();
    }

    await page.waitForSelector(
      'button[data-openpopup="elementStroke"].color-picker__button',
      { timeout: 60000 },
    );
    await page.click('button[data-openpopup="elementStroke"].color-picker__button');

    await page.waitForSelector(".color-wheel-picker__canvas", { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({ path: shotPath, fullPage: false });

    const canvas = await page.$(".color-wheel-picker__canvas");
    const box = canvas ? await canvas.boundingBox() : null;
    if (box) {
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.45, {
        steps: 40,
      });
      await page.mouse.up();
    }

    await new Promise((r) => setTimeout(r, 600));
  } finally {
    await browser.close();
    handler.kill();
  }

  console.log("Wrote", shotPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
