"use strict";

/*
 * Fonti dati:
 * - Open-Meteo (open-meteo.com): meteo attuale, temperatura, previsioni, vento di backup.
 *   API gratuita, CORS abilitato, nessuna chiave richiesta.
 * - Open Data FVG, dataset "Meteo - dati delle stazioni regionali" (licenza IODL 2.0):
 *   dati delle stazioni anemometriche cittadine. Il portale è basato su Socrata: lo schema
 *   esatto delle colonne non è documentato qui, quindi i nomi dei campi vengono rilevati
 *   euristicamente (vedi detectField). Se il rilevamento fallisce, l'app mostra comunque
 *   i dati Open-Meteo come riferimento generale per Trieste.
 *
 * Nota: il feed "tempo reale" pubblicato direttamente su meteo.fvg.it non viene usato
 * come sorgente qui: i termini d'uso di ARPA-OSMER vietano la ripubblicazione dei dati in
 * tempo reale prima di 24 ore dal riferimento, salvo accordi specifici. Il dataset Open
 * Data FVG (IODL 2.0) è invece esplicitamente licenziato per il riuso.
 */

const TRIESTE = { lat: 45.6495, lon: 13.7768, tz: "Europe/Rome" };

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${TRIESTE.lat}&longitude=${TRIESTE.lon}` +
  `&current_weather=true` +
  `&hourly=temperature_2m,weathercode,windspeed_10m,windgusts_10m,winddirection_10m` +
  `&wind_speed_unit=kmh&timezone=${encodeURIComponent(TRIESTE.tz)}&forecast_days=2`;

const FVG_SOCRATA_BASE = "https://www.dati.friuliveneziagiulia.it/resource/4wxn-35av.json";

const TRIESTE_STATION_KEYWORDS = [
  "trieste", "bandiera", "paloma", "sgonico", "grisa", "barcola", "muggia", "moletto", "porto"
];

const WEATHER_CODES = {
  0: ["☀️", "Sereno"], 1: ["🌤️", "Poco nuvoloso"], 2: ["⛅", "Parz. nuvoloso"], 3: ["☁️", "Coperto"],
  45: ["🌫️", "Nebbia"], 48: ["🌫️", "Nebbia gelata"],
  51: ["🌦️", "Pioviggine debole"], 53: ["🌦️", "Pioviggine"], 55: ["🌦️", "Pioviggine intensa"],
  61: ["🌧️", "Pioggia debole"], 63: ["🌧️", "Pioggia"], 65: ["🌧️", "Pioggia intensa"],
  66: ["🌧️", "Pioggia gelata"], 67: ["🌧️", "Pioggia gelata intensa"],
  71: ["🌨️", "Neve debole"], 73: ["🌨️", "Neve"], 75: ["❄️", "Neve intensa"], 77: ["❄️", "Neve granulare"],
  80: ["🌦️", "Rovesci deboli"], 81: ["🌧️", "Rovesci"], 82: ["⛈️", "Rovesci forti"],
  85: ["🌨️", "Rovesci di neve"], 86: ["❄️", "Rovesci di neve forti"],
  95: ["⛈️", "Temporale"], 96: ["⛈️", "Temporale con grandine"], 99: ["⛈️", "Temporale forte"]
};

function weatherInfo(code) {
  return WEATHER_CODES[code] || ["🌡️", "—"];
}

function degToCompass(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function windStatus(kmh) {
  if (kmh == null || Number.isNaN(kmh)) return { level: "good", label: "—" };
  if (kmh < 20) return { level: "good", label: "Brezza leggera" };
  if (kmh < 40) return { level: "warning", label: "Vento moderato" };
  if (kmh < 60) return { level: "serious", label: "Vento forte" };
  return { level: "critical", label: "Bora sostenuta" };
}

function fmtTime(date) {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function fmtHour(date) {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit" }).replace(/[^0-9]/g, "") + "h";
}

// --- Open-Meteo ---------------------------------------------------------

async function fetchOpenMeteo() {
  const res = await fetch(OPEN_METEO_URL);
  if (!res.ok) throw new Error("Open-Meteo HTTP " + res.status);
  return res.json();
}

function todaysPeakFromHourly(data) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const times = data.hourly.time;
  const gusts = data.hourly.windgusts_10m;
  let peak = null, peakTime = null;
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(todayStr)) continue;
    const t = new Date(times[i]);
    if (t > now) continue;
    if (peak === null || gusts[i] > peak) { peak = gusts[i]; peakTime = t; }
  }
  return { value: peak, time: peakTime };
}

function nextHoursFromHourly(data, count = 8, stepHours = 3) {
  const now = new Date();
  const times = data.hourly.time.map((t) => new Date(t));
  let startIdx = times.findIndex((t) => t >= now);
  if (startIdx < 0) startIdx = 0;
  const items = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i * stepHours;
    if (idx >= times.length) break;
    items.push({
      time: times[idx],
      temp: data.hourly.temperature_2m[idx],
      code: data.hourly.weathercode[idx],
      wind: data.hourly.windspeed_10m[idx],
      gust: data.hourly.windgusts_10m[idx]
    });
  }
  return items;
}

// --- Open Data FVG (rilevamento euristico dello schema) -----------------

function detectField(sampleRow, patterns) {
  const keys = Object.keys(sampleRow);
  for (const pattern of patterns) {
    const hit = keys.find((k) => pattern.test(k.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

async function fetchFvgStations() {
  const probeRes = await fetch(`${FVG_SOCRATA_BASE}?$limit=5`);
  if (!probeRes.ok) throw new Error("Open Data FVG HTTP " + probeRes.status);
  const probe = await probeRes.json();
  if (!Array.isArray(probe) || probe.length === 0) throw new Error("Dataset vuoto");

  const sample = probe[0];
  const fields = {
    station: detectField(sample, [/stazion/, /nome/, /punto/, /site/]),
    time: detectField(sample, [/data_ora/, /datetime/, /timestamp/, /^data$/, /^ora$/, /time/]),
    speed: detectField(sample, [/veloc.*vento/, /vento.*med/, /wind.*speed/, /vel_vento/]),
    gust: detectField(sample, [/raffic/, /gust/, /vento.*max/]),
    dir: detectField(sample, [/direz/, /wind.*dir/]),
    temp: detectField(sample, [/temperat/])
  };
  if (!fields.station || !fields.time || !(fields.speed || fields.gust)) {
    throw new Error("Schema del dataset non riconosciuto");
  }

  const order = encodeURIComponent(`${fields.time} DESC`);
  const dataRes = await fetch(`${FVG_SOCRATA_BASE}?$order=${order}&$limit=1500`);
  if (!dataRes.ok) throw new Error("Open Data FVG HTTP " + dataRes.status);
  const rows = await dataRes.json();

  const isTriesteRow = (row) => {
    const name = (row[fields.station] || "").toString().toLowerCase();
    return TRIESTE_STATION_KEYWORDS.some((kw) => name.includes(kw));
  };

  const byStation = new Map();
  for (const row of rows) {
    if (!isTriesteRow(row)) continue;
    const name = row[fields.station];
    if (!byStation.has(name)) byStation.set(name, []);
    byStation.get(name).push(row);
  }
  if (byStation.size === 0) throw new Error("Nessuna stazione di Trieste trovata nel dataset");

  const toNumber = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

  // Il portale Open Data non documenta l'unità di misura del vento in modo esplicito
  // nel nome del campo nella maggior parte dei casi. Le reti ARPA/regionali pubblicano
  // di norma il dato grezzo dell'anemometro in m/s (standard meteorologico), quindi è
  // l'assunzione di default qui; se il nome del campo indica esplicitamente km/h non si
  // converte. Se dopo il deploy risultasse sbagliato, FVG_ASSUME_MS va invertito.
  const FVG_ASSUME_MS = true;
  const fieldSaysKmh = (fieldName) => /kmh|km_h|kmorari|km\/h/.test((fieldName || "").toLowerCase());
  const speedIsKmh = fields.speed && fieldSaysKmh(fields.speed);
  const gustIsKmh = fields.gust && fieldSaysKmh(fields.gust);
  const toKmh = (v, alreadyKmh) => (v === null ? null : (alreadyKmh || !FVG_ASSUME_MS ? v : v * 3.6));

  const stations = [];
  for (const [name, stationRows] of byStation) {
    stationRows.sort((a, b) => new Date(b[fields.time]) - new Date(a[fields.time]));
    const latest = stationRows[0];
    const speed = toKmh(toNumber(fields.speed ? latest[fields.speed] : null), speedIsKmh);
    const gust = toKmh(toNumber(fields.gust ? latest[fields.gust] : null), gustIsKmh);

    const todayStr = new Date().toISOString().slice(0, 10);
    let peak = null, peakTime = null;
    for (const row of stationRows) {
      const ts = row[fields.time];
      if (!ts || !ts.startsWith(todayStr)) continue;
      const rawG = toNumber(fields.gust ? row[fields.gust] : row[fields.speed]);
      if (rawG === null) continue;
      const g = toKmh(rawG, fields.gust ? gustIsKmh : speedIsKmh);
      if (peak === null || g > peak) { peak = g; peakTime = new Date(ts); }
    }

    stations.push({
      name,
      speed, gust,
      dir: fields.dir ? toNumber(latest[fields.dir]) : null,
      temp: fields.temp ? toNumber(latest[fields.temp]) : null,
      updated: new Date(latest[fields.time]),
      peak, peakTime
    });
  }
  return stations;
}

// --- Rendering ------------------------------------------------------------

function renderHero({ speedKmh, gustKmh, dirDeg, temp, code, source, updated }) {
  document.getElementById("hero-speed").textContent = speedKmh != null ? Math.round(speedKmh) : "—";
  document.getElementById("hero-gust").textContent = `Raffica: ${gustKmh != null ? Math.round(gustKmh) : "—"} km/h`;

  const status = windStatus(speedKmh);
  const badge = document.getElementById("hero-status");
  badge.textContent = status.label;
  badge.className = "badge " + status.level;

  const arrow = document.getElementById("compass-arrow");
  const label = document.getElementById("compass-label");
  if (dirDeg != null) {
    arrow.style.transform = `rotate(${dirDeg}deg)`;
    label.textContent = degToCompass(dirDeg);
  } else {
    label.textContent = "—";
  }

  const [icon, desc] = weatherInfo(code);
  document.getElementById("weather-icon").textContent = icon;
  document.getElementById("weather-desc").textContent = desc;
  document.getElementById("weather-temp").textContent = temp != null ? `${Math.round(temp)}°C` : "—°C";

  document.getElementById("hero-source").textContent = `Fonte: ${source} · aggiornato alle ${fmtTime(updated)}`;
}

function renderPeak({ value, time, station }) {
  document.getElementById("peak-speed").textContent = value != null ? Math.round(value) : "—";
  document.getElementById("peak-time").textContent = time ? `alle ${fmtTime(time)}` : "alle —";
  document.getElementById("peak-station").textContent = station || "";
}

function renderForecast(items) {
  const scroll = document.getElementById("forecast-scroll");
  scroll.innerHTML = "";
  items.forEach((it) => {
    const [icon] = weatherInfo(it.code);
    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <div class="fi-hour">${fmtHour(it.time)}</div>
      <div class="fi-icon">${icon}</div>
      <div class="fi-temp">${Math.round(it.temp)}°C</div>
      <div class="fi-wind">${Math.round(it.wind)} km/h</div>
    `;
    scroll.appendChild(div);
  });

  renderWindChart(items);
}

function renderWindChart(items) {
  const svg = document.getElementById("wind-chart");
  const w = 320, h = 90, padBottom = 14, barGap = 4;
  const barW = (w / items.length) - barGap;
  const maxWind = Math.max(...items.map((i) => i.wind), 20);
  const scaleY = (h - padBottom - 6) / maxWind;

  let content = `<line class="wc-baseline" x1="0" y1="${h - padBottom}" x2="${w}" y2="${h - padBottom}"/>`;
  items.forEach((it, i) => {
    const barH = it.wind * scaleY;
    const x = i * (barW + barGap);
    const y = h - padBottom - barH;
    const cls = it.wind >= 40 ? "wc-bar hot" : "wc-bar";
    content += `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3"/>`;
    content += `<text class="wc-label" x="${(x + barW / 2).toFixed(1)}" y="${h - 3}" text-anchor="middle">${fmtHour(it.time)}</text>`;
  });
  svg.innerHTML = content;
}

function renderStations(stations, note) {
  const grid = document.getElementById("station-grid");
  const noteEl = document.getElementById("stations-note");
  grid.innerHTML = "";

  if (!stations || stations.length === 0) {
    grid.innerHTML = '<p class="loading">Dati delle stazioni cittadine non disponibili al momento.</p>';
    noteEl.hidden = false;
    noteEl.textContent = note || "";
    return;
  }

  stations.forEach((s) => {
    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
      <div class="station-name">${s.name}</div>
      <div class="station-speed">${s.speed != null ? Math.round(s.speed) : "—"} <small>km/h</small></div>
      <div class="station-detail">Raffica: ${s.gust != null ? Math.round(s.gust) : "—"} km/h${s.dir != null ? " · " + degToCompass(s.dir) : ""}</div>
      <div class="station-detail">Picco oggi: ${s.peak != null ? Math.round(s.peak) + " km/h" : "—"}${s.peakTime ? " alle " + fmtTime(s.peakTime) : ""}</div>
      <div class="station-detail">Agg. ${fmtTime(s.updated)}</div>
    `;
    grid.appendChild(card);
  });
  noteEl.hidden = true;
}

// --- Orchestrazione ---------------------------------------------------------

async function refresh() {
  let meteo = null;
  try {
    meteo = await fetchOpenMeteo();
  } catch (e) {
    console.error("Open-Meteo non disponibile:", e);
  }

  let stations = null, stationsError = null;
  try {
    stations = await fetchFvgStations();
  } catch (e) {
    stationsError = e.message;
    console.error("Open Data FVG non disponibile:", e);
  }

  // Stazione principale per la card "hero": la prima disponibile con dati
  // delle stazioni cittadine, altrimenti fallback su Open-Meteo per Trieste centro.
  const primary = stations && stations.length ? stations[0] : null;

  if (primary) {
    renderHero({
      speedKmh: primary.speed,
      gustKmh: primary.gust,
      dirDeg: primary.dir,
      temp: meteo ? meteo.current_weather.temperature : primary.temp,
      code: meteo ? meteo.current_weather.weathercode : null,
      source: `stazione ${primary.name} (Open Data FVG)`,
      updated: primary.updated
    });
  } else if (meteo) {
    renderHero({
      speedKmh: meteo.current_weather.windspeed,
      gustKmh: nextHoursFromHourly(meteo, 1, 0)[0] ? nextHoursFromHourly(meteo, 1, 0)[0].gust : null,
      dirDeg: meteo.current_weather.winddirection,
      temp: meteo.current_weather.temperature,
      code: meteo.current_weather.weathercode,
      source: "Open-Meteo (dato generale Trieste)",
      updated: new Date(meteo.current_weather.time)
    });
  }

  if (primary && primary.peak != null) {
    renderPeak({ value: primary.peak, time: primary.peakTime, station: primary.name });
  } else if (meteo) {
    const peak = todaysPeakFromHourly(meteo);
    renderPeak({ value: peak.value, time: peak.time, station: "stima Open-Meteo, Trieste" });
  }

  if (meteo) {
    renderForecast(nextHoursFromHourly(meteo, 8, 3));
  }

  renderStations(
    stations,
    stationsError ? "Impossibile leggere in questo momento le stazioni cittadine dal portale Open Data FVG; mostriamo comunque il dato meteo generale qui sopra." : ""
  );

  document.getElementById("last-updated").textContent =
    "Ultimo aggiornamento: " + fmtTime(new Date());
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const stored = (() => { try { return localStorage.getItem("tv-theme"); } catch { return null; } })();
  if (stored) document.documentElement.setAttribute("data-theme", stored);

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("tv-theme", next); } catch { /* ignora: storage non disponibile */ }
  });
}

setupThemeToggle();
refresh();
setInterval(refresh, 10 * 60 * 1000);
