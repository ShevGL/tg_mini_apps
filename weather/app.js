const CITY = { name: "Алматы", lat: 43.2389, lon: 76.8897 };

const WMO = {
  0: "ясно", 1: "в основном ясно", 2: "переменная облачность", 3: "пасмурно",
  45: "туман", 48: "изморозь", 51: "морось", 53: "морось", 55: "сильная морось",
  56: "ледяная морось", 57: "ледяная морось",
  61: "небольшой дождь", 63: "дождь", 65: "сильный дождь",
  66: "ледяной дождь", 67: "ледяной дождь",
  71: "снег", 73: "снег", 75: "сильный снег", 77: "снежная крупа",
  80: "ливень", 81: "ливень", 82: "сильный ливень", 85: "снегопад", 86: "снегопад",
  95: "гроза", 96: "гроза с градом", 99: "гроза с градом",
};

const RAINY = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99];

const $ = (id) => document.getElementById(id);

function advice(feels, wind, rainy) {
  let a;
  if (feels <= -15) a = "Тёплая зимняя куртка, шапка, перчатки, шарф.";
  else if (feels <= -5) a = "Зимняя куртка, шапка, перчатки.";
  else if (feels <= 5) a = "Демисезонная куртка, шапка или капюшон.";
  else if (feels <= 12) a = "Лёгкая куртка или свитер.";
  else if (feels <= 18) a = "Лонгслив или тонкий свитер.";
  else if (feels <= 25) a = "Футболка, на вечер лёгкая кофта.";
  else a = "Лёгкая одежда, головной убор, вода с собой.";
  if (rainy) a += " Возьмите зонт.";
  if (wind >= 10) a += " Ветрено, ветровка не помешает.";
  return a;
}

function aqiLabel(v) {
  if (v == null) return "--";
  if (v <= 50) return `${v} · хороший`;
  if (v <= 100) return `${v} · умеренный`;
  if (v <= 150) return `${v} · вредный для чувствительных`;
  if (v <= 200) return `${v} · вредный`;
  return `${v} · опасный`;
}

function withTimeout(url, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));
}

async function load() {
  const w = new URL("https://api.open-meteo.com/v1/forecast");
  w.search = new URLSearchParams({
    latitude: CITY.lat, longitude: CITY.lon, timezone: "Asia/Almaty",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation",
    wind_speed_unit: "ms",
  });
  const q = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  q.search = new URLSearchParams({ latitude: CITY.lat, longitude: CITY.lon, current: "us_aqi" });

  const [wr, qr] = await Promise.allSettled([withTimeout(w), withTimeout(q)]);
  if (wr.status !== "fulfilled" || !wr.value.ok) throw new Error("погода недоступна");
  const c = (await wr.value.json()).current;

  let aq = null;
  if (qr.status === "fulfilled" && qr.value.ok) {
    try { aq = (await qr.value.json()).current?.us_aqi; } catch {}
  }

  $("city").textContent = CITY.name;
  $("temp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("desc").textContent = WMO[c.weather_code] ?? "—";
  $("feels").textContent = `${Math.round(c.apparent_temperature)}°`;
  $("wind").textContent = `${c.wind_speed_10m.toFixed(1)} м/с`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("aqi").textContent = aqiLabel(aq);
  $("advice").textContent = advice(c.apparent_temperature, c.wind_speed_10m,
    c.precipitation > 0 || RAINY.includes(c.weather_code));
  $("status").textContent = "Обновлено " + new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty",
  });
}

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

load().catch((e) => { $("status").textContent = "Ошибка: " + e.message; });

// Тихий пиксельный фон: медленно падающие снежинки/капли и звёзды.
const cv = $("bg"), ctx = cv.getContext("2d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let parts = [];
function resize() {
  const s = 4; // крупный пиксель
  cv.width = Math.ceil(innerWidth / s); cv.height = Math.ceil(innerHeight / s);
  cv.style.imageRendering = "pixelated";
  parts = Array.from({ length: 60 }, () => ({
    x: Math.random() * cv.width, y: Math.random() * cv.height,
    v: 0.1 + Math.random() * 0.3, d: Math.random() < 0.5 ? 1 : 0,
  }));
}
function draw() {
  ctx.fillStyle = "#1b2a41"; ctx.fillRect(0, 0, cv.width, cv.height);
  for (const p of parts) {
    ctx.fillStyle = p.d ? "#98c1d9" : "#f4f1de";
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
  }
}
function frame() {
  draw();
  for (const p of parts) {
    p.y += p.v; p.x += Math.sin(p.y / 10) * 0.1;
    if (p.y > cv.height) { p.y = -1; p.x = Math.random() * cv.width; }
  }
  requestAnimationFrame(frame);
}
addEventListener("resize", resize);
resize();
if (reduce) draw(); else frame();
