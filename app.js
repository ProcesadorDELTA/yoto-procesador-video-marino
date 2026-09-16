(() => {
  "use strict";

  const config = Object.assign({ detectorEndpoint: "", maxFileSizeMB: 300, maxDurationSeconds: 900, maxFrames: 240 }, window.YOTO_VIDEO_CONFIG || {});
  const $ = (id) => document.getElementById(id);
  const els = {
    input: $("videoInput"), choose: $("chooseButton"), drop: $("dropzone"), filePanel: $("filePanel"), settings: $("settingsPanel"),
    fileName: $("fileName"), fileMeta: $("fileMeta"), remove: $("removeFile"), process: $("processButton"), interval: $("intervalSelect"),
    customIntervalLabel: $("customIntervalLabel"), customInterval: $("customInterval"), includeNeighbors: $("includeNeighbors"),
    intelligenceMode: $("intelligenceMode"), detectorEndpointInput: $("detectorEndpointInput"), detectorEndpointLabel: $("detectorEndpointLabel"), aiPrivacyNote: $("aiPrivacyNote"),
    quality: $("qualitySelect"), progress: $("progressPanel"), progressTitle: $("progressTitle"), progressValue: $("progressValue"),
    progressBar: $("progressBar"), progressDetail: $("progressDetail"), cancel: $("cancelButton"), results: $("resultsPanel"),
    gallery: $("gallery"), empty: $("emptyResults"), kept: $("keptCount"), candidates: $("candidateCount"), rejected: $("rejectedCount"),
    selected: $("selectedCount"), download: $("downloadButton"), acceptCandidates: $("acceptCandidates"), newVideo: $("newVideoButton"),
    video: $("video"), capture: $("captureCanvas"), analysis: $("analysisCanvas"), detectorStatus: $("detectorStatus"), detectorHelp: $("detectorHelp")
  };

  let sourceFile = null;
  let sourceUrl = "";
  let frames = [];
  let rejectedCount = 0;
  let activeFilter = "all";
  let cancelled = false;

  const MARINE_LABELS = ["fish", "shark", "ray", "stingray", "eel", "turtle", "octopus", "squid", "crab", "lobster", "shrimp", "prawn", "jellyfish", "coral", "seahorse", "seal", "dolphin", "whale", "starfish", "sea star", "urchin", "mollusc", "mollusk", "organism", "pez", "tiburon", "tiburón", "raya", "anguila", "tortuga", "pulpo", "calamar", "cangrejo", "langosta", "gamba", "medusa", "coral", "caballito", "foca", "delfin", "delfín", "ballena", "estrella", "erizo", "molusco", "organismo"];
  const isMarineDetection = (item) => {
    const label = String(item.label || item.class || item.name || "").toLowerCase();
    return MARINE_LABELS.some((term) => label.includes(term));
  };
  const detectionConfidence = (item) => {
    const value = Number(item.confidence ?? item.score ?? 0);
    return value > 1 ? value / 100 : value;
  };
  const getInterval = () => els.interval.value === "custom" ? Number(els.customInterval.value) : Number(els.interval.value);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  };

  function showError(message) {
    els.drop.classList.remove("dragover");
    els.drop.querySelector("p").textContent = message;
    els.drop.querySelector("p").style.color = "#b42318";
  }

  function resetHint() {
    const hint = els.drop.querySelector("p");
    hint.textContent = "MP4, MOV o WebM · hasta 300 MB · máximo 15 minutos";
    hint.style.color = "";
  }

  function clearFrames() {
    frames.forEach((frame) => URL.revokeObjectURL(frame.url));
    frames = [];
    els.gallery.innerHTML = "";
  }

  function resetAll() {
    cancelled = true;
    clearFrames();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = "";
    sourceFile = null;
    els.video.removeAttribute("src");
    els.input.value = "";
    els.filePanel.hidden = true;
    els.settings.hidden = true;
    els.drop.hidden = false;
    els.progress.hidden = true;
    els.results.hidden = true;
    activeFilter = "all";
    document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
    resetHint();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadFile(file) {
    resetHint();
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.type) && !/\.(mp4|mov|webm)$/i.test(file.name)) return showError("Formato no compatible. Selecciona un MP4, MOV o WebM.");
    if (file.size > config.maxFileSizeMB * 1024 * 1024) return showError(`El vídeo supera el límite de ${config.maxFileSizeMB} MB.`);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceFile = file;
    sourceUrl = URL.createObjectURL(file);
    els.video.src = sourceUrl;
    try {
      await new Promise((resolve, reject) => {
        els.video.onloadedmetadata = resolve;
        els.video.onerror = () => reject(new Error("No se pudo leer el vídeo"));
      });
      if (!Number.isFinite(els.video.duration) || els.video.duration <= 0) throw new Error("No se pudo calcular la duración del vídeo.");
      if (els.video.duration > config.maxDurationSeconds) throw new Error(`El vídeo supera el máximo de ${Math.round(config.maxDurationSeconds / 60)} minutos.`);
      els.fileName.textContent = file.name;
      els.fileMeta.textContent = `${formatBytes(file.size)} · ${formatTime(els.video.duration).slice(0, 5)} min · ${els.video.videoWidth} × ${els.video.videoHeight}px`;
      els.drop.hidden = true;
      els.filePanel.hidden = false;
      els.settings.hidden = false;
    } catch (error) {
      showError(error.message || "No se pudo abrir este vídeo.");
    }
  }

  function waitForSeek(time) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("El vídeo tardó demasiado en responder.")), 8000);
      const done = () => { clearTimeout(timeout); els.video.removeEventListener("seeked", done); resolve(); };
      els.video.addEventListener("seeked", done, { once: true });
      els.video.currentTime = Math.min(time, Math.max(0, els.video.duration - 0.05));
    });
  }

  function analyzeImage(imageData, previousGray) {
    const { data, width, height } = imageData;
    const gray = new Uint8Array(width * height);
    let luminance = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const value = Math.round(data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722);
      gray[p] = value;
      luminance += value;
    }
    luminance /= gray.length;
    let edge = 0;
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const p = y * width + x;
        edge += Math.abs(4 * gray[p] - gray[p - 1] - gray[p + 1] - gray[p - width] - gray[p + width]);
      }
    }
    const samples = Math.floor((width - 2) * (height - 2) / 4);
    const sharpness = edge / Math.max(1, samples);
    let difference = 1;
    if (previousGray) {
      let changed = 0;
      let total = 0;
      for (let i = 0; i < gray.length; i += 3) {
        const delta = Math.abs(gray[i] - previousGray[i]);
        total += delta;
        if (delta > 22) changed++;
      }
      difference = Math.min(1, (total / Math.ceil(gray.length / 3)) / 70);
      difference = Math.max(difference, changed / Math.ceil(gray.length / 3));
    }
    const lightScore = luminance < 18 ? 0 : luminance > 245 ? 0 : Math.min(1, luminance / 75, (255 - luminance) / 45);
    const sharpScore = Math.min(1, sharpness / 38);
    return { gray, luminance, sharpness, difference, quality: Math.round((lightScore * .42 + sharpScore * .58) * 100) };
  }

  async function detectWithEndpoint(blob, time) {
    if (els.intelligenceMode.value !== "ai") return null;
    const endpoint = els.detectorEndpointInput.value.trim();
    if (!endpoint) return null;
    const body = new FormData();
    body.append("frame", blob, `frame_${Math.round(time * 1000)}.jpg`);
    body.append("timestamp_seconds", String(time));
    try {
      const response = await fetch(endpoint, { method: "POST", body });
      if (!response.ok) throw new Error("Detector no disponible");
      const result = await response.json();
      return Array.isArray(result.detections) ? result.detections : [];
    } catch (_) {
      return null;
    }
  }

  async function canvasBlob(canvas, quality = .9) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  function updateProgress(current, total, detail) {
    const value = Math.round((current / total) * 100);
    els.progressValue.textContent = `${value} %`;
    els.progressBar.style.width = `${value}%`;
    els.progressDetail.textContent = detail;
  }

  async function processVideo() {
    if (!sourceFile) return;
    cancelled = false;
    clearFrames();
    rejectedCount = 0;
    els.settings.hidden = true;
    els.progress.hidden = false;
    els.results.hidden = true;
    const interval = getInterval();
    if (!Number.isFinite(interval) || interval < .1 || interval > 60) {
      els.settings.hidden = false;
      els.progress.hidden = true;
      els.customInterval.setCustomValidity("Introduce un valor entre 0,1 y 60 segundos.");
      els.customInterval.reportValidity();
      return;
    }
    els.customInterval.setCustomValidity("");
    if (els.intelligenceMode.value === "ai" && !els.detectorEndpointInput.value.trim()) {
      els.settings.hidden = false;
      els.progress.hidden = true;
      els.detectorEndpointInput.setCustomValidity("Introduce la URL segura del servicio de IA.");
      els.detectorEndpointInput.reportValidity();
      return;
    }
    els.detectorEndpointInput.setCustomValidity("");
    const thresholds = { low: 28, medium: 40, high: 55 };
    const qualityThreshold = thresholds[els.quality.value];
    const duration = els.video.duration;
    const total = Math.min(config.maxFrames, Math.max(1, Math.floor(duration / interval) + 1));
    const captureWidth = Math.min(1280, els.video.videoWidth || 1280);
    const captureHeight = Math.round(captureWidth * (els.video.videoHeight || 720) / (els.video.videoWidth || 1280));
    els.capture.width = captureWidth;
    els.capture.height = captureHeight;
    const ctx = els.capture.getContext("2d", { alpha: false });
    const analysisCtx = els.analysis.getContext("2d", { willReadFrequently: true, alpha: false });
    let previousGray = null;
    let previousAcceptedGray = null;

    for (let i = 0; i < total; i++) {
      if (cancelled) return resetAll();
      const time = Math.min(i * interval, duration - .05);
      updateProgress(i, total, `Revisando ${formatTime(time)} de ${formatTime(duration)}.`);
      try {
        await waitForSeek(time);
        ctx.drawImage(els.video, 0, 0, captureWidth, captureHeight);
        analysisCtx.drawImage(els.video, 0, 0, els.analysis.width, els.analysis.height);
        const data = analysisCtx.getImageData(0, 0, els.analysis.width, els.analysis.height);
        const analysis = analyzeImage(data, previousGray);
        previousGray = analysis.gray;
        const duplicateAnalysis = previousAcceptedGray ? analyzeImage(data, previousAcceptedGray) : null;
        const duplicate = Boolean(duplicateAnalysis && duplicateAnalysis.difference < .055);
        const belowQuality = analysis.quality < qualityThreshold;
        const excluded = belowQuality || duplicate;
        if (excluded) rejectedCount++;
        const blob = await canvasBlob(els.capture);
        if (!blob) continue;
        const detections = excluded ? null : await detectWithEndpoint(blob, time);
        const marineDetections = (detections || []).filter(isMarineDetection).sort((a, b) => detectionConfidence(b) - detectionConfidence(a));
        const detected = marineDetections.length > 0;
        const visualCandidate = analysis.difference > .16 && analysis.quality >= qualityThreshold + 4;
        frames.push({
          id: `frame-${i}`,
          time,
          quality: analysis.quality,
          change: Math.round(analysis.difference * 100),
          recommended: !excluded && (detected || visualCandidate),
          excluded,
          exclusionReason: belowQuality ? "Baja calidad" : duplicate ? "Muy similar" : "",
          detectorUsed: detections !== null,
          detections: marineDetections,
          blob,
          url: URL.createObjectURL(blob),
          status: "pending"
        });
        if (!excluded) previousAcceptedGray = analysis.gray;
      } catch (_) {
        rejectedCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    updateProgress(total, total, "Análisis completado.");
    els.progress.hidden = true;
    els.results.hidden = false;
    activeFilter = "all";
    document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
    render();
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cardFor(frame) {
    const article = document.createElement("article");
    article.className = `frame-card ${frame.status}${frame.excluded ? " excluded" : ""}`;
    article.dataset.id = frame.id;
    const topDetection = frame.detections[0];
    const detectionName = topDetection ? String(topDetection.label || topDetection.class || topDetection.name || "Organismo") : "";
    const confidence = topDetection ? detectionConfidence(topDetection) : 0;
    const detectorLabel = detectionName ? `${escapeHtml(detectionName)}${confidence ? ` ${Math.round(confidence * 100)}%` : ""}` : "Posible organismo";
    const badge = frame.recommended
      ? `<span class="candidate-badge">${frame.detections.length ? detectorLabel : "Captura destacada"}</span>`
      : frame.excluded ? `<span class="quality-badge">${frame.exclusionReason}</span>` : "";
    article.innerHTML = `
      <div class="frame-image"><img src="${frame.url}" alt="Fotograma del vídeo en ${formatTime(frame.time)}">${badge}<span class="timestamp">${formatTime(frame.time)}</span></div>
      <div class="frame-info">
        <div class="quality-row"><span>Calidad ${frame.quality}/100</span><span>Cambio ${frame.change}%</span></div>
        <div class="frame-actions">
          <button type="button" class="accept ${frame.status === "accepted" ? "active" : ""}">${frame.status === "accepted" ? "✓ Aceptado" : "Aceptar"}</button>
          <button type="button" class="discard ${frame.status === "discarded" ? "active" : ""}">${frame.status === "discarded" ? "× Descartado" : "Descartar"}</button>
        </div>
      </div>`;
    article.querySelector(".accept").addEventListener("click", () => setStatus(frame.id, frame.status === "accepted" ? "pending" : "accepted"));
    article.querySelector(".discard").addEventListener("click", () => setStatus(frame.id, frame.status === "discarded" ? "pending" : "discarded"));
    return article;
  }

  function setStatus(id, status) {
    const frame = frames.find((item) => item.id === id);
    if (!frame) return;
    frame.status = status;
    render();
  }

  function matchesFilter(frame) {
    if (activeFilter === "all") return true;
    if (activeFilter === "recommended") return frame.recommended;
    return frame.status === activeFilter;
  }

  function render() {
    els.gallery.innerHTML = "";
    const visible = frames.filter(matchesFilter);
    visible.forEach((frame) => els.gallery.appendChild(cardFor(frame)));
    els.empty.hidden = visible.length > 0;
    const candidates = frames.filter((frame) => frame.recommended).length;
    const accepted = frames.filter((frame) => frame.status === "accepted").length;
    els.kept.textContent = frames.length;
    els.candidates.textContent = candidates;
    els.rejected.textContent = rejectedCount;
    els.selected.textContent = `${accepted} ${accepted === 1 ? "fotograma aceptado" : "fotogramas aceptados"}`;
    els.download.disabled = accepted === 0;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
  function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
  function concat(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach((part) => { output.set(part, offset); offset += part.length; });
    return output;
  }

  async function createZip(filesToZip) {
    const encoder = new TextEncoder();
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const file of filesToZip) {
      const name = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(await file.data.arrayBuffer());
      const crc = crc32(data);
      const local = concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
      locals.push(local);
      centrals.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
      offset += local.length;
    }
    const central = concat(centrals);
    const end = concat([u32(0x06054b50), u16(0), u16(0), u16(filesToZip.length), u16(filesToZip.length), u32(central.length), u32(offset), u16(0)]);
    return new Blob([...locals, central, end], { type: "application/zip" });
  }

  async function captureAtTime(time) {
    await waitForSeek(time);
    const ctx = els.capture.getContext("2d", { alpha: false });
    ctx.drawImage(els.video, 0, 0, els.capture.width, els.capture.height);
    return canvasBlob(els.capture);
  }

  async function downloadSelection() {
    const accepted = frames.filter((frame) => frame.status === "accepted");
    if (!accepted.length) return;
    els.download.disabled = true;
    els.download.textContent = "Preparando descarga…";
    const base = (sourceFile.name.replace(/\.[^.]+$/, "") || "video").replace(/[^a-z0-9_-]+/gi, "_");
    const rows = ["archivo,video_origen,tiempo_segundos,marca_tiempo,calidad,captura_destacada,detector,numero_detecciones"];
    const packageFiles = accepted.map((frame, index) => {
      const name = `fotogramas/${base}_${String(index + 1).padStart(3, "0")}_${formatTime(frame.time).replace(/[:.]/g, "-")}.jpg`;
      rows.push(`"${name.split("/").pop()}","${sourceFile.name.replace(/"/g, '""')}",${frame.time.toFixed(2)},${formatTime(frame.time)},${frame.quality},${frame.recommended ? "si" : "no"},${frame.detectorUsed ? "conectado" : "seleccion_local"},${frame.detections.length}`);
      return { name, data: frame.blob };
    });
    if (els.includeNeighbors.checked) {
      const fps = Number(config.assumedFramesPerSecond) || 30;
      const step = 1 / fps;
      for (let index = 0; index < accepted.length; index++) {
        const frame = accepted[index];
        const neighbors = [
          { suffix: "anterior", time: Math.max(0, frame.time - step) },
          { suffix: "posterior", time: Math.min(els.video.duration - .001, frame.time + step) }
        ];
        for (const neighbor of neighbors) {
          const blob = await captureAtTime(neighbor.time);
          if (!blob) continue;
          const name = `fotogramas_contexto/${base}_${String(index + 1).padStart(3, "0")}_${neighbor.suffix}_${formatTime(neighbor.time).replace(/[:.]/g, "-")}.jpg`;
          packageFiles.push({ name, data: blob });
          rows.push(`"${name.split("/").pop()}","${sourceFile.name.replace(/"/g, '""')}",${neighbor.time.toFixed(3)},${formatTime(neighbor.time)},contexto,no,no_aplica,0`);
        }
      }
    }
    packageFiles.push({ name: "resultados.csv", data: new TextEncoder().encode(rows.join("\n")) });
    packageFiles.push({ name: "LEEME.txt", data: new TextEncoder().encode(`Fotogramas extraídos con el procesador de vídeo de YOTO.\nEl campo captura_destacada identifica la selección sugerida por el procesador y requiere revisión humana.\nLos frames de contexto se calculan a ±1/${Number(config.assumedFramesPerSecond) || 30} s del fotograma aceptado.\n`) });
    const zip = await createZip(packageFiles);
    const url = URL.createObjectURL(zip);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base}_fotogramas_yoto.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    els.download.disabled = false;
    els.download.textContent = "Descargar selección (.zip)";
  }

  els.choose.addEventListener("click", (event) => { event.stopPropagation(); els.input.click(); });
  els.drop.addEventListener("click", () => els.input.click());
  els.drop.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); els.input.click(); } });
  els.input.addEventListener("change", () => { if (els.input.files[0]) loadFile(els.input.files[0]); });
  ["dragenter", "dragover"].forEach((name) => els.drop.addEventListener(name, (event) => { event.preventDefault(); els.drop.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((name) => els.drop.addEventListener(name, (event) => { event.preventDefault(); els.drop.classList.remove("dragover"); }));
  els.drop.addEventListener("drop", (event) => { if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]); });
  els.remove.addEventListener("click", resetAll);
  els.newVideo.addEventListener("click", resetAll);
  els.process.addEventListener("click", processVideo);
  els.interval.addEventListener("change", () => { els.customIntervalLabel.hidden = els.interval.value !== "custom"; });
  els.intelligenceMode.addEventListener("change", () => {
    const useAI = els.intelligenceMode.value === "ai";
    els.detectorEndpointLabel.hidden = !useAI;
    els.aiPrivacyNote.hidden = !useAI;
    els.detectorStatus.textContent = useAI ? "IA marina preparada" : "Selección inteligente activada";
    els.detectorHelp.textContent = useAI
      ? "Los fotogramas válidos se enviarán al servicio configurado para localizar peces y otros organismos marinos."
      : "Destaca las capturas más nítidas y con cambios relevantes sin enviar imágenes fuera del dispositivo.";
  });
  els.cancel.addEventListener("click", () => { cancelled = true; });
  els.download.addEventListener("click", downloadSelection);
  els.acceptCandidates.addEventListener("click", () => { frames.forEach((frame) => { if (frame.recommended) frame.status = "accepted"; }); render(); });
  document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  }));

  if (config.detectorEndpoint) {
    els.detectorEndpointInput.value = config.detectorEndpoint;
    els.intelligenceMode.value = "ai";
    els.detectorEndpointLabel.hidden = false;
    els.aiPrivacyNote.hidden = false;
    els.detectorStatus.textContent = "Detector marino conectado";
    els.detectorHelp.textContent = "Prioriza fotogramas con peces y otros organismos marinos detectados por el modelo configurado.";
  }

  if (document.modelContext?.registerTool) {
    document.modelContext.registerTool({
      name: "get_video_processing_summary",
      title: "Consultar resumen del vídeo",
      description: "Devuelve el recuento actual de capturas, capturas destacadas y aceptadas.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return { frames: frames.length, recommended: frames.filter((f) => f.recommended).length, accepted: frames.filter((f) => f.status === "accepted").length, outsideSelection: rejectedCount };
      }
    });
  }
})();
