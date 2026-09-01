(function () {
  "use strict";

  const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

  function formatClock(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  const els = {
    sidebar: document.getElementById("sidebar"),
    btnMenu: document.getElementById("btnMenu"),
    btnCloseSidebar: document.getElementById("btnCloseSidebar"),
    fileDrop: document.getElementById("fileDrop"),
    fileInput: document.getElementById("fileInput"),
    fileDropLabel: document.getElementById("fileDropLabel"),
    mappingSection: document.getElementById("mappingSection"),
    colDate: document.getElementById("colDate"),
    colTurno: document.getElementById("colTurno"),
    colOrario: document.getElementById("colOrario"),
    colDesc: document.getElementById("colDesc"),
    restCodes: document.getElementById("restCodes"),
    btnGenerate: document.getElementById("btnGenerate"),
    sidebarStatus: document.getElementById("sidebarStatus"),
    emptyState: document.getElementById("emptyState"),
    btnEmptyUpload: document.getElementById("btnEmptyUpload"),
    shiftList: document.getElementById("shiftList"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnToday: document.getElementById("btnToday"),
    btnSearch: document.getElementById("btnSearch"),
    searchBar: document.getElementById("searchBar"),
    searchInput: document.getElementById("searchInput"),
    btnLegend: document.getElementById("btnLegend"),
    legendPopover: document.getElementById("legendPopover"),
    btnFilter: document.getElementById("btnFilter"),
    filterBar: document.getElementById("filterBar"),
    btnAdd: document.getElementById("btnAdd"),
    btnClearSaved: document.getElementById("btnClearSaved"),
  };

  const STORAGE_KEY = "turniViewer.v1";

  let sheetRows = []; // array of arrays, row 0 = header
  let headers = [];
  let entries = []; // {date, turno, desc}
  let searchTerm = "";
  let filterMode = "all";
  let didInitialScroll = false;

  function saveToStorage(fileName) {
    try {
      const payload = {
        fileName: fileName || "",
        savedAt: new Date().toISOString(),
        entries: entries.map((e) => ({ date: e.date.toISOString(), turno: e.turno, desc: e.desc, isRest: e.isRest })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Impossibile salvare i turni nel browser:", err);
    }
  }

  function loadFromStorage() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return;
    }
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      entries = payload.entries.map((e) => ({ ...e, date: new Date(e.date) }));
      if (payload.fileName) {
        els.fileDropLabel.textContent = `Ultimo file caricato: ${payload.fileName} (carica un nuovo file per aggiornarlo)`;
      }
      els.btnClearSaved.classList.remove("hidden");
    } catch (err) {
      console.warn("Dati salvati non validi, li ignoro:", err);
    }
  }

  els.btnClearSaved.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
    entries = [];
    sheetRows = [];
    els.fileDropLabel.textContent = "Trascina qui il file .xls / .xlsx oppure clicca per selezionarlo";
    els.btnClearSaved.classList.add("hidden");
    render();
  });

  function openSidebar() { els.sidebar.classList.remove("hidden"); }
  function closeSidebar() { els.sidebar.classList.add("hidden"); }

  els.btnMenu.addEventListener("click", openSidebar);
  els.btnAdd.addEventListener("click", openSidebar);
  els.btnEmptyUpload.addEventListener("click", openSidebar);
  els.btnCloseSidebar.addEventListener("click", closeSidebar);

  els.btnSearch.addEventListener("click", () => {
    els.searchBar.classList.toggle("hidden");
    if (!els.searchBar.classList.contains("hidden")) els.searchInput.focus();
  });
  els.searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  els.btnLegend.addEventListener("click", () => {
    els.legendPopover.classList.toggle("hidden");
  });

  els.btnFilter.addEventListener("click", () => {
    els.filterBar.classList.toggle("hidden");
  });
  document.querySelectorAll('input[name="filterMode"]').forEach((r) => {
    r.addEventListener("change", (e) => {
      filterMode = e.target.value;
      render();
    });
  });

  els.btnRefresh.addEventListener("click", () => {
    if (sheetRows.length) buildEntriesFromMapping();
    render();
  });

  els.btnToday.addEventListener("click", () => {
    const el = document.querySelector(".day-row.is-today-row");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // --- File loading ---
  // Note: fileInput lives inside the fileDrop <label>, so clicking the label
  // already opens the file picker natively. Do NOT also call fileInput.click()
  // here: firing it twice in the same tick breaks the picker on many mobile
  // browsers (iOS Safari, Android WebViews) even though desktop tolerates it.
  els.fileDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.fileDrop.classList.add("dragover");
  });
  els.fileDrop.addEventListener("dragleave", () => els.fileDrop.classList.remove("dragover"));
  els.fileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    els.fileDrop.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  els.fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  let currentFileName = "";

  function handleFile(file) {
    currentFileName = file.name;
    els.fileDropLabel.textContent = `File: ${file.name}`;
    els.sidebarStatus.textContent = "";
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const dataSheetName = workbook.SheetNames.find((n) => !/legend/i.test(n)) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[dataSheetName];
        sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
        if (!sheetRows.length) {
          els.sidebarStatus.textContent = "Il file sembra vuoto.";
          return;
        }
        headers = sheetRows[0].map((h, i) => (h === "" || h == null ? `Colonna ${i + 1}` : String(h)));

        const legendSheetName = workbook.SheetNames.find((n) => /legend/i.test(n));
        const detectedRestCodes = legendSheetName ? extractRestCodesFromLegend(workbook.Sheets[legendSheetName]) : null;

        populateMappingSelects(detectedRestCodes);
        els.mappingSection.classList.remove("hidden");
      } catch (err) {
        console.error(err);
        els.sidebarStatus.textContent = "Errore nella lettura del file. Assicurati che sia un .xls/.xlsx/.csv valido.";
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

    [els.colDate, els.colTurno, els.colOrario, els.colDesc].forEach((sel) => (sel.innerHTML = ""));
    headers.forEach((h, i) => {
      els.colDate.add(new Option(h, i));
      els.colTurno.add(new Option(h, i));
      els.colOrario.add(new Option(h, i));
      els.colDesc.add(new Option(h, i));
    });
    els.colOrario.add(new Option("— nessuna —", -1));

    els.colDate.value = guesses.dateIdx;
    els.colTurno.value = guesses.turnoIdx;
    els.colOrario.value = guesses.orarioIdx;
    els.colDesc.value = guesses.descIdx;

    if (detectedRestCodes) {
      els.restCodes.value = detectedRestCodes.join(",");
    }
  }

  function guessColumns(headers, dataRows) {
    let dateIdx = 0;
    let bestDateCount = -1;
    for (let c = 0; c < headers.length; c++) {
      let count = 0;
      for (const row of dataRows) {
        if (row[c] instanceof Date) count++;
      }
      if (count > bestDateCount) {
        bestDateCount = count;
        dateIdx = c;
      }
    }

    const findByKeyword = (keywords, exclude) => {
      for (let c = 0; c < headers.length; c++) {
        if (exclude.includes(c)) continue;
        const h = headers[c].toLowerCase();
        if (keywords.some((k) => h.includes(k))) return c;
      }
      return -1;
    };

    let turnoIdx = findByKeyword(["turno", "shift"], [dateIdx]);
    if (turnoIdx === -1) turnoIdx = findByKeyword(["codice"], [dateIdx]);
    if (turnoIdx === -1) turnoIdx = headers.findIndex((_, i) => i !== dateIdx);
    if (turnoIdx === -1) turnoIdx = dateIdx;

    let orarioIdx = findByKeyword(["orario", "fascia"], [dateIdx, turnoIdx]);

    const usedForTurnoOrario = orarioIdx === -1 ? [dateIdx, turnoIdx] : [dateIdx, turnoIdx, orarioIdx];
    let descIdx = findByKeyword(["descr", "reparto", "note", "attivit", "servizio", "unit"], usedForTurnoOrario);
    if (descIdx === -1) {
      descIdx = headers.findIndex((_, i) => !usedForTurnoOrario.includes(i));
    }
    if (descIdx === -1) descIdx = turnoIdx;

    return { dateIdx, turnoIdx, orarioIdx, descIdx };
  }

  els.btnGenerate.addEventListener("click", () => {
    buildEntriesFromMapping();
    if (entries.length === 0) {
      els.sidebarStatus.textContent = "Nessuna riga con data valida trovata nella colonna selezionata.";
      return;
    }
    els.sidebarStatus.textContent = `Caricate ${entries.length} righe.`;
    saveToStorage(currentFileName);
    els.btnClearSaved.classList.remove("hidden");
    closeSidebar();
    render();
  });

  function buildEntriesFromMapping() {
    const dateIdx = Number(els.colDate.value);
    const turnoIdx = Number(els.colTurno.value);
    const orarioIdx = Number(els.colOrario.value);
    const descIdx = Number(els.colDesc.value);
    const restCodes = els.restCodes.value
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const dataRows = sheetRows.slice(1);
    const out = [];
    for (const row of dataRows) {
      const rawDate = row[dateIdx];
      let date = null;
      if (rawDate instanceof Date) date = rawDate;
      else if (typeof rawDate === "string" && rawDate.trim()) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) date = parsed;
      }
      if (!date) continue;

      const turno = row[turnoIdx] != null ? String(row[turnoIdx]).trim() : "";
      const orario = orarioIdx >= 0 && row[orarioIdx] != null ? String(row[orarioIdx]).trim() : "";
      const desc = row[descIdx] != null ? String(row[descIdx]).trim() : "";
      const isRest = restCodes.includes(turno.toUpperCase()) || (turno === "" && desc !== "" && restCodes.includes(desc.toUpperCase()));

      const line1 = isRest || !orario ? turno : `${turno} (${orario})`;

      out.push({ date, turno: line1, desc: isRest ? "" : desc, isRest });
    }
    out.sort((a, b) => a.date - b.date);
    entries = out;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function render() {
    els.shiftList.innerHTML = "";
    const hasData = entries.length > 0;
    els.emptyState.classList.toggle("hidden", hasData);
    if (!hasData) return;

    const today = new Date();
    const frag = document.createDocumentFragment();

    for (const entry of entries) {
      if (filterMode === "shift" && entry.isRest) continue;
      if (filterMode === "rest" && !entry.isRest) continue;
      if (searchTerm) {
        const haystack = `${entry.turno} ${entry.desc}`.toLowerCase();
        if (!haystack.includes(searchTerm)) continue;
      }

      const row = document.createElement("div");
      row.className = "day-row";
      const todayFlag = isSameDay(entry.date, today);
      if (todayFlag) row.classList.add("is-today-row");

      const label = document.createElement("div");
      label.className = "day-label" + (todayFlag ? " is-today" : "");
      label.innerHTML = `
        <div class="weekday">${WEEKDAYS[entry.date.getDay()]}</div>
        <div class="daynum">${entry.date.getDate()}</div>
        <div class="month">${MONTHS[entry.date.getMonth()]}</div>
      `;

      const card = document.createElement("div");
      if (entry.isRest) {
        card.className = "day-card rest";
        card.textContent = entry.turno || entry.desc || "-";
      } else {
        card.className = "day-card shift";
        const l1 = document.createElement("div");
        l1.className = "line1";
        l1.textContent = entry.turno || "-";
        card.appendChild(l1);
        if (entry.desc) {
          const l2 = document.createElement("div");
          l2.className = "line2";
          l2.textContent = entry.desc;
          card.appendChild(l2);
        }
      }

      row.appendChild(label);
      row.appendChild(card);

      if (todayFlag) {
        const extra = document.createElement("div");
        extra.className = "day-extra";
        extra.innerHTML = `<div class="clock-icon">&#128336;</div><div class="clock-time">${formatClock(new Date())}</div>`;
        row.appendChild(extra);
      }

      frag.appendChild(row);
    }

    els.shiftList.appendChild(frag);

    if (!didInitialScroll) {
      didInitialScroll = true;
      const todayEl = els.shiftList.querySelector(".day-row.is-today-row");
      if (todayEl) {
        requestAnimationFrame(() => todayEl.scrollIntoView({ behavior: "auto", block: "center" }));
      }
    }
  }

  setInterval(() => {
    const el = document.querySelector(".day-extra .clock-time");
    if (el) el.textContent = formatClock(new Date());
  }, 30000);

  loadFromStorage();
  render();
})();
