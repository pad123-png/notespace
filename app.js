(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "notespace-pwa-v1";
  const homeView = $("homeView"), editorView = $("editorView"), gameView = $("gameView");
  const canvas = $("drawCanvas"), ctx = canvas.getContext("2d");
  const paper = $("paper");
  let data = loadData();
  let currentNotebookId = null, currentPageIndex = 0;
  let tool = "pen", color = "#20232b", size = 3, drawing = false, activePointerId = null;
  let currentStroke = null, undoStack = [], redoStack = [], toastTimer = null;
  let installPrompt = null;

  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { notebooks: [] }; }
    catch { return { notebooks: [] }; }
  }
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      $("saveStatus").textContent = "Gespeichert";
      $("localSaveHint").textContent = "Automatisch gespeichert";
    } catch (err) {
      $("saveStatus").textContent = "Speicher voll?";
      showToast("Speichern fehlgeschlagen. Exportiere wichtige Notizen als PNG.");
    }
  }
  function showToast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function makePage() { return { strokes: [], paper: "lined" }; }
  function makeNotebook(name) { return { id: uid(), name, created: Date.now(), updated: Date.now(), pages: [makePage()] }; }
  function getNotebook() { return data.notebooks.find(n => n.id === currentNotebookId); }
  function getPage() { const n = getNotebook(); return n && n.pages[currentPageIndex]; }

  function renderNotebookList() {
    const list = $("notebookList"); list.replaceChildren();
    $("notebookCount").textContent = String(data.notebooks.length);
    $("emptyMessage").classList.toggle("hidden", data.notebooks.length > 0);
    data.notebooks.slice().sort((a,b) => b.updated-a.updated).forEach(n => {
      const card = document.createElement("button"); card.className = "notebook-card"; card.type = "button";
      const icon = document.createElement("span"); icon.className = "notebook-icon"; icon.textContent = "✎";
      const body = document.createElement("span");
      const name = document.createElement("span"); name.className = "notebook-name"; name.textContent = n.name || "Unbenannt";
      const meta = document.createElement("span"); meta.className = "notebook-meta"; meta.textContent = `${n.pages.length} ${n.pages.length === 1 ? "Seite" : "Seiten"} · lokal gespeichert`;
      body.append(name, document.createElement("br"), meta); card.append(icon, body);
      card.addEventListener("click", () => openNotebook(n.id)); list.append(card);
    });
  }
  function openNotebook(id) {
    currentNotebookId = id; currentPageIndex = 0; undoStack = []; redoStack = [];
    homeView.classList.add("hidden"); gameView.classList.add("hidden"); editorView.classList.remove("hidden");
    const n = getNotebook(); $("notebookTitle").value = n.name;
    loadPage(); resizeCanvas(); updatePageControls();
  }
  function goHome() {
    if (drawing) finishStroke();
    saveCurrentCanvas();
    editorView.classList.add("hidden"); gameView.classList.add("hidden"); homeView.classList.remove("hidden");
    currentNotebookId = null; renderNotebookList();
  }
  function loadPage() {
    const page = getPage(); if (!page) return;
    paper.className = "paper " + page.paper;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    page.strokes.forEach(stroke => drawStroke(stroke));
    updatePageControls();
  }
  function updatePageControls() {
    const n = getNotebook(); if (!n) return;
    $("pageLabel").textContent = `Seite ${currentPageIndex + 1} / ${n.pages.length}`;
    $("prevPageBtn").disabled = currentPageIndex === 0;
    $("nextPageBtn").disabled = currentPageIndex >= n.pages.length - 1;
  }
  function saveCurrentCanvas() {
    const n = getNotebook(); if (!n) return;
    n.updated = Date.now(); saveData();
  }
  function resizeCanvas() {
    if (editorView.classList.contains("hidden")) return;
    const rect = paper.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const oldW = canvas.width, oldH = canvas.height;
    const image = oldW && oldH ? canvas.toDataURL() : null;
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (image) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img,0,0,rect.width,rect.height); };
      img.src = image;
    } else loadPage();
  }
  function pointFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX-r.left), y: (e.clientY-r.top), p: e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5 };
  }
  function strokeWidth(p) {
    if (tool === "marker") return size * 3.2;
    if (tool === "eraser") return size * 5;
    return Math.max(.7, size * (p && p > 0 ? (0.45 + p * 0.9) : 1));
  }
  function setStrokeStyle(stroke) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      if (stroke.tool === "marker") ctx.globalAlpha = .28; else ctx.globalAlpha = 1;
    }
    const pressure = stroke.points && stroke.points[0] && stroke.points[0].p > 0 ? stroke.points[0].p : 0.5;
    ctx.lineWidth = stroke.tool === "eraser" ? stroke.size * 5 : stroke.tool === "marker" ? stroke.size * 3.2 : stroke.size * (0.45 + pressure * 0.9);
  }
  function drawStroke(stroke) {
    if (!stroke.points || !stroke.points.length) return;
    setStrokeStyle(stroke);
    const pts = stroke.points;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) { ctx.lineTo(pts[0].x+.1, pts[0].y+.1); ctx.stroke(); }
    else { for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function beginStroke(e) {
    // Ignore finger touches: Apple Pencil and mouse can draw.
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerId !== null) return;
    e.preventDefault();
    activePointerId = e.pointerId; drawing = true;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    const p = pointFromEvent(e);
    currentStroke = { tool, color, size, points: [p] };
    const page = getPage(); if (!page) return;
    page.strokes.push(currentStroke);
    drawStroke(currentStroke);
  }
  function moveStroke(e) {
    if (!drawing || e.pointerId !== activePointerId || !currentStroke) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    currentStroke.points.push(p);
    drawStrokeSegment(currentStroke.points[currentStroke.points.length-2], p, currentStroke);
  }
  function drawStrokeSegment(a,b,stroke) {
    setStrokeStyle(stroke);
    if (stroke.tool === "pen") ctx.lineWidth = stroke.size * (0.45 + ((b.p || 0.5) * 0.9));
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function finishStroke(e) {
    if (!drawing) return;
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    drawing = false; activePointerId = null; currentStroke = null;
    undoStack.push(JSON.stringify(getPage().strokes)); if (undoStack.length > 60) undoStack.shift();
    redoStack = []; saveCurrentCanvas();
  }
  function restoreStrokes(strokes) {
    const page = getPage(); page.strokes = strokes;
    ctx.clearRect(0,0,canvas.width,canvas.height); strokes.forEach(drawStroke); saveCurrentCanvas();
    updateHistoryButtons();
  }
  function undo() {
    const page = getPage(); if (!page || !page.strokes.length) return;
    redoStack.push(JSON.stringify(page.strokes)); page.strokes.pop();
    ctx.clearRect(0,0,canvas.width,canvas.height); page.strokes.forEach(drawStroke); saveCurrentCanvas(); updateHistoryButtons();
  }
  function redo() {
    if (!redoStack.length) return;
    const strokes = JSON.parse(redoStack.pop());
    undoStack.push(JSON.stringify(getPage().strokes)); restoreStrokes(strokes);
  }
  function updateHistoryButtons() {
    $("undoBtn").disabled = !getPage()?.strokes.length;
    $("redoBtn").disabled = !redoStack.length;
  }
  function chooseTool(nextTool) {
    tool = nextTool;
    document.querySelectorAll("[data-tool]").forEach(btn => {
      const active = btn.dataset.tool === tool; btn.classList.toggle("active", active); btn.setAttribute("aria-pressed", String(active));
    });
    canvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
  }
  function setPaper(type) { const page = getPage(); if (!page) return; page.paper = type; paper.className = "paper " + type; saveCurrentCanvas(); }
  function exportPng() {
    if (!canvas.width) return;
    const link = document.createElement("a"); link.download = `${(getNotebook()?.name || "NoteSpace").replace(/[^\w\-]+/g,"_")}_Seite_${currentPageIndex+1}.png`;
    link.href = canvas.toDataURL("image/png"); link.click(); showToast("Seite als PNG exportiert.");
  }
  function printPage() {
    const url = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) { showToast("Pop-up blockiert. Bitte Pop-ups erlauben oder PNG exportieren."); return; }
    w.document.write(`<html><head><title>NoteSpace – Seite</title><style>@page{margin:10mm}body{margin:0}img{width:100%;height:auto;display:block}</style></head><body><img src="${url}" onload="window.print()"></body></html>`);
    w.document.close();
  }
  function newNotebook() {
    const name = prompt("Wie soll dein Notizbuch heißen?", "Mein Notizbuch");
    if (name === null) return;
    const n = makeNotebook(name.trim() || "Mein Notizbuch"); data.notebooks.push(n); saveData(); renderNotebookList(); openNotebook(n.id);
  }

  $("newNotebookBtn").addEventListener("click", newNotebook);
  $("openGameBtn").addEventListener("click", () => { editorView.classList.add("hidden"); homeView.classList.add("hidden"); gameView.classList.remove("hidden"); window.skyHopperResize?.(); });
  $("gameBackBtn").addEventListener("click", () => { gameView.classList.add("hidden"); homeView.classList.remove("hidden"); window.skyHopperPause?.(); });
  $("backBtn").addEventListener("click", goHome);
  $("notebookTitle").addEventListener("input", e => { const n=getNotebook(); if(n){n.name=e.target.value;n.updated=Date.now();saveData();} });
  $("addPageBtn").addEventListener("click", () => { const n=getNotebook(); if(!n)return; saveCurrentCanvas(); n.pages.push(makePage()); currentPageIndex=n.pages.length-1; loadPage(); saveData(); updateHistoryButtons(); });
  $("prevPageBtn").addEventListener("click", () => { if(currentPageIndex>0){saveCurrentCanvas();currentPageIndex--;loadPage();updateHistoryButtons();} });
  $("nextPageBtn").addEventListener("click", () => { const n=getNotebook(); if(currentPageIndex<n.pages.length-1){saveCurrentCanvas();currentPageIndex++;loadPage();updateHistoryButtons();} });
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>chooseTool(b.dataset.tool)));
  document.querySelectorAll("[data-color]").forEach(b=>b.addEventListener("click",()=>{color=b.dataset.color;document.querySelectorAll("[data-color]").forEach(x=>x.classList.toggle("selected",x===b));$("customColor").value=color;}));
  $("customColor").addEventListener("input",e=>{color=e.target.value;document.querySelectorAll("[data-color]").forEach(x=>x.classList.remove("selected"));});
  $("sizeSlider").addEventListener("input",e=>{size=Number(e.target.value);$("sizeValue").textContent=size;});
  $("paperSelect").addEventListener("change",e=>setPaper(e.target.value));
  $("undoBtn").addEventListener("click",undo); $("redoBtn").addEventListener("click",redo);
  $("exportBtn").addEventListener("click",exportPng); $("printBtn").addEventListener("click",printPage);
  canvas.addEventListener("pointerdown",beginStroke); canvas.addEventListener("pointermove",moveStroke);
  canvas.addEventListener("pointerup",finishStroke); canvas.addEventListener("pointercancel",finishStroke); canvas.addEventListener("lostpointercapture",finishStroke);
  window.addEventListener("resize",resizeCanvas);
  document.addEventListener("keydown",e=>{
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();}
    if(mod&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
  });
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").classList.remove("hidden");});
  $("installBtn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").classList.add("hidden");});
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  if(!data.notebooks.length){const first=makeNotebook("Mein erstes Notizbuch");data.notebooks.push(first);saveData();}
  renderNotebookList();
  // Canvas is sized after opening a notebook, so drawing coordinates match its visible size.
})();
