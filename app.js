const DEFAULT_BACKGROUND_URL = "fondo-default.jpg";
const DB_NAME = "etiquetador_fotos_protocolos_v2";
const DB_STORE = "project";
const PROJECT_KEY = "current_project";
const PROJECT_LIST_KEY = "project_list";
const ACTIVE_PROJECT_ID_KEY = "active_project_id";

const state = {
  step: 1,
  protocolName: "",
  treatmentsInput: "",
  photosPerSlide: 3,
  qualityMode: "original",
  backgroundSrc: DEFAULT_BACKGROUND_URL,
  locations: [],
  photos: [],
  currentProjectId: "",
  boxOpenState: {},
  hydrated: false
};

const $ = (id) => document.getElementById(id);
const els = {
  progressTabs: Array.from(document.querySelectorAll(".progress-tab")),
  step1: $("step1"),
  step2: $("step2"),
  btnStepConfig: $("btnStepConfig"),
  btnClearProject: $("btnClearProject"),
  btnNewProject: $("btnNewProject"),
  btnSaveProject: $("btnSaveProject"),
  btnNewProjectTop: $("btnNewProjectTop"),
  btnSaveProjectTop: $("btnSaveProjectTop"),
  projectSelect: $("projectSelect"),
  projectNameStatus: $("projectNameStatus"),
  protocolName: $("protocolName"),
  photosPerSlide: $("photosPerSlide"),
  treatmentsInput: $("treatmentsInput"),
  qualityMode: $("qualityMode"),
  btnChangeBg: $("btnChangeBg"),
  btnResetBg: $("btnResetBg"),
  bgInput: $("bgInput"),
  btnAddLocation: $("btnAddLocation"),
  locationsEditor: $("locationsEditor"),
  btnGoPhotos: $("btnGoPhotos"),
  btnBackConfig: $("btnBackConfig"),
  dropZones: $("dropZones"),
  btnClearPhotos: $("btnClearPhotos"),
  photoCounter: $("photoCounter"),
  locationCount: $("locationCount"),
  momentCount: $("momentCount"),
  treatmentCount: $("treatmentCount"),
  assignedCount: $("assignedCount"),
  projectPreview: $("projectPreview"),
  btnDownloadPhotos: $("btnDownloadPhotos"),
  btnDownloadPpt: $("btnDownloadPpt"),
  btnDownloadAll: $("btnDownloadAll"),
  exportStatus: $("exportStatus")
};

function openDb(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbSet(key,value){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).put(value,key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function dbGet(key){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE,"readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbDelete(key){
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getProjectList(){
  const list = await dbGet(PROJECT_LIST_KEY);
  return Array.isArray(list) ? list : [];
}
async function setProjectList(list){
  await dbSet(PROJECT_LIST_KEY, list);
}
function makeProjectId(){
  return "proj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
}
function getCurrentProjectTitle(){
  return (els.protocolName?.value || state.protocolName || "Proyecto sin nombre").trim() || "Proyecto sin nombre";
}
async function upsertProjectInList(projectId, title){
  const now = new Date().toISOString();
  const list = await getProjectList();
  const existing = list.find(p => p.id === projectId);
  if(existing){
    existing.title = title || existing.title || "Proyecto sin nombre";
    existing.updatedAt = now;
  }else{
    list.unshift({ id: projectId, title: title || "Proyecto sin nombre", updatedAt: now });
  }
  list.sort((a,b)=>String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  await setProjectList(list.slice(0, 20));
}
async function refreshProjectSelector(){
  if(!els.projectSelect) return;
  const list = await getProjectList();
  els.projectSelect.innerHTML = `<option value="">Seleccionar proyecto guardado...</option>` + list.map(item=>{
    const date = item.updatedAt ? new Date(item.updatedAt).toLocaleString("es-AR") : "";
    return `<option value="${escapeHtml(item.id)}" ${item.id === state.currentProjectId ? "selected" : ""}>${escapeHtml(item.title)}${date ? " · " + escapeHtml(date) : ""}</option>`;
  }).join("");
  if(els.projectNameStatus){
    els.projectNameStatus.textContent = state.currentProjectId ? `Proyecto activo: ${getCurrentProjectTitle()}` : "Proyecto activo: sin guardar";
  }
}
function resetCurrentProject(){
  state.protocolName = "";
  state.treatmentsInput = "";
  state.photosPerSlide = 3;
  state.qualityMode = "original";
  state.backgroundSrc = DEFAULT_BACKGROUND_URL;
  state.locations = [{id:uid("loc"), name:"Localidad 1", trial:"", momentsText:"10 DDA |\n20 DDA |"}];
  state.photos = [];
  state.boxOpenState = {};
  state.step = 1;
  state.currentProjectId = makeProjectId();
  if(els.protocolName) els.protocolName.value = "";
  if(els.treatmentsInput) els.treatmentsInput.value = "";
  if(els.photosPerSlide) els.photosPerSlide.value = "3";
  if(els.qualityMode) els.qualityMode.value = "original";
}
function debounce(fn, wait=450){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}
function uid(prefix="id"){
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,8);
}
function escapeHtml(value){
  return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function slug(value){
  return String(value || "item").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase() || "item";
}
function sanitizeFileName(value){
  return String(value || "Protocolo").trim().replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_").replace(/_+/g,"_") || "Protocolo";
}
function parseLines(raw){
  return String(raw || "").split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
}
function parseMomentLine(line, idx){
  const parts = String(line || "").split("|").map(v=>v.trim());
  return {
    id: "mom_" + idx + "_" + slug(parts[0] || "Momento"),
    name: parts[0] || "Momento",
    date: parts[1] || ""
  };
}
function getTreatments(){
  return parseLines(els.treatmentsInput.value).map((name, idx)=>({id:"t_"+idx+"_"+slug(name), name}));
}
function getLocations(){
  return state.locations.map((loc, idx)=>{
    const input = document.querySelector(`[data-location-name="${CSS.escape(loc.id)}"]`);
    const trialInput = document.querySelector(`[data-location-trial="${CSS.escape(loc.id)}"]`);
    const text = document.querySelector(`[data-location-moments="${CSS.escape(loc.id)}"]`);
    return {
      id: loc.id,
      name: (input?.value || loc.name || `Localidad ${idx+1}`).trim(),
      trial: (trialInput?.value || loc.trial || "").trim(),
      momentsText: text?.value || loc.momentsText || "",
      moments: parseLines(text?.value || loc.momentsText || "").map(parseMomentLine)
    };
  });
}
function getMeta(){
  const locations = getLocations();
  return {
    protocolName: els.protocolName.value.trim(),
    treatments: getTreatments(),
    locations,
    photosPerSlide: Math.max(1, Math.min(6, Number(els.photosPerSlide.value || 3))),
    qualityMode: els.qualityMode.value,
    backgroundSrc: state.backgroundSrc
  };
}
function countMoments(locations){
  return locations.reduce((acc, loc)=>acc + loc.moments.length, 0);
}
function baseFileName(){
  return sanitizeFileName(els.protocolName.value.trim() || "Protocolo");
}
function setStatus(text){
  if(els.exportStatus) els.exportStatus.textContent = text;
}
function yieldToBrowser(){
  return new Promise(resolve => setTimeout(resolve, 0));
}
function idleToBrowser(){
  return new Promise(resolve => {
    if("requestIdleCallback" in window){
      requestIdleCallback(()=>resolve(), {timeout:250});
    }else{
      setTimeout(resolve, 16);
    }
  });
}

function setStep(step){
  state.step = step;
  [els.step1, els.step2].forEach((screen, i)=>screen?.classList.toggle("active", i + 1 === step));
  els.progressTabs.forEach(tab=>tab.classList.toggle("active", Number(tab.dataset.step) === step));
  window.scrollTo({top:0, behavior:"smooth"});
  saveProject();
}
function validateConfig(){
  const meta = getMeta();
  if(!meta.protocolName){ alert("Completá el nombre del protocolo."); return false; }
  if(!meta.treatments.length){ alert("Cargá al menos un tratamiento."); return false; }
  if(!meta.locations.length){ alert("Agregá al menos una localidad."); return false; }
  const emptyLoc = meta.locations.find(loc=>!loc.name);
  if(emptyLoc){ alert("Todas las localidades necesitan nombre."); return false; }
  const emptyTrial = meta.locations.find(loc=>!loc.trial);
  if(emptyTrial){ alert(`La localidad ${emptyTrial.name || "sin nombre"} necesita trial.`); return false; }
  const noMoments = meta.locations.find(loc=>!loc.moments.length);
  if(noMoments){ alert(`La localidad ${noMoments.name || "sin nombre"} necesita al menos un momento.`); return false; }
  return true;
}

function addLocation(name="", trial="", momentsText=""){
  state.locations.push({
    id: uid("loc"),
    name: name || `Localidad ${state.locations.length + 1}`,
    trial: trial || "",
    momentsText: momentsText || "10 DDA |\n20 DDA |"
  });
  renderAll();
  saveProject();
}
function removeLocation(locId){
  const loc = state.locations.find(l=>l.id === locId);
  if(!loc) return;
  if(!confirm(`¿Eliminar ${loc.name || "esta localidad"}? También se eliminarán sus fotos cargadas.`)) return;
  state.locations = state.locations.filter(l=>l.id !== locId);
  state.photos = state.photos.filter(p=>p.locationId !== locId);
  renderAll();
  saveProject();
}
function moveLocation(locId, delta){
  syncLocationsFromEditor();
  const idx = state.locations.findIndex(l=>l.id === locId);
  const target = idx + delta;
  if(idx < 0 || target < 0 || target >= state.locations.length) return;
  const temp = state.locations[idx];
  state.locations[idx] = state.locations[target];
  state.locations[target] = temp;
  renderAll();
  saveProject();
}
function syncLocationsFromEditor(){
  state.locations = getLocations().map(loc=>({id:loc.id, name:loc.name, trial:loc.trial, momentsText:loc.momentsText}));
}
function renderLocationsEditor(){
  els.locationsEditor.innerHTML = "";
  if(!state.locations.length){
    els.locationsEditor.innerHTML = `<div class="hint-box">Todavía no hay localidades. Usá “Agregar localidad”.</div>`;
    return;
  }
  state.locations.forEach((loc, idx)=>{
    const card = document.createElement("article");
    card.className = "location-editor";
    card.innerHTML = `
      <div class="location-editor-head">
        <div class="location-editor-fields">
          <label>Localidad ${idx + 1}
            <input data-location-name="${escapeHtml(loc.id)}" type="text" value="${escapeHtml(loc.name || "")}" placeholder="Ej: Pergamino">
          </label>
          <label>Trial de esta localidad
            <input data-location-trial="${escapeHtml(loc.id)}" type="text" value="${escapeHtml(loc.trial || "")}" placeholder="Ej: CG01">
          </label>
        </div>
        <div class="location-editor-actions">
          <button class="icon-btn" data-action="move-location-up" data-location-id="${escapeHtml(loc.id)}" type="button" ${idx === 0 ? "disabled" : ""}>↑ Subir</button>
          <button class="icon-btn" data-action="move-location-down" data-location-id="${escapeHtml(loc.id)}" type="button" ${idx === state.locations.length - 1 ? "disabled" : ""}>↓ Bajar</button>
          <button class="btn danger" data-action="remove-location" data-location-id="${escapeHtml(loc.id)}" type="button">Eliminar</button>
        </div>
      </div>
      <label class="wide-label">Momentos de evaluación de esta localidad
        <textarea data-location-moments="${escapeHtml(loc.id)}" placeholder="Un momento por línea. Usá | para agregar fecha. Ej:&#10;10 DDA | 2026-05-20&#10;20 DDA | 2026-06-03">${escapeHtml(loc.momentsText || "")}</textarea>
      </label>
      <div class="small-note">La localidad y su trial viajan juntos en las cajas, el índice y el PowerPoint.</div>
    `;
    els.locationsEditor.appendChild(card);
  });
  els.locationsEditor.querySelectorAll("[data-action='remove-location']").forEach(btn=>{
    btn.addEventListener("click",()=>removeLocation(btn.dataset.locationId));
  });
  els.locationsEditor.querySelectorAll("[data-action='move-location-up']").forEach(btn=>{
    btn.addEventListener("click",()=>moveLocation(btn.dataset.locationId, -1));
  });
  els.locationsEditor.querySelectorAll("[data-action='move-location-down']").forEach(btn=>{
    btn.addEventListener("click",()=>moveLocation(btn.dataset.locationId, 1));
  });
  els.locationsEditor.querySelectorAll("input,textarea").forEach(input=>{
    input.addEventListener("input",()=>{ syncLocationsFromEditor(); renderStats(); renderProjectPreview(); saveProject(); });
  });
}

function isHeicFile(file){
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    type.includes("heic") ||
    type.includes("heif")
  );
}
function isSupportedImageFile(file){
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return (
    type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name) ||
    isHeicFile(file)
  );
}
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen. Si es HEIC, verificá que la conversión esté disponible."));
    img.src = src;
  });
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing = Array.from(document.scripts).find(s => s.src === src);
    if(existing){
      existing.addEventListener("load", resolve, {once:true});
      existing.addEventListener("error", reject, {once:true});
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No se pudo cargar la librería HEIC."));
    document.head.appendChild(script);
  });
}
async function ensureHeicConverter(){
  if(typeof window.heic2any === "function") return window.heic2any;

  const sources = [
    "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js",
    "https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js"
  ];

  for(const src of sources){
    try{
      await loadScript(src);
      if(typeof window.heic2any === "function") return window.heic2any;
    }catch(error){
      console.warn("No se pudo cargar HEIC desde", src, error);
    }
  }

  throw new Error("No se pudo cargar el conversor HEIC. Revisá la conexión a internet o convertí las fotos a JPG antes de cargarlas.");
}
async function convertHeicToJpegDataUrl(file){
  const converter = await ensureHeicConverter();
  const converted = await converter({
    blob: file,
    toType: "image/jpeg",
    quality: .98
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return fileToDataUrl(blob);
}
async function readImageFileAsUsableDataUrl(file){
  if(isHeicFile(file)){
    try{
      return await convertHeicToJpegDataUrl(file);
    }catch(error){
      console.error("Error al convertir HEIC:", error);
      throw new Error(`No se pudo convertir ${file?.name || "la imagen HEIC"}. ${error?.message || ""}`);
    }
  }

  const dataUrl = await fileToDataUrl(file);

  try{
    await loadImage(dataUrl);
    return dataUrl;
  }catch(error){
    const name = String(file?.name || "").toLowerCase();
    if(name.endsWith(".heic") || name.endsWith(".heif")){
      return await convertHeicToJpegDataUrl(file);
    }
    throw error;
  }
}
async function createPreviewThumbnail(dataUrl, maxSide=420){
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const ratio = Math.min(1, maxSide / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(srcW * ratio));
  canvas.height = Math.max(1, Math.round(srcH * ratio));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return {
    thumbDataUrl: canvas.toDataURL("image/jpeg", .72),
    width: srcW,
    height: srcH
  };
}
async function preparePhotoFile(file){
  const dataUrl = await readImageFileAsUsableDataUrl(file);
  const preview = await createPreviewThumbnail(dataUrl, 420);
  return {
    dataUrl,
    thumbDataUrl: preview.thumbDataUrl,
    width: preview.width,
    height: preview.height
  };
}
async function normalizeImageFile(file, mode="original"){
  const dataUrl = await readImageFileAsUsableDataUrl(file);
  const img = await loadImage(dataUrl);
  return { dataUrl, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}
async function urlToDataUrl(url){
  if(!url || String(url).startsWith("data:")) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return fileToDataUrl(blob);
}
async function getBackgroundForPpt(meta){
  try{ return await urlToDataUrl(meta.backgroundSrc || DEFAULT_BACKGROUND_URL); }
  catch(error){ console.warn("No se pudo preparar el fondo", error); return ""; }
}
function dataUrlToBase64(dataUrl){
  const parts = String(dataUrl || "").split(",");
  return parts.length > 1 ? parts[1] : "";
}

function boxKey(locationId, momentId){
  return `${locationId}__${momentId}`;
}
function isBoxOpen(locationId, momentId){
  const key = boxKey(locationId, momentId);
  return state.boxOpenState[key] !== false;
}
function setBoxOpen(locationId, momentId, isOpen){
  const key = boxKey(locationId, momentId);
  state.boxOpenState[key] = Boolean(isOpen);
}

async function addPhotoFiles(files, locationId, momentId){
  const clean = Array.from(files || []).filter(isSupportedImageFile);
  if(!clean.length) return;

  setStatus(`Preparando ${clean.length} foto(s)...`);
  const next = [];
  const baseOrder = state.photos.reduce((max, p)=>Math.max(max, Number(p.order || 0)), -1) + 1;

  for(let i=0;i<clean.length;i++){
    const file = clean[i];
    try{
      setStatus(`${isHeicFile(file) ? "Convirtiendo HEIC" : "Cargando foto"} ${i+1}/${clean.length}: ${file.name}`);
      const fixed = await preparePhotoFile(file);
      next.push({
        id: uid("photo"),
        fileName: file.name,
        dataUrl: fixed.dataUrl,
        thumbDataUrl: fixed.thumbDataUrl,
        width: fixed.width,
        height: fixed.height,
        locationId,
        momentId,
        treatmentId: "",
        rotation: 0,
        order: baseOrder + next.length
      });
    }catch(err){
      alert("No se pudo cargar " + file.name + ". " + (err?.message || ""));
    }

    if((i + 1) % 3 === 0){
      await yieldToBrowser();
    }
  }

  state.photos.push(...next);
  renderDropZones();
  renderStats();
  renderProjectPreview();
  await idleToBrowser();
  saveProject();
  setStatus(`${next.length} foto(s) cargadas. La calidad original queda preservada para exportar.`);
}
function groupPhotos(locationId, momentId){
  return state.photos.filter(p=>p.locationId === locationId && p.momentId === momentId).sort((a,b)=>a.order-b.order);
}
function renderDropZones(){
  const meta = getMeta();
  const treatments = meta.treatments;
  els.dropZones.innerHTML = "";
  if(!meta.locations.length){
    els.dropZones.innerHTML = `<div class="hint-box">Primero configurá localidades y momentos.</div>`;
    return;
  }
  meta.locations.forEach(loc=>{
    loc.moments.forEach(moment=>{
      const photos = groupPhotos(loc.id, moment.id);
      const card = document.createElement("details");
      card.className = "moment-card";
      card.dataset.locationId = loc.id;
      card.dataset.momentId = moment.id;
      card.open = isBoxOpen(loc.id, moment.id);
      card.innerHTML = `
        <summary class="moment-header">
          <div>
            <h3>${escapeHtml(loc.name)} · ${escapeHtml(loc.trial || "Sin trial")} · ${escapeHtml(moment.name)}</h3>
            <small>${escapeHtml(moment.date || "Sin fecha")} · ${photos.length} foto(s)</small>
          </div>
          <div class="moment-actions">
            <button class="icon-btn" data-action="auto-assign-box" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="button">Autoasignar esta caja</button>
            <button class="icon-btn" data-action="sort-name-box" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="button">Ordenar por nombre</button>
            <button class="icon-btn danger" data-action="clear-box" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="button">Vaciar caja</button>
          </div>
        </summary>
        <div class="moment-content">
          <div class="drop-zone" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}">
            <div><strong>Arrastrá fotos acá</strong><span>${escapeHtml(loc.name)} · ${escapeHtml(loc.trial || "Sin trial")} · ${escapeHtml(moment.name)}</span></div>
          </div>
          <input class="hidden box-file-input" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="file" accept="image/*,.heic,.heif" multiple>
          <div class="photo-list">${photos.map(photo=>renderPhotoItem(photo, treatments)).join("")}</div>
        </div>
      `;
      card.addEventListener("toggle",()=>{
        setBoxOpen(loc.id, moment.id, card.open);
        saveProject();
      });
      els.dropZones.appendChild(card);
    });
  });

  els.dropZones.querySelectorAll(".drop-zone").forEach(zone=>{
    const locationId = zone.dataset.locationId;
    const momentId = zone.dataset.momentId;
    const input = els.dropZones.querySelector(`.box-file-input[data-location-id="${CSS.escape(locationId)}"][data-moment-id="${CSS.escape(momentId)}"]`);
    zone.addEventListener("click",()=>input.click());
    ["dragenter","dragover"].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add("drag-over");}));
    ["dragleave","drop"].forEach(evt=>zone.addEventListener(evt,e=>{
      e.preventDefault(); zone.classList.remove("drag-over");
      if(evt === "drop") addPhotoFiles(e.dataTransfer.files, locationId, momentId);
    }));
    input.addEventListener("change",e=>{ addPhotoFiles(e.target.files, locationId, momentId); input.value = ""; });
  });
  els.dropZones.querySelectorAll("[data-action='auto-assign-box']").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      autoAssignBox(btn.dataset.locationId, btn.dataset.momentId);
    });
  });
  els.dropZones.querySelectorAll("[data-action='sort-name-box']").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      sortBoxByName(btn.dataset.locationId, btn.dataset.momentId);
    });
  });
  els.dropZones.querySelectorAll("[data-action='clear-box']").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      clearBoxPhotos(btn.dataset.locationId, btn.dataset.momentId);
    });
  });
  els.dropZones.querySelectorAll("[data-action='treatment']").forEach(sel=>{
    sel.addEventListener("change",async()=>{
      const photo = state.photos.find(p=>p.id === sel.dataset.photoId);
      if(photo) photo.treatmentId = sel.value;
      renderStats(); renderProjectPreview(); await saveProject();
    });
  });
  els.dropZones.querySelectorAll("[data-action='remove']").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      state.photos = state.photos.filter(p=>p.id !== btn.dataset.photoId);
      renderAll(); await saveProject();
    });
  });
  els.dropZones.querySelectorAll("[data-action='rotate']").forEach(btn=>{
    btn.addEventListener("click",async()=>rotatePhoto90(btn.dataset.photoId));
  });
  els.dropZones.querySelectorAll("[data-action='up'],[data-action='down']").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      movePhoto(btn.dataset.photoId, btn.dataset.action === "up" ? -1 : 1);
      renderAll(); await saveProject();
    });
  });
}
function renderPhotoItem(photo, treatments){
  const rotation = getRotation(photo);
  return `
    <div class="photo-item">
      <div class="photo-thumb-wrap"><img src="${photo.thumbDataUrl || photo.dataUrl}" alt="${escapeHtml(photo.fileName)}" style="transform:rotate(${rotation}deg)"></div>
      <div class="photo-meta">
        <p>${escapeHtml(photo.fileName)}</p>
        <select data-action="treatment" data-photo-id="${escapeHtml(photo.id)}">
          <option value="">Seleccionar tratamiento...</option>
          ${treatments.map(t=>`<option value="${escapeHtml(t.id)}" ${photo.treatmentId === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
        </select>
        <div class="photo-actions">
          <button class="icon-btn" data-action="up" data-photo-id="${escapeHtml(photo.id)}" type="button">↑</button>
          <button class="icon-btn" data-action="down" data-photo-id="${escapeHtml(photo.id)}" type="button">↓</button>
          <button class="icon-btn" data-action="rotate" data-photo-id="${escapeHtml(photo.id)}" type="button">Rotar ↻</button>
          <button class="icon-btn danger" data-action="remove" data-photo-id="${escapeHtml(photo.id)}" type="button">Eliminar</button>
        </div>
      </div>
    </div>
  `;
}
function getRotation(photo){
  return ((Number(photo?.rotation || 0) % 360) + 360) % 360;
}
async function rotatePhoto90(photoId){
  const photo = state.photos.find(p=>p.id === photoId);
  if(!photo) return;
  photo.rotation = (getRotation(photo) + 90) % 360;
  renderAll(); await saveProject();
}
function movePhoto(photoId, delta){
  const photo = state.photos.find(p=>p.id === photoId);
  if(!photo) return;
  const group = groupPhotos(photo.locationId, photo.momentId);
  const i = group.findIndex(p=>p.id === photoId);
  const j = i + delta;
  if(j < 0 || j >= group.length) return;
  const tmp = group[i].order;
  group[i].order = group[j].order;
  group[j].order = tmp;
}
function autoAssignBox(locationId, momentId){
  const treatments = getTreatments();
  if(!treatments.length){ alert("Primero cargá tratamientos."); return; }
  const photos = groupPhotos(locationId, momentId);
  if(!photos.length){ alert("Esta caja no tiene fotos cargadas."); return; }
  const block = Math.ceil(photos.length / treatments.length);
  photos.forEach((photo, idx)=>{
    const tIndex = Math.min(treatments.length - 1, Math.floor(idx / block));
    photo.treatmentId = treatments[tIndex].id;
  });
  renderAll(); saveProject();
}
function sortBoxByName(locationId, momentId){
  const photos = groupPhotos(locationId, momentId);
  if(photos.length < 2){
    alert("Esta caja necesita al menos dos fotos para ordenar.");
    return;
  }
  photos
    .sort((a,b)=>String(a.fileName || "").localeCompare(String(b.fileName || ""), "es", {numeric:true, sensitivity:"base"}))
    .forEach((photo, idx)=>{ photo.order = idx; });
  renderAll();
  saveProject();
}
function clearBoxPhotos(locationId, momentId){
  const photos = groupPhotos(locationId, momentId);
  if(!photos.length){
    alert("Esta caja no tiene fotos para vaciar.");
    return;
  }
  if(!confirm(`¿Eliminar las ${photos.length} foto(s) de esta caja?`)) return;
  state.photos = state.photos.filter(p=>!(p.locationId === locationId && p.momentId === momentId));
  renderAll();
  saveProject();
}

function clearPhotosOnly(){
  if(!state.photos.length){ alert("No hay fotos cargadas."); return; }
  if(!confirm("¿Eliminar todas las fotos cargadas? La configuración se mantiene.")) return;
  state.photos = [];
  renderAll(); saveProject();
}

function renderStats(){
  const meta = getMeta();
  els.photoCounter.textContent = `${state.photos.length} foto${state.photos.length === 1 ? "" : "s"}`;
  els.locationCount.textContent = meta.locations.length;
  els.momentCount.textContent = countMoments(meta.locations);
  els.treatmentCount.textContent = meta.treatments.length;
  els.assignedCount.textContent = state.photos.filter(p=>p.treatmentId).length;
}
function renderProjectPreview(){
  const meta = getMeta();
  if(!meta.locations.length){
    els.projectPreview.className = "assignment-preview empty";
    els.projectPreview.textContent = "Sin localidades cargadas.";
    return;
  }
  els.projectPreview.className = "assignment-preview";
  els.projectPreview.innerHTML = meta.locations.map(loc=>{
    const count = state.photos.filter(p=>p.locationId === loc.id).length;
    const moments = loc.moments.map(m=>m.date ? `${m.name} (${m.date})` : m.name).join(" · ") || "Sin momentos";
    return `<div class="assignment-row"><strong>${escapeHtml(loc.name)} · ${escapeHtml(loc.trial || "Sin trial")}</strong><small>${escapeHtml(moments)}<br>${count} foto(s)</small></div>`;
  }).join("");
}
function renderAll(){
  renderLocationsEditor();
  renderDropZones();
  renderStats();
  renderProjectPreview();
}

function fitContain(imgW,imgH,boxW,boxH){
  const r = imgW / imgH;
  const br = boxW / boxH;
  let w,h;
  if(r > br){ w = boxW; h = boxW / r; } else { h = boxH; w = boxH * r; }
  return {w,h,x:(boxW-w)/2,y:(boxH-h)/2};
}
function chunk(arr,size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}
async function makeRotatedImageData(photo, quality=.98){
  const rotation = getRotation(photo);
  const img = await loadImage(photo.dataUrl);
  const baseW = photo.width || img.naturalWidth || img.width;
  const baseH = photo.height || img.naturalHeight || img.height;
  const rotated = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = rotated ? baseH : baseW;
  canvas.height = rotated ? baseW : baseH;
  const ctx = canvas.getContext("2d", {alpha:false});
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -baseW/2, -baseH/2, baseW, baseH);
  ctx.restore();
  return {dataUrl: canvas.toDataURL("image/jpeg", quality), width: canvas.width, height: canvas.height};
}
async function makeLabeledImage(photo, meta){
  const fixed = await makeRotatedImageData(photo, meta.qualityMode === "light" ? .82 : .98);
  const img = await loadImage(fixed.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = fixed.width;
  canvas.height = fixed.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const loc = meta.locations.find(l=>l.id === photo.locationId) || {};
  const moment = (loc.moments || []).find(m=>m.id === photo.momentId) || {};
  const treatment = meta.treatments.find(t=>t.id === photo.treatmentId) || {};
  const fields = [
    ["Protocolo", meta.protocolName], ["Localidad", loc.name || ""], ["Momento", moment.name || ""], ["Fecha", moment.date || ""], ["Tratamiento", treatment.name || ""]
  ];
  const padX = Math.max(14, Math.round(canvas.width * .014));
  const fontSize = Math.max(13, Math.round(canvas.width * .014));
  const labelFontSize = Math.max(11, Math.round(fontSize * .78));
  const bandH = Math.max(Math.round(fontSize * 2.6), Math.round(canvas.height * .064));
  const y0 = canvas.height - bandH;
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.fillRect(0,y0,canvas.width,bandH);
  ctx.strokeStyle = "rgba(53,24,94,.22)";
  ctx.lineWidth = Math.max(1, Math.round(canvas.width * .001));
  ctx.beginPath(); ctx.moveTo(0,y0); ctx.lineTo(canvas.width,y0); ctx.stroke();
  const colW = (canvas.width - padX * 2) / fields.length;
  fields.forEach(([label,value],idx)=>{
    const x = padX + idx * colW;
    ctx.fillStyle = "#6f6680"; ctx.font = `800 ${labelFontSize}px Arial, sans-serif`; ctx.textBaseline = "top";
    ctx.fillText(label + ":", x, y0 + Math.round(bandH * .18));
    ctx.fillStyle = "#24113f"; ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    let text = String(value || "");
    while(ctx.measureText(text).width > colW - 8 && text.length > 8) text = text.slice(0,-2) + "…";
    ctx.fillText(text, x, y0 + Math.round(bandH * .50));
  });
  return canvas.toDataURL("image/jpeg", meta.qualityMode === "light" ? .82 : .98);
}

function addBackground(slide, meta){
  if(meta.pptBackgroundSrc) slide.addImage({data:meta.pptBackgroundSrc,x:0,y:0,w:13.333,h:7.5});
  else slide.background = {color:"FFFFFF"};
}
function addFooter(slide, text){
  const footerW = 8.5;
  const footerX = (13.333 - footerW) / 2;
  slide.addShape("rect",{x:footerX,y:6.82,w:footerW,h:.56,fill:{color:"FFFFFF",transparency:4},line:{color:"E7DEF5"}});
  slide.addText(text,{x:footerX+.12,y:6.94,w:footerW-.24,h:.24,fontFace:"Arial",fontSize:10,bold:true,color:"35185E",align:"center",fit:"shrink"});
}
function addTitle(slide, title, subtitle=""){
  slide.addShape("rect",{x:.75,y:1.25,w:11.85,h:4.85,fill:{color:"FFFFFF",transparency:6},line:{color:"E7DEF5"}});
  slide.addText(title,{x:1.05,y:1.82,w:11.1,h:.7,fontFace:"Arial",fontSize:29,bold:true,color:"35185E",align:"center",fit:"shrink"});
  if(subtitle) slide.addText(subtitle,{x:1.25,y:2.68,w:10.7,h:.5,fontFace:"Arial",fontSize:15,bold:true,color:"17072C",align:"center",fit:"shrink"});
}
function getMomentPhotoCount(loc, moment){
  return state.photos.filter(p => p.locationId === loc.id && p.momentId === moment.id).length;
}

function buildSummaryRows(meta, onlyLocation = null){
  const locations = onlyLocation ? [onlyLocation] : meta.locations;
  const rows = [];
  locations.forEach(loc => {
    const moments = Array.isArray(loc.moments) ? loc.moments : [];
    if(!moments.length){
      rows.push({
        locality: loc.name || "-",
        trial: loc.trial || "-",
        moment: "-",
        photos: String(state.photos.filter(p => p.locationId === loc.id).length),
        first: true
      });
      return;
    }
    moments.forEach((moment, idx) => {
      rows.push({
        locality: loc.name || "-",
        trial: loc.trial || "-",
        moment: moment.date ? `${moment.name} · ${moment.date}` : moment.name,
        photos: String(getMomentPhotoCount(loc, moment)),
        first: idx === 0
      });
    });
  });
  return rows;
}

function drawSummaryTable(slide, rows, options = {}){
  const x = options.x ?? 1.0;
  const y = options.y ?? 2.25;
  const w = options.w ?? 11.35;
  const headerH = options.headerH ?? .34;
  const rowH = options.rowH ?? .30;
  const fontSize = options.fontSize ?? 7.6;
  const colW = options.colW || [2.55, 1.65, 5.95, 1.2];
  const headers = ["Localidad", "Trial", "Momento", "Fotos"];
  const totalW = colW.reduce((a,b)=>a+b,0);
  const scale = w / totalW;
  const widths = colW.map(v => v * scale);
  const tableH = headerH + rowH * rows.length;

  slide.addShape("rect",{x,y,w,h:tableH,fill:{color:"FFFFFF",transparency:2},line:{color:"E7DEF5",pt:1}});

  let cx = x;
  headers.forEach((header, i)=>{
    slide.addShape("rect",{x:cx,y,w:widths[i],h:headerH,fill:{color:"4B2385"},line:{color:"E7DEF5",pt:.5}});
    slide.addText(header,{x:cx+.04,y:y+.085,w:widths[i]-.08,h:.12,fontFace:"Arial",fontSize:8.2,bold:true,color:"FFFFFF",align:i===3?"center":"left",fit:"shrink"});
    cx += widths[i];
  });

  rows.forEach((row, idx)=>{
    const ry = y + headerH + idx * rowH;
    const fill = idx % 2 === 0 ? "FFFFFF" : "F7F2FF";
    let xx = x;
    const values = ["", "", row.moment, row.photos];

    values.forEach((value, col)=>{
      slide.addShape("rect",{x:xx,y:ry,w:widths[col],h:rowH,fill:{color:fill,transparency:0},line:{color:"E7DEF5",pt:.45}});
      if(value){
        slide.addText(value,{
          x:xx+.05,
          y:ry + Math.max(.035, rowH/2 - .07),
          w:widths[col]-.1,
          h:.14,
          fontFace:"Arial",
          fontSize,
          bold:col === 3,
          color:"24113F",
          align:col===3?"center":"left",
          valign:"mid",
          fit:"shrink"
        });
      }
      xx += widths[col];
    });
  });

  let groupStart = 0;
  for(let idx = 0; idx <= rows.length; idx++){
    const changed = idx === rows.length || rows[idx].first;
    if(changed){
      if(idx > groupStart){
        const gy = y + headerH + groupStart * rowH;
        const gh = (idx - groupStart) * rowH;
        const fill = groupStart % 2 === 0 ? "FFFFFF" : "F7F2FF";
        slide.addShape("rect",{x,y:gy,w:widths[0],h:gh,fill:{color:fill,transparency:0},line:{color:"E7DEF5",pt:.65}});
        slide.addText(rows[groupStart].locality,{x:x+.05,y:gy+gh/2-.07,w:widths[0]-.1,h:.14,fontFace:"Arial",fontSize,bold:true,color:"35185E",align:"center",valign:"mid",fit:"shrink"});
        slide.addShape("rect",{x:x+widths[0],y:gy,w:widths[1],h:gh,fill:{color:fill,transparency:0},line:{color:"E7DEF5",pt:.65}});
        slide.addText(rows[groupStart].trial,{x:x+widths[0]+.05,y:gy+gh/2-.07,w:widths[1]-.1,h:.14,fontFace:"Arial",fontSize,bold:true,color:"35185E",align:"center",valign:"mid",fit:"shrink"});
      }
      groupStart = idx;
    }
  }
}

function addSummaryTable(slide, meta, options = {}){
  const rows = buildSummaryRows(meta, options.location || null);
  const x = options.x ?? 1.0;
  const y = options.y ?? 2.25;
  const w = options.w ?? 11.35;
  const maxH = options.h ?? 3.95;
  const headerH = options.headerH ?? .34;
  const baseRowH = options.rowH ?? .30;
  const minRowH = options.minRowH ?? .24;
  const fontSize = options.fontSize ?? 7.6;
  const colW = options.colW || [2.55, 1.65, 5.95, 1.2];
  const allowSplit = options.allowSplit !== false;
  const maxRowsAtBase = Math.max(1, Math.floor((maxH - headerH) / baseRowH));

  if(allowSplit && rows.length > maxRowsAtBase && rows.length > 1){
    const gap = options.splitGap ?? .25;
    const halfW = (w - gap) / 2;
    const rowsPerTable = Math.ceil(rows.length / 2);
    const leftRows = rows.slice(0, rowsPerTable);
    const rightRows = rows.slice(rowsPerTable);
    if(rightRows.length) rightRows[0] = {...rightRows[0], first:true};

    const rowH = Math.max(minRowH, Math.min(baseRowH, (maxH - headerH) / Math.max(leftRows.length, rightRows.length, 1)));
    const fs = Math.max(6.1, Math.min(fontSize, rowH * 23));

    drawSummaryTable(slide, leftRows, {x,y,w:halfW,headerH,rowH,fontSize:fs,colW});
    drawSummaryTable(slide, rightRows, {x:x+halfW+gap,y,w:halfW,headerH,rowH,fontSize:fs,colW});
    return;
  }

  const rowH = Math.max(.18, Math.min(baseRowH, (maxH - headerH) / Math.max(1, rows.length)));
  const fs = Math.max(5.6, Math.min(fontSize, rowH * 23));
  drawSummaryTable(slide, rows, {x,y,w,headerH,rowH,fontSize:fs,colW});
}

function addCover(slide, meta){
  addBackground(slide, meta);
  slide.addShape("rect",{x:.75,y:.62,w:11.85,h:6.08,fill:{color:"FFFFFF",transparency:6},line:{color:"E7DEF5"}});
  slide.addText("Resultados",{x:1.05,y:.95,w:11.1,h:.48,fontFace:"Arial",fontSize:26,bold:true,color:"35185E",align:"center",fit:"shrink"});
  slide.addText(meta.protocolName,{x:1.25,y:1.43,w:10.7,h:.35,fontFace:"Arial",fontSize:14,bold:true,color:"17072C",align:"center",fit:"shrink"});
  slide.addText(`Localidades: ${meta.locations.length}   |   Tratamientos: ${meta.treatments.length}   |   Momentos: ${countMoments(meta.locations)}`,{x:1.25,y:1.82,w:10.7,h:.25,fontFace:"Arial",fontSize:10.5,bold:true,color:"6F6680",align:"center",fit:"shrink"});
  addSummaryTable(slide, meta, {x:1.0,y:2.22,w:11.35,h:4.05,rowH:.30,fontSize:7.6});
}
function addIndexSlide(slide, meta){
  addBackground(slide, meta);
  slide.addShape("rect",{x:.75,y:.62,w:11.85,h:6.08,fill:{color:"FFFFFF",transparency:6},line:{color:"E7DEF5"}});
  slide.addText("Índice del PowerPoint",{x:1.05,y:.95,w:11.1,h:.4,fontFace:"Arial",fontSize:22,bold:true,color:"35185E",align:"center",fit:"shrink"});
  slide.addText("Detalle por localidad, trial, momento de evaluación y cantidad de fotos cargadas",{x:1.15,y:1.43,w:11,h:.28,fontFace:"Arial",fontSize:10.5,bold:true,color:"6F6680",align:"center",fit:"shrink"});
  addSummaryTable(slide, meta, {x:1.0,y:1.95,w:11.35,h:4.65,rowH:.30,fontSize:7.6});
}
function addSectionSlide(slide, meta, title, subtitle, loc = null){
  addBackground(slide, meta);
  slide.addShape("rect",{x:.75,y:.72,w:11.85,h:5.98,fill:{color:"FFFFFF",transparency:6},line:{color:"E7DEF5"}});
  slide.addText(title,{x:1.05,y:1.0,w:11.1,h:.42,fontFace:"Arial",fontSize:23,bold:true,color:"35185E",align:"center",fit:"shrink"});
  if(subtitle) slide.addText(subtitle,{x:1.25,y:1.48,w:10.7,h:.25,fontFace:"Arial",fontSize:10.5,bold:true,color:"6F6680",align:"center",fit:"shrink"});
  if(loc) addSummaryTable(slide, meta, {location:loc,x:1.2,y:2.05,w:10.95,h:4.2,rowH:.36,fontSize:8.2,colW:[2.65,1.75,5.7,1.15]});
}
async function addPhotoRow(slide, photos, bottomLabels, footerText, meta){
  addBackground(slide, meta);
  const n = photos.length;
  const area = {x:.55,y:1.02,w:12.25,h:5.22};
  const labelH = .46;
  const gap = .17;
  const cellW = (area.w - gap*(n-1))/n;
  const imgH = area.h - labelH - .08;
  const fixed = await Promise.all(photos.map(p=>makeRotatedImageData(p, meta.qualityMode === "light" ? .82 : .98)));
  fixed.forEach((fp,i)=>{
    const x = area.x + i*(cellW+gap);
    const fit = fitContain(fp.width, fp.height, cellW, imgH);
    slide.addShape("rect",{x,y:area.y,w:cellW,h:imgH,fill:{color:"FFFFFF",transparency:0},line:{color:"E7DEF5"}});
    slide.addImage({data:fp.dataUrl,x:x+fit.x,y:area.y+fit.y,w:fit.w,h:fit.h});
    slide.addShape("rect",{x,y:area.y+imgH+.06,w:cellW,h:labelH,fill:{color:"FFFFFF",transparency:0},line:{color:"E7DEF5"}});
    slide.addText(bottomLabels[i] || "",{x:x+.04,y:area.y+imgH+.145,w:cellW-.08,h:.24,fontFace:"Arial",fontSize:10,bold:true,color:"35185E",align:"center",fit:"shrink"});
  });
  addFooter(slide, footerText);
}
async function createPptBlob(){
  const PptxConstructor = window.pptxgenjs || window.PptxGenJS || window.pptxgen;
  if(typeof PptxConstructor !== "function") throw new Error("No se cargó PptxGenJS. Verificá que pptxgen.bundle.js esté en la raíz del repo.");
  const meta = getMeta();
  meta.pptBackgroundSrc = await getBackgroundForPpt(meta);
  const pptx = new PptxConstructor();
  window.pptx = pptx;
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Etiquetador de fotos V2";
  pptx.subject = "Fotos etiquetadas por protocolo y localidades";
  pptx.title = meta.protocolName;
  pptx.theme = {headFontFace:"Arial",bodyFontFace:"Arial",lang:"es-AR"};

  pptx.addSection({ title: "Carátula e índice" });
  let slide = pptx.addSlide({ sectionTitle: "Carátula e índice" });
  addCover(slide, meta);
  slide = pptx.addSlide({ sectionTitle: "Carátula e índice" });
  addIndexSlide(slide, meta);

  for(const loc of meta.locations){
    const sectionTitle = `${loc.name} · ${loc.trial || "Sin trial"}`;
    pptx.addSection({ title: sectionTitle });
    slide = pptx.addSlide({ sectionTitle });
    addSectionSlide(slide, meta, `Localidad: ${loc.name}`, `Trial: ${loc.trial || "-"} · Bloque 1 · Fotos ordenadas por momento`, loc);

    for(const moment of loc.moments){
      const photosMoment = state.photos.filter(p=>p.locationId === loc.id && p.momentId === moment.id && p.treatmentId).sort((a,b)=>a.order-b.order);
      const ordered = meta.treatments.flatMap(t=>photosMoment.filter(p=>p.treatmentId === t.id));
      for(const group of chunk(ordered, meta.photosPerSlide)){
        slide = pptx.addSlide({ sectionTitle });
        const labels = group.map(p=>(meta.treatments.find(t=>t.id === p.treatmentId) || {}).name || "");
        const footer = `Protocolo: ${meta.protocolName}   |   Localidad: ${loc.name}   |   Trial: ${loc.trial || ""}   |   Momento: ${moment.name}   |   Fecha: ${moment.date || ""}`;
        await addPhotoRow(slide, group, labels, footer, meta);
        await yieldToBrowser();
      }
    }

    slide = pptx.addSlide({ sectionTitle });
    addSectionSlide(slide, meta, `Localidad: ${loc.name}`, `Trial: ${loc.trial || "-"} · Bloque 2 · Fotos ordenadas por tratamiento`, loc);

    for(const treatment of meta.treatments){
      const photosTreat = state.photos.filter(p=>p.locationId === loc.id && p.treatmentId === treatment.id).sort((a,b)=>a.order-b.order);
      const ordered = loc.moments.flatMap(m=>photosTreat.filter(p=>p.momentId === m.id));
      for(const group of chunk(ordered, meta.photosPerSlide)){
        slide = pptx.addSlide({ sectionTitle });
        const labels = group.map(p=>(loc.moments.find(m=>m.id === p.momentId) || {}).name || "");
        const footer = `Protocolo: ${meta.protocolName}   |   Localidad: ${loc.name}   |   Trial: ${loc.trial || ""}   |   Tratamiento: ${treatment.name}`;
        await addPhotoRow(slide, group, labels, footer, meta);
        await yieldToBrowser();
      }
    }
  }
  return await pptx.write("blob");
}
async function createPhotosZip(){
  const meta = getMeta();
  const zip = new JSZip();
  const folder = zip.folder(baseFileName() + "_fotos");
  const used = new Map();
  for(let i=0;i<state.photos.length;i++){
    const photo = state.photos[i];
    const loc = meta.locations.find(l=>l.id === photo.locationId) || {};
    const moment = (loc.moments || []).find(m=>m.id === photo.momentId) || {};
    const treatment = meta.treatments.find(t=>t.id === photo.treatmentId) || {};
    const labeled = await makeLabeledImage(photo, meta);
    const base = sanitizeFileName(`${meta.protocolName}_${loc.name || "localidad"}_${loc.trial || "trial"}_${moment.name || "momento"}_${treatment.name || "sin_tratamiento"}`);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    const name = `${base}${n ? `_foto_${n+1}` : ""}.jpg`;
    folder.file(name, dataUrlToBase64(labeled), {base64:true});
    setStatus(`Generando fotos ${i+1}/${state.photos.length}...`);
    if((i + 1) % 3 === 0) await yieldToBrowser();
  }
  return zip;
}
function downloadBlob(blob, fileName){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2500);
}
async function downloadPhotos(){
  if(!state.photos.length){ alert("Primero cargá fotos."); return; }
  setStatus("Generando ZIP de fotos...");
  const zip = await createPhotosZip();
  const blob = await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  downloadBlob(blob, baseFileName() + "_fotos.zip");
  setStatus("ZIP de fotos descargado.");
}
async function downloadPpt(){
  if(!state.photos.length){ alert("Primero cargá fotos."); return; }
  setStatus("Generando PowerPoint...");
  const blob = await createPptBlob();
  downloadBlob(blob, baseFileName() + ".pptx");
  setStatus("PowerPoint descargado.");
}
async function downloadAll(){
  if(!state.photos.length){ alert("Primero cargá fotos."); return; }
  setStatus("Generando descarga completa...");
  const finalZip = new JSZip();
  const photosZip = await createPhotosZip();
  const photosBlob = await photosZip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  const pptBlob = await createPptBlob();
  const base = baseFileName();
  finalZip.file(base + "_fotos.zip", await photosBlob.arrayBuffer(), {binary:true});
  finalZip.file(base + ".pptx", await pptBlob.arrayBuffer(), {binary:true});
  const blob = await finalZip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
  downloadBlob(blob, base + "_descarga_completa.zip");
  setStatus("Descarga completa generada.");
}

async function writeCurrentProject(){
  if(!state.hydrated) return;
  syncLocationsFromEditor();
  if(!state.currentProjectId) state.currentProjectId = makeProjectId();
  const project = {
    id: state.currentProjectId,
    protocolName: els.protocolName.value,
    treatmentsInput: els.treatmentsInput.value,
    photosPerSlide: els.photosPerSlide.value,
    qualityMode: els.qualityMode.value,
    backgroundSrc: state.backgroundSrc,
    locations: state.locations,
    photos: state.photos,
    boxOpenState: state.boxOpenState,
    step: state.step,
    updatedAt: new Date().toISOString()
  };
  await dbSet(PROJECT_KEY, project);
  await dbSet("project_" + state.currentProjectId, project);
  await dbSet(ACTIVE_PROJECT_ID_KEY, state.currentProjectId);
  await upsertProjectInList(state.currentProjectId, getCurrentProjectTitle());
}

const saveProject = debounce(writeCurrentProject, 500);
async function applyProject(project){
  if(project){
    state.currentProjectId = project.id || state.currentProjectId || makeProjectId();
    els.protocolName.value = project.protocolName || "";
    els.treatmentsInput.value = project.treatmentsInput || "";
    els.photosPerSlide.value = project.photosPerSlide || "3";
    els.qualityMode.value = project.qualityMode || "original";
    state.backgroundSrc = project.backgroundSrc || DEFAULT_BACKGROUND_URL;
    state.locations = Array.isArray(project.locations) ? project.locations : [];
    state.photos = Array.isArray(project.photos) ? project.photos : [];
    state.boxOpenState = project.boxOpenState && typeof project.boxOpenState === "object" ? project.boxOpenState : {};
    state.step = project.step || 1;
  }else{
    resetCurrentProject();
  }
  renderAll();
  await refreshProjectSelector();
  setStep(state.step || 1);
}
async function loadProject(){
  const activeId = await dbGet(ACTIVE_PROJECT_ID_KEY);
  let project = activeId ? await dbGet("project_" + activeId) : null;
  if(!project) project = await dbGet(PROJECT_KEY);
  if(project && !project.id) project.id = activeId || makeProjectId();
  state.hydrated = true;
  await applyProject(project);
}
async function loadProjectById(projectId){
  if(!projectId) return;
  const project = await dbGet("project_" + projectId);
  if(!project){ alert("No se encontró ese proyecto guardado."); return; }
  await dbSet(ACTIVE_PROJECT_ID_KEY, projectId);
  state.currentProjectId = projectId;
  await applyProject(project);
}
async function startNewProject(){
  if(state.photos.length || els.protocolName.value || state.locations.length){
    const ok = confirm("¿Crear un proyecto nuevo? El proyecto actual queda guardado localmente.");
    if(!ok) return;
    await writeCurrentProject();
  }
  resetCurrentProject();
  renderAll();
  setStep(1);
  await writeCurrentProject();
}
function bindEvents(){
  els.progressTabs.forEach(tab=>tab.addEventListener("click",()=>{
    const target = Number(tab.dataset.step);
    if(target > 1 && !validateConfig()) return;
    renderAll(); setStep(target);
  }));
  els.btnStepConfig?.addEventListener("click",()=>setStep(1));
  els.btnNewProject?.addEventListener("click",()=>startNewProject().catch(err=>{console.error(err);alert(err.message || err);}));
  els.btnNewProjectTop?.addEventListener("click",()=>startNewProject().catch(err=>{console.error(err);alert(err.message || err);}));
  els.btnSaveProject?.addEventListener("click",()=>writeCurrentProject().then(()=>refreshProjectSelector()).then(()=>setStatus("Proyecto guardado localmente.")).catch(err=>{console.error(err);alert(err.message || err);}));
  els.btnSaveProjectTop?.addEventListener("click",()=>writeCurrentProject().then(()=>refreshProjectSelector()).then(()=>setStatus("Proyecto guardado localmente.")).catch(err=>{console.error(err);alert(err.message || err);}));
  els.projectSelect?.addEventListener("change",()=>loadProjectById(els.projectSelect.value).catch(err=>{console.error(err);alert(err.message || err);}));
  els.btnGoPhotos?.addEventListener("click",()=>{ if(!validateConfig()) return; renderAll(); setStep(2); });
  els.btnBackConfig?.addEventListener("click",()=>setStep(1));
  els.btnAddLocation?.addEventListener("click",()=>addLocation());
  els.btnClearPhotos?.addEventListener("click",clearPhotosOnly);
  els.btnClearProject?.addEventListener("click",async()=>{
    if(!confirm("¿Seguro que querés limpiar el proyecto actual? Las fotos y la configuración se vacían, pero otros proyectos guardados se mantienen.")) return;
    const currentId = state.currentProjectId;
    resetCurrentProject();
    if(currentId) await dbDelete("project_" + currentId);
    await dbSet(PROJECT_KEY, null);
    await dbSet(ACTIVE_PROJECT_ID_KEY, state.currentProjectId);
    const list = (await getProjectList()).filter(p=>p.id !== currentId);
    await setProjectList(list);
    renderAll();
    await refreshProjectSelector();
    setStep(1);
  });
  [els.protocolName,els.treatmentsInput,els.photosPerSlide,els.qualityMode].filter(Boolean).forEach(el=>{
    el.addEventListener("input",()=>{ renderStats(); renderProjectPreview(); saveProject(); });
    el.addEventListener("change",()=>{ renderStats(); renderProjectPreview(); saveProject(); });
  });
  els.btnChangeBg?.addEventListener("click",()=>els.bgInput.click());
  els.btnResetBg?.addEventListener("click",()=>{ state.backgroundSrc = DEFAULT_BACKGROUND_URL; saveProject(); });
  els.bgInput?.addEventListener("change",async e=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      setStatus(`Preparando fondo: ${file.name}`);
      const fixed = await normalizeImageFile(file, "high");
      state.backgroundSrc = fixed.dataUrl;
      await saveProject();
      setStatus("Fondo actualizado.");
    }catch(error){
      console.error(error);
      alert(error?.message || "No se pudo cargar el fondo.");
      setStatus("No se pudo cargar el fondo.");
    }finally{
      e.target.value = "";
    }
  });
  els.btnDownloadPhotos?.addEventListener("click",()=>downloadPhotos().catch(err=>{console.error(err);alert(err.message || err);setStatus("Error al exportar fotos.");}));
  els.btnDownloadPpt?.addEventListener("click",()=>downloadPpt().catch(err=>{console.error(err);alert(err.message || err);setStatus("Error al exportar PowerPoint.");}));
  els.btnDownloadAll?.addEventListener("click",()=>downloadAll().catch(err=>{console.error(err);alert(err.message || err);setStatus("Error al generar descarga completa.");}));
}

window.addEventListener("error", event=>{
  console.error("Error general:", event.error || event.message);
  setStatus("Error detectado: " + (event.message || "revisar consola"));
});

bindEvents();
loadProject();
