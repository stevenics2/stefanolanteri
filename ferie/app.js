(function () {
  "use strict";

  const PALETTE = [
    "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
    "#42d4f4", "#f032e6", "#9a9a00", "#469990", "#dcbeff",
    "#9a6324", "#800000", "#000075", "#a9a9a9",
  ];

  const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const WEEKDAYS_MON = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  const OPERATOR_KEY = "ferie.operatorId.v1";

  const els = {
    screenConfigError: document.getElementById("screenConfigError"),
    screenLogin: document.getElementById("screenLogin"),
    screenApp: document.getElementById("screenApp"),

    loginStatus: document.getElementById("loginStatus"),
    loginTeamFilter: document.getElementById("loginTeamFilter"),
    operatorSelect: document.getElementById("operatorSelect"),
    btnSelectOperator: document.getElementById("btnSelectOperator"),
    btnShowNewOperator: document.getElementById("btnShowNewOperator"),
    newOperatorForm: document.getElementById("newOperatorForm"),
    newOperatorName: document.getElementById("newOperatorName"),
    newOperatorTeam: document.getElementById("newOperatorTeam"),
    btnCreateOperator: document.getElementById("btnCreateOperator"),

    btnMenu: document.getElementById("btnMenu"),
    currentOperatorBadge: document.getElementById("currentOperatorBadge"),
    teamTabs: Array.from(document.querySelectorAll(".team-tab")),

    btnPrevMonth: document.getElementById("btnPrevMonth"),
    btnNextMonth: document.getElementById("btnNextMonth"),
    btnTodayMonth: document.getElementById("btnTodayMonth"),
    monthLabel: document.getElementById("monthLabel"),

    legendBar: document.getElementById("legendBar"),
    calendarGrid: document.getElementById("calendarGrid"),

    vacationStart: document.getElementById("vacationStart"),
    vacationEnd: document.getElementById("vacationEnd"),
    btnAddVacation: document.getElementById("btnAddVacation"),
    addVacationStatus: document.getElementById("addVacationStatus"),
    myVacationsList: document.getElementById("myVacationsList"),

    sidebar: document.getElementById("sidebar"),
    btnCloseSidebar: document.getElementById("btnCloseSidebar"),
    sidebarOperatorInfo: document.getElementById("sidebarOperatorInfo"),
    btnChangeOperator: document.getElementById("btnChangeOperator"),

    fileDrop: document.getElementById("fileDrop"),
    fileInput: document.getElementById("fileInput"),
    fileDropLabel: document.getElementById("fileDropLabel"),
    mappingSection: document.getElementById("mappingSection"),
    colDate: document.getElementById("colDate"),
    colOperatore: document.getElementById("colOperatore"),
    colTurno: document.getElementById("colTurno"),
    colOrario: document.getElementById("colOrario"),
    colDesc: document.getElementById("colDesc"),
    restCodes: document.getElementById("restCodes"),
    btnUploadShifts: document.getElementById("btnUploadShifts"),
    uploadStatus: document.getElementById("uploadStatus"),

    modalOverlay: document.getElementById("modalOverlay"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    modalFooter: document.getElementById("modalFooter"),
    btnCloseModal: document.getElementById("btnCloseModal"),
  };

  const SCREENS = [els.screenConfigError, els.screenLogin, els.screenApp];
  function show(el) {
    SCREENS.forEach((s) => s.classList.add("hidden"));
    el.classList.remove("hidden");
  }

  // ---------- Date helpers ----------
  function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function parseISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function enumerateDaysISO(startISO, endISO) {
    const out = [];
    let d = parseISO(startISO);
    const end = parseISO(endISO);
    while (d <= end) {
      out.push(isoDate(d));
      d = addDays(d, 1);
    }
    return out;
  }
  function computeGridRange(viewMonth) {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = (first.getDay() + 6) % 7; // 0 = lunedì
    const gridStart = addDays(first, -startOffset);
    const endOffset = (7 - (((last.getDay() + 6) % 7) + 1)) % 7;
    const gridEnd = addDays(last, endOffset);
    return { first, last, gridStart, gridEnd };
  }
  function slugify(str) {
    return String(str)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function fmtDateIt(iso) {
    const d = parseISO(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // ---------- State ----------
  let db = null, auth = null;
  let operators = [];
  let vacations = [];
  let shiftDays = {};
  let shiftsUnsub = null;
  let currentOperator = null;
  let activeTeam = "E";
  let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let sheetRows = [], headers = [];
  let didAutoLoginCheck = false;

  init();

  function init() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === "INSERISCI_API_KEY") {
      show(els.screenConfigError);
      return;
    }
    try {
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
    } catch (err) {
      showConfigError(err.message);
      return;
    }

    show(els.screenLogin);
    els.loginStatus.textContent = "Connessione in corso...";

    auth.signInAnonymously().catch((err) => {
      els.loginStatus.textContent = "";
      showConfigError("Errore di autenticazione Firebase: " + err.message);
    });

    listenOperators();
    listenVacations();
    bindEvents();
  }

  function showConfigError(message) {
    const p = document.createElement("p");
    p.textContent = message;
    p.style.color = "#a33";
    els.screenConfigError.querySelector(".center-box").appendChild(p);
    show(els.screenConfigError);
  }

  // ---------- Firestore listeners ----------
  function listenOperators() {
    db.collection("operators").onSnapshot(
      (snap) => {
        operators = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        els.loginStatus.textContent = "";
        renderLoginSelect();
        renderLegend();
        renderCalendar();
        renderMyVacations();
        if (!didAutoLoginCheck) {
          didAutoLoginCheck = true;
          tryAutoLogin();
        }
      },
      (err) => showConfigError("Errore lettura operatori: " + err.message)
    );
  }

  function listenVacations() {
    db.collection("vacations").onSnapshot(
      (snap) => {
        vacations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderCalendar();
        renderMyVacations();
      },
      (err) => showConfigError("Errore lettura ferie: " + err.message)
    );
  }

  function listenShiftsForGrid() {
    if (shiftsUnsub) { shiftsUnsub(); shiftsUnsub = null; }
    const { gridStart, gridEnd } = computeGridRange(viewMonth);
    const startISO = isoDate(gridStart);
    const endISO = isoDate(gridEnd);
    shiftsUnsub = db
      .collection("shiftDays")
      .where("date", ">=", startISO)
      .where("date", "<=", endISO)
      .onSnapshot(
        (snap) => {
          shiftDays = {};
          snap.docs.forEach((d) => { shiftDays[d.id] = d.data(); });
          renderCalendar();
        },
        (err) => showConfigError("Errore lettura turni: " + err.message)
      );
  }

  // ---------- Login / operator selection ----------
  function tryAutoLogin() {
    let savedId = null;
    try { savedId = localStorage.getItem(OPERATOR_KEY); } catch (e) {}
    if (savedId) {
      const found = operators.find((o) => o.id === savedId);
      if (found) { selectOperator(found.id); return; }
    }
    show(els.screenLogin);
  }

  function renderLoginSelect() {
    const team = els.loginTeamFilter.value;
    const sel = els.operatorSelect;
    const prev = sel.value;
    sel.innerHTML = '<option value="">— seleziona —</option>';
    operators
      .filter((o) => o.team === team)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((o) => sel.add(new Option(o.name, o.id)));
    if (prev && operators.some((o) => o.id === prev)) sel.value = prev;
    els.btnSelectOperator.disabled = !sel.value;
  }

  function selectOperator(id) {
    const op = operators.find((o) => o.id === id);
    if (!op) return;
    currentOperator = op;
    try { localStorage.setItem(OPERATOR_KEY, id); } catch (e) {}
    els.newOperatorForm.classList.add("hidden");
    els.newOperatorName.value = "";
    activeTeam = op.team;
    setActiveTeamTab(activeTeam);
    els.currentOperatorBadge.textContent = op.name;
    els.currentOperatorBadge.style.background = op.color;
    els.sidebarOperatorInfo.textContent = `${op.name} — Squadra ${op.team}`;
    show(els.screenApp);
    listenShiftsForGrid();
    renderCalendar();
    renderLegend();
    renderMyVacations();
  }

  function nextColor() {
    const used = new Set(operators.map((o) => o.color));
    for (const c of PALETTE) if (!used.has(c)) return c;
    return PALETTE[operators.length % PALETTE.length];
  }

  // ---------- Team tabs ----------
  function setActiveTeamTab(team) {
    activeTeam = team;
    els.teamTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.team === team));
    renderLegend();
    renderCalendar();
  }

  // ---------- Calendar rendering ----------
  function renderLegend() {
    els.legendBar.innerHTML = "";
    operators
      .filter((o) => o.team === activeTeam)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((o) => {
        const chip = document.createElement("span");
        chip.className = "legend-chip";
        chip.innerHTML = `<span class="dot" style="background:${o.color}"></span>${o.name}`;
        els.legendBar.appendChild(chip);
      });
  }

  function renderCalendar() {
    els.monthLabel.textContent = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
    const { first, gridStart, gridEnd } = computeGridRange(viewMonth);
    const grid = els.calendarGrid;
    grid.innerHTML = "";

    WEEKDAYS_MON.forEach((w) => {
      const h = document.createElement("div");
      h.className = "cal-weekday";
      h.textContent = w;
      grid.appendChild(h);
    });

    const today = isoDate(new Date());
    const teamOperators = operators.filter((o) => o.team === activeTeam);

    let d = new Date(gridStart);
    while (d <= gridEnd) {
      const dateISO = isoDate(d);
      const inMonth = d.getMonth() === first.getMonth();
      const cell = document.createElement("div");
      cell.className = "cal-cell" + (inMonth ? "" : " out-month") + (dateISO === today ? " is-today" : "");

      const num = document.createElement("div");
      num.className = "cal-daynum";
      num.textContent = d.getDate();
      cell.appendChild(num);

      const dayVacations = vacations.filter(
        (v) => v.team === activeTeam && dateISO >= v.start && dateISO <= v.end
      );
      if (dayVacations.length) {
        const dots = document.createElement("div");
        dots.className = "cal-dots";
        dayVacations.forEach((v) => {
          const dot = document.createElement("span");
          dot.className = "cal-dot";
          dot.style.background = v.color || "#999";
          dot.title = v.operatorName;
          dots.appendChild(dot);
        });
        cell.appendChild(dots);
      }

      const dayShift = shiftDays[dateISO];
      if (dayShift && dayShift.operators) {
        const relevant = teamOperators.filter((o) => dayShift.operators[o.id]);
        if (relevant.length) {
          const badge = document.createElement("div");
          badge.className = "cal-shift-badge";
          badge.textContent = `${relevant.length} in turno`;
          cell.appendChild(badge);
        }
      }

      cell.addEventListener("click", () => openDayDetail(dateISO));
      grid.appendChild(cell);
      d = addDays(d, 1);
    }
  }

  // ---------- Day detail modal ----------
  function openDayDetail(dateISO) {
    const teamOperators = operators
      .filter((o) => o.team === activeTeam)
      .sort((a, b) => a.name.localeCompare(b.name));
    const dayShift = shiftDays[dateISO] && shiftDays[dateISO].operators ? shiftDays[dateISO].operators : {};

    let bodyHTML = "";
    if (!teamOperators.length) {
      bodyHTML = "<p>Nessun operatore in questa squadra.</p>";
    } else {
      bodyHTML = '<ul class="day-detail-list">';
      teamOperators.forEach((o) => {
        const onVacation = vacations.some(
          (v) => v.operatorId === o.id && dateISO >= v.start && dateISO <= v.end
        );
        const shift = dayShift[o.id];
        let statusHTML;
        if (onVacation) {
          statusHTML = '<span class="tag tag-vacation">Ferie</span>';
        } else if (shift) {
          statusHTML = shift.isRest
            ? '<span class="tag tag-rest">Riposo' + (shift.turno ? " · " + esc(shift.turno) : "") + "</span>"
            : `<span class="tag tag-shift">${esc(shift.turno || "-")}${shift.orario ? " (" + esc(shift.orario) + ")" : ""}</span>`;
        } else {
          statusHTML = '<span class="tag tag-none">-</span>';
        }
        bodyHTML += `<li><span class="dot" style="background:${o.color}"></span>${esc(o.name)} ${statusHTML}</li>`;
      });
      bodyHTML += "</ul>";
    }

    openModal(fmtDateIt(dateISO) + ` — Squadra ${activeTeam}`, bodyHTML, []);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Add / delete vacation ----------
  function checkConflict(team, startISO, endISO, excludeOperatorId) {
    const days = enumerateDaysISO(startISO, endISO);
    const byDay = {};
    vacations
      .filter((v) => v.team === team && v.operatorId !== excludeOperatorId)
      .forEach((v) => {
        days.forEach((day) => {
          if (day >= v.start && day <= v.end) {
            byDay[day] = byDay[day] || new Set();
            byDay[day].add(v.operatorName);
          }
        });
      });
    const blockedDays = days.filter((day) => byDay[day] && byDay[day].size >= 2);
    return { blockedDays, byDay };
  }

  function openConflictModal(conflict) {
    let bodyHTML = "<p>Non è possibile salvare questo periodo: per squadra sono ammesse al massimo 2 persone contemporaneamente in ferie, e nei giorni seguenti sarebbero già 2 (o più) presenti:</p><ul>";
    conflict.blockedDays.forEach((day) => {
      const names = Array.from(conflict.byDay[day]).join(", ");
      bodyHTML += `<li><strong>${fmtDateIt(day)}</strong>: ${esc(names)}</li>`;
    });
    bodyHTML += "</ul>";
    openModal("Periodo non disponibile", bodyHTML, [
      { label: "Chiudi", className: "primary-btn", onClick: closeModal },
    ]);
  }

  function renderMyVacations() {
    els.myVacationsList.innerHTML = "";
    if (!currentOperator) return;
    const mine = vacations
      .filter((v) => v.operatorId === currentOperator.id)
      .sort((a, b) => a.start.localeCompare(b.start));
    if (!mine.length) {
      els.myVacationsList.innerHTML = '<p class="hint">Nessun periodo salvato.</p>';
      return;
    }
    mine.forEach((v) => {
      const row = document.createElement("div");
      row.className = "my-vacation-row";
      row.innerHTML = `<span>${fmtDateIt(v.start)} → ${fmtDateIt(v.end)}</span>`;
      const btn = document.createElement("button");
      btn.className = "link-btn danger";
      btn.textContent = "Elimina";
      btn.addEventListener("click", () => confirmDeleteVacation(v));
      row.appendChild(btn);
      els.myVacationsList.appendChild(row);
    });
  }

  function confirmDeleteVacation(v) {
    openModal(
      "Eliminare il periodo?",
      `<p>${fmtDateIt(v.start)} → ${fmtDateIt(v.end)}</p>`,
      [
        { label: "Annulla", className: "link-btn", onClick: closeModal },
        {
          label: "Elimina",
          className: "primary-btn danger",
          onClick: () => {
            db.collection("vacations").doc(v.id).delete();
            closeModal();
          },
        },
      ]
    );
  }

  // ---------- Modal ----------
  function openModal(title, bodyHTML, buttons) {
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = bodyHTML;
    els.modalFooter.innerHTML = "";
    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = b.className || "link-btn";
      btn.textContent = b.label;
      btn.addEventListener("click", b.onClick);
      els.modalFooter.appendChild(btn);
    });
    els.modalOverlay.classList.remove("hidden");
  }
  function closeModal() {
    els.modalOverlay.classList.add("hidden");
  }

  // ---------- xlsx upload ----------
  function handleFile(file) {
    els.uploadStatus.textContent = "";
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const dataSheetName = workbook.SheetNames.find((n) => !/legend/i.test(n)) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[dataSheetName];
        sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
        if (!sheetRows.length) {
          els.uploadStatus.textContent = "Il file sembra vuoto.";
          return;
        }
        headers = sheetRows[0].map((h, i) => (h === "" || h == null ? `Colonna ${i + 1}` : String(h)));

        const legendSheetName = workbook.SheetNames.find((n) => /legend/i.test(n));
        const detectedRestCodes = legendSheetName ? extractRestCodesFromLegend(workbook.Sheets[legendSheetName]) : null;

        populateMappingSelects(detectedRestCodes);
        els.mappingSection.classList.remove("hidden");
        els.fileDropLabel.textContent = `File: ${file.name}`;
      } catch (err) {
        console.error(err);
        els.uploadStatus.textContent = "Errore nella lettura del file. Assicurati che sia un .xls/.xlsx/.csv valido.";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function extractRestCodesFromLegend(legendSheet) {
    const rows = XLSX.utils.sheet_to_json(legendSheet, { header: 1, raw: true, defval: "" });
    const codes = [];
    for (const row of rows) {
      const code = row[0] != null ? String(row[0]).trim() : "";
      const meaning = row[1] != null ? String(row[1]).trim().toLowerCase() : "";
      if (code && meaning.includes("riposo")) codes.push(code.toUpperCase());
    }
    return codes.length ? codes : null;
  }

  function populateMappingSelects(detectedRestCodes) {
    const dataRows = sheetRows.slice(1);
    const guesses = guessColumns(headers, dataRows);

    [els.colDate, els.colOperatore, els.colTurno, els.colOrario, els.colDesc].forEach((sel) => (sel.innerHTML = ""));
    headers.forEach((h, i) => {
      els.colDate.add(new Option(h, i));
      els.colOperatore.add(new Option(h, i));
      els.colTurno.add(new Option(h, i));
      els.colOrario.add(new Option(h, i));
      els.colDesc.add(new Option(h, i));
    });
    els.colOrario.add(new Option("— nessuna —", -1));
    els.colDesc.add(new Option("— nessuna —", -1));

    els.colDate.value = guesses.dateIdx;
    els.colOperatore.value = guesses.operatoreIdx >= 0 ? guesses.operatoreIdx : 0;
    els.colTurno.value = guesses.turnoIdx;
    els.colOrario.value = guesses.orarioIdx;
    els.colDesc.value = guesses.descIdx;

    if (detectedRestCodes) els.restCodes.value = detectedRestCodes.join(",");
  }

  function guessColumns(headers, dataRows) {
    let dateIdx = 0, bestDateCount = -1;
    for (let c = 0; c < headers.length; c++) {
      let count = 0;
      for (const row of dataRows) if (row[c] instanceof Date) count++;
      if (count > bestDateCount) { bestDateCount = count; dateIdx = c; }
    }

    const findByKeyword = (keywords, exclude) => {
      for (let c = 0; c < headers.length; c++) {
        if (exclude.includes(c)) continue;
        const h = headers[c].toLowerCase();
        if (keywords.some((k) => h.includes(k))) return c;
      }
      return -1;
    };

    let operatoreIdx = findByKeyword(["operatore", "nome", "dipendente", "risorsa", "cognome"], [dateIdx]);
    let turnoIdx = findByKeyword(["turno", "shift"], operatoreIdx >= 0 ? [dateIdx, operatoreIdx] : [dateIdx]);
    if (turnoIdx === -1) turnoIdx = findByKeyword(["codice"], [dateIdx]);
    if (turnoIdx === -1) turnoIdx = headers.findIndex((_, i) => i !== dateIdx && i !== operatoreIdx);
    if (turnoIdx === -1) turnoIdx = dateIdx;

    const usedSoFar = [dateIdx, turnoIdx].concat(operatoreIdx >= 0 ? [operatoreIdx] : []);
    let orarioIdx = findByKeyword(["orario", "fascia"], usedSoFar);

    const usedForDesc = orarioIdx === -1 ? usedSoFar : usedSoFar.concat([orarioIdx]);
    let descIdx = findByKeyword(["descr", "reparto", "note", "attivit", "servizio", "unit"], usedForDesc);
    if (descIdx === -1) descIdx = -1;

    return { dateIdx, operatoreIdx, turnoIdx, orarioIdx, descIdx };
  }

  function buildAndUploadShifts() {
    const dateIdx = Number(els.colDate.value);
    const operatoreIdx = Number(els.colOperatore.value);
    const turnoIdx = Number(els.colTurno.value);
    const orarioIdx = Number(els.colOrario.value);
    const descIdx = Number(els.colDesc.value);
    const restCodes = els.restCodes.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

    const byDate = {}; // dateISO -> { [operatorSlug]: {...} }
    const unmatchedNames = new Set();
    const dataRows = sheetRows.slice(1);

    for (const row of dataRows) {
      const rawDate = row[dateIdx];
      let date = null;
      if (rawDate instanceof Date) date = rawDate;
      else if (typeof rawDate === "string" && rawDate.trim()) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) date = parsed;
      }
      if (!date) continue;

      const operatorNameRaw = row[operatoreIdx] != null ? String(row[operatoreIdx]).trim() : "";
      if (!operatorNameRaw) continue;
      const slug = slugify(operatorNameRaw);
      const matched = operators.find((o) => o.id === slug || slugify(o.name) === slug);
      if (!matched) unmatchedNames.add(operatorNameRaw);

      const turno = row[turnoIdx] != null ? String(row[turnoIdx]).trim() : "";
      const orario = orarioIdx >= 0 && row[orarioIdx] != null ? String(row[orarioIdx]).trim() : "";
      const desc = descIdx >= 0 && row[descIdx] != null ? String(row[descIdx]).trim() : "";
      const isRest = restCodes.includes(turno.toUpperCase());

      const dateISO = isoDate(date);
      byDate[dateISO] = byDate[dateISO] || {};
      byDate[dateISO][matched ? matched.id : slug] = {
        operatorName: operatorNameRaw,
        turno,
        orario,
        desc,
        isRest,
      };
    }

    const dates = Object.keys(byDate);
    if (!dates.length) {
      els.uploadStatus.textContent = "Nessuna riga valida trovata (controlla le colonne selezionate).";
      return;
    }

    els.uploadStatus.textContent = "Caricamento in corso...";
    const CHUNK = 400;
    let i = 0;
    function nextChunk() {
      const batch = db.batch();
      const slice = dates.slice(i, i + CHUNK);
      slice.forEach((dateISO) => {
        const ref = db.collection("shiftDays").doc(dateISO);
        batch.set(ref, { date: dateISO, operators: byDate[dateISO] });
      });
      batch.commit().then(() => {
        i += CHUNK;
        if (i < dates.length) nextChunk();
        else {
          const warn = unmatchedNames.size
            ? ` (${unmatchedNames.size} nomi non riconosciuti: ${Array.from(unmatchedNames).slice(0, 5).join(", ")}${unmatchedNames.size > 5 ? "…" : ""})`
            : "";
          els.uploadStatus.textContent = `Caricati turni per ${dates.length} giorni.${warn}`;
        }
      }).catch((err) => {
        els.uploadStatus.textContent = "Errore durante il caricamento: " + err.message;
      });
    }
    nextChunk();
  }

  // ---------- Events ----------
  function bindEvents() {
    els.loginTeamFilter.addEventListener("change", renderLoginSelect);
    els.operatorSelect.addEventListener("change", () => {
      els.btnSelectOperator.disabled = !els.operatorSelect.value;
    });
    els.btnSelectOperator.addEventListener("click", () => {
      if (els.operatorSelect.value) selectOperator(els.operatorSelect.value);
    });
    els.btnShowNewOperator.addEventListener("click", () => {
      els.newOperatorForm.classList.toggle("hidden");
    });
    els.btnCreateOperator.addEventListener("click", () => {
      const name = els.newOperatorName.value.trim();
      const team = els.newOperatorTeam.value;
      if (!name) { els.loginStatus.textContent = "Inserisci un nome."; return; }
      const slug = slugify(name);
      if (!slug) { els.loginStatus.textContent = "Nome non valido."; return; }
      const existing = operators.find((o) => o.id === slug);
      if (existing) { selectOperator(existing.id); return; }
      const color = nextColor();
      db.collection("operators").doc(slug).set({
        name, team, color,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).then(() => {
        if (!operators.some((o) => o.id === slug)) operators.push({ id: slug, name, team, color });
        selectOperator(slug);
      }).catch((err) => {
        els.loginStatus.textContent = "Errore creazione operatore: " + err.message;
      });
    });

    els.btnMenu.addEventListener("click", () => els.sidebar.classList.remove("hidden"));
    els.btnCloseSidebar.addEventListener("click", () => els.sidebar.classList.add("hidden"));
    els.btnChangeOperator.addEventListener("click", () => {
      try { localStorage.removeItem(OPERATOR_KEY); } catch (e) {}
      currentOperator = null;
      els.sidebar.classList.add("hidden");
      els.newOperatorForm.classList.add("hidden");
      els.newOperatorName.value = "";
      els.loginStatus.textContent = "";
      show(els.screenLogin);
      renderLoginSelect();
    });

    els.teamTabs.forEach((btn) => {
      btn.addEventListener("click", () => setActiveTeamTab(btn.dataset.team));
    });

    els.btnPrevMonth.addEventListener("click", () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      listenShiftsForGrid();
      renderCalendar();
    });
    els.btnNextMonth.addEventListener("click", () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      listenShiftsForGrid();
      renderCalendar();
    });
    els.btnTodayMonth.addEventListener("click", () => {
      const now = new Date();
      viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      listenShiftsForGrid();
      renderCalendar();
    });

    els.btnAddVacation.addEventListener("click", () => {
      if (!currentOperator) return;
      const start = els.vacationStart.value;
      const end = els.vacationEnd.value;
      els.addVacationStatus.textContent = "";
      if (!start || !end) { els.addVacationStatus.textContent = "Seleziona entrambe le date."; return; }
      if (start > end) { els.addVacationStatus.textContent = "La data di inizio deve precedere quella di fine."; return; }

      const conflict = checkConflict(currentOperator.team, start, end, currentOperator.id);
      if (conflict.blockedDays.length) {
        openConflictModal(conflict);
        return;
      }

      db.collection("vacations").add({
        operatorId: currentOperator.id,
        operatorName: currentOperator.name,
        team: currentOperator.team,
        color: currentOperator.color,
        start, end,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).then(() => {
        els.addVacationStatus.textContent = "Periodo salvato.";
        els.vacationStart.value = "";
        els.vacationEnd.value = "";
      }).catch((err) => {
        els.addVacationStatus.textContent = "Errore: " + err.message;
      });
    });

    els.fileDrop.addEventListener("dragover", (e) => { e.preventDefault(); els.fileDrop.classList.add("dragover"); });
    els.fileDrop.addEventListener("dragleave", () => els.fileDrop.classList.remove("dragover"));
    els.fileDrop.addEventListener("drop", (e) => {
      e.preventDefault();
      els.fileDrop.classList.remove("dragover");
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    els.fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });
    els.btnUploadShifts.addEventListener("click", buildAndUploadShifts);

    els.btnCloseModal.addEventListener("click", closeModal);
    els.modalOverlay.addEventListener("click", (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });
  }
})();
