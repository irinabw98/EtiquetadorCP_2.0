const DEFAULT_BACKGROUND_URL = "fondo-default.jpg";
const DB_NAME = "etiquetador_fotos_protocolos_v2";
const DB_STORE = "project";
const PROJECT_KEY = "current_project";

const state = {
  step: 1,
  protocolName: "",
  treatmentsInput: "",
  photosPerSlide: 3,
  qualityMode: "original",
  backgroundSrc: DEFAULT_BACKGROUND_URL,
  locations: [],
  photos: [],
  hydrated: false
};

const $ = (id) => document.getElementById(id);
const els = {
  progressTabs: Array.from(document.querySelectorAll(".progress-tab")),
  step1: $("step1"),
  step2: $("step2"),
  btnStepConfig: $("btnStepConfig"),
  btnClearProject: $("btnClearProject"),
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
    const text = document.querySelector(`[data-location-moments="${CSS.escape(loc.id)}"]`);
    return {
      id: loc.id,
      name: (input?.value || loc.name || `Localidad ${idx+1}`).trim(),
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
  const noMoments = meta.locations.find(loc=>!loc.moments.length);
  if(noMoments){ alert(`La localidad ${noMoments.name || "sin nombre"} necesita al menos un momento.`); return false; }
  return true;
}

function addLocation(name="", momentsText=""){
  state.locations.push({
    id: uid("loc"),
    name: name || `Localidad ${state.locations.length + 1}`,
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
function syncLocationsFromEditor(){
  state.locations = getLocations().map(loc=>({id:loc.id, name:loc.name, momentsText:loc.momentsText}));
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
        <label>Localidad ${idx + 1}
          <input data-location-name="${escapeHtml(loc.id)}" type="text" value="${escapeHtml(loc.name || "")}" placeholder="Ej: Pergamino">
        </label>
        <button class="btn danger" data-action="remove-location" data-location-id="${escapeHtml(loc.id)}" type="button">Eliminar</button>
      </div>
      <label class="wide-label">Momentos de evaluación de esta localidad
        <textarea data-location-moments="${escapeHtml(loc.id)}" placeholder="Un momento por línea. Usá | para agregar fecha. Ej:&#10;10 DDA | 2026-05-20&#10;20 DDA | 2026-06-03">${escapeHtml(loc.momentsText || "")}</textarea>
      </label>
      <div class="small-note">Estos momentos solo aplican a esta localidad. Las cajas de fotos se generan con esta información.</div>
    `;
    els.locationsEditor.appendChild(card);
  });
  els.locationsEditor.querySelectorAll("[data-action='remove-location']").forEach(btn=>{
    btn.addEventListener("click",()=>removeLocation(btn.dataset.locationId));
  });
  els.locationsEditor.querySelectorAll("input,textarea").forEach(input=>{
    input.addEventListener("input",()=>{ syncLocationsFromEditor(); renderStats(); renderProjectPreview(); saveProject(); });
  });
}

function isHeicFile(file){
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || type.includes("heic") || type.includes("heif");
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
    img.onerror = reject;
    img.src = src;
  });
}
async function normalizeImageFile(file, mode="original"){
  let dataUrl;
  if(isHeicFile(file)){
    if(typeof window.heic2any !== "function") throw new Error("No se pudo cargar la librería HEIC.");
    const converted = await window.heic2any({ blob:file, toType:"image/jpeg", quality:.95 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    dataUrl = await fileToDataUrl(blob);
  }else{
    dataUrl = await fileToDataUrl(file);
  }
  return await normalizeDataUrlToCanvas(dataUrl, mode);
}
async function normalizeDataUrlToCanvas(dataUrl, mode="original"){
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const maxSide = mode === "high" ? 2200 : mode === "light" ? 1400 : Math.max(srcW, srcH);
  const ratio = Math.min(1, maxSide / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * ratio);
  canvas.height = Math.round(srcH * ratio);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const quality = mode === "light" ? .78 : mode === "high" ? .92 : .95;
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width: canvas.width, height: canvas.height };
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

async function addPhotoFiles(files, locationId, momentId){
  const clean = Array.from(files || []).filter(f => (f.type || "").startsWith("image/") || /\.(heic|heif)$/i.test(f.name || ""));
  if(!clean.length) return;
  setStatus("Cargando fotos...");
  const next = [];
  for(const file of clean){
    try{
      const fixed = await normalizeImageFile(file, getMeta().qualityMode);
      next.push({
        id: uid("photo"),
        fileName: file.name,
        dataUrl: fixed.dataUrl,
        width: fixed.width,
        height: fixed.height,
        locationId,
        momentId,
        treatmentId: "",
        rotation: 0,
        order: state.photos.length + next.length
      });
    }catch(err){
      alert("No se pudo cargar " + file.name + ". " + (err?.message || ""));
    }
  }
  state.photos.push(...next);
  renderAll();
  await saveProject();
  setStatus("Fotos cargadas.");
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
      const card = document.createElement("article");
      card.className = "moment-card";
      card.innerHTML = `
        <div class="moment-header">
          <div>
            <h3>${escapeHtml(loc.name)} · ${escapeHtml(moment.name)}</h3>
            <small>${escapeHtml(moment.date || "Sin fecha")} · ${photos.length} foto(s)</small>
          </div>
          <div class="moment-actions">
            <button class="icon-btn" data-action="auto-assign-box" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="button">Autoasignar</button>
          </div>
        </div>
        <div class="drop-zone" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}">
          <div><strong>Arrastrá fotos acá</strong><span>${escapeHtml(loc.name)} · ${escapeHtml(moment.name)}</span></div>
        </div>
        <input class="hidden box-file-input" data-location-id="${escapeHtml(loc.id)}" data-moment-id="${escapeHtml(moment.id)}" type="file" accept="image/*,.heic,.heif" multiple>
        <div class="photo-list">${photos.map(photo=>renderPhotoItem(photo, treatments)).join("")}</div>
      `;
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
    btn.addEventListener("click",()=>autoAssignBox(btn.dataset.locationId, btn.dataset.momentId));
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
      <div class="photo-thumb-wrap"><img src="${photo.dataUrl}" alt="${escapeHtml(photo.fileName)}" style="transform:rotate(${rotation}deg)"></div>
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
    return `<div class="assignment-row"><strong>${escapeHtml(loc.name)}</strong><small>${escapeHtml(moments)}<br>${count} foto(s)</small></div>`;
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
async function makeRotatedImageData(photo, quality=.95){
  const rotation = getRotation(photo);
  if(rotation === 0){ return {dataUrl: photo.dataUrl, width: photo.width, height: photo.height}; }
  const img = await loadImage(photo.dataUrl);
  const baseW = photo.width || img.naturalWidth || img.width;
  const baseH = photo.height || img.naturalHeight || img.height;
  const rotated = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = rotated ? baseH : baseW;
  canvas.height = rotated ? baseW : baseH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -baseW/2, -baseH/2, baseW, baseH);
  ctx.restore();
  return {dataUrl: canvas.toDataURL("image/jpeg", quality), width: canvas.width, height: canvas.height};
}
async function makeLabeledImage(photo, meta){
  const fixed = await makeRotatedImageData(photo, meta.qualityMode === "light" ? .82 : .95);
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
  return canvas.toDataURL("image/jpeg", meta.qualityMode === "light" ? .82 : .95);
}

function addBackground(slide, meta){
  if(meta.pptBackgroundSrc) slide.addImage({data:meta.pptBackgroundSrc,x:0,y:0,w:13.333,h:7.5});
  else slide.background = {color:"FFFFFF"};
}
function addFooter(slide, text){
  const footerW = 8.5;
  const footerX = (13.333 - footerW) / 2;
  slide.addShape("rect",{x:footerX,y:6.88,w:footerW,h:.46,fill:{color:"FFFFFF",transparency:4},line:{color:"E7DEF5"}});
  slide.addText(text,{x:footerX+.12,y:6.985,w:footerW-.24,h:.18,fontFace:"Arial",fontSize:8.6,bold:true,color:"35185E",align:"center",fit:"shrink"});
}
function addTitle(slide, title, subtitle=""){
  slide.addShape("rect",{x:.75,y:1.25,w:11.85,h:4.85,fill:{color:"FFFFFF",transparency:6},line:{color:"E7DEF5"}});
  slide.addText(title,{x:1.05,y:1.82,w:11.1,h:.7,fontFace:"Arial",fontSize:29,bold:true,color:"35185E",align:"center",fit:"shrink"});
  if(subtitle) slide.addText(subtitle,{x:1.25,y:2.68,w:10.7,h:.5,fontFace:"Arial",fontSize:15,bold:true,color:"17072C",align:"center",fit:"shrink"});
}
function addCover(slide, meta){
  addBackground(slide, meta);
  addTitle(slide, "Resultados", meta.protocolName);
  slide.addText(`Localidades: ${meta.locations.length}   |   Tratamientos: ${meta.treatments.length}   |   Momentos: ${countMoments(meta.locations)}`,{x:1.25,y:3.35,w:10.7,h:.35,fontFace:"Arial",fontSize:12,bold:true,color:"6F6680",align:"center"});
}
function addIndexSlide(slide, meta){
  addBackground(slide, meta);
  slide.addText("Índice del PowerPoint",{x:.75,y:.56,w:12,h:.35,fontFace:"Arial",fontSize:20,bold:true,color:"003B65"});
  slide.addShape("rect",{x:.8,y:1.05,w:11.75,h:5.6,fill:{color:"FFFFFF",transparency:4},line:{color:"E7DEF5"}});
  const rows = [["Localidad","Momentos incluidos","Fotos"]];
  meta.locations.forEach(loc=>{
    const moments = loc.moments.map(m=>m.date ? `${m.name} (${m.date})` : m.name).join(" · ");
    const count = state.photos.filter(p=>p.locationId === loc.id).length;
    rows.push([loc.name, moments || "-", String(count)]);
  });
  const tableData = rows.map((row, rIdx)=>row.map(text=>({text, options:{bold:rIdx===0,color:rIdx===0?"FFFFFF":"17072C",fill:rIdx===0?{color:"4B2385"}:{color:"FFFFFF",transparency:0},fontSize:rIdx===0?10:8.5,margin:.06,breakLine:false}})));
  slide.addTable(tableData,{x:1.05,y:1.3,w:11.25,h:Math.min(5.0,.38*rows.length),border:{type:"solid",color:"E7DEF5",pt:1},colW:[2.25,7.85,1.15],fontFace:"Arial",valign:"mid",fit:"shrink"});
}
function addSectionSlide(slide, meta, title, subtitle){
  addBackground(slide, meta);
  addTitle(slide, title, subtitle);
}
async function addPhotoRow(slide, photos, bottomLabels, footerText, meta, headerText){
  addBackground(slide, meta);
  slide.addText(headerText,{x:.75,y:.55,w:11.9,h:.32,fontFace:"Arial",fontSize:16,bold:true,color:"003B65",fit:"shrink"});
  const n = photos.length;
  const area = {x:.55,y:1.18,w:12.25,h:5.08};
  const labelH = .38;
  const gap = .17;
  const cellW = (area.w - gap*(n-1))/n;
  const imgH = area.h - labelH - .08;
  const fixed = await Promise.all(photos.map(p=>makeRotatedImageData(p, meta.qualityMode === "light" ? .82 : .95)));
  fixed.forEach((fp,i)=>{
    const x = area.x + i*(cellW+gap);
    const fit = fitContain(fp.width, fp.height, cellW, imgH);
    slide.addShape("rect",{x,y:area.y,w:cellW,h:imgH,fill:{color:"FFFFFF",transparency:0},line:{color:"E7DEF5"}});
    slide.addImage({data:fp.dataUrl,x:x+fit.x,y:area.y+fit.y,w:fit.w,h:fit.h});
    slide.addShape("rect",{x,y:area.y+imgH+.06,w:cellW,h:labelH,fill:{color:"FFFFFF",transparency:0},line:{color:"E7DEF5"}});
    slide.addText(bottomLabels[i] || "",{x:x+.04,y:area.y+imgH+.13,w:cellW-.08,h:.18,fontFace:"Arial",fontSize:8.2,bold:true,color:"35185E",align:"center",fit:"shrink"});
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

  let slide = pptx.addSlide();
  addCover(slide, meta);
  slide = pptx.addSlide();
  addIndexSlide(slide, meta);

  for(const loc of meta.locations){
    slide = pptx.addSlide();
    addSectionSlide(slide, meta, `Localidad: ${loc.name}`, "Bloque 1 · Fotos ordenadas por momento");

    for(const moment of loc.moments){
      const photosMoment = state.photos.filter(p=>p.locationId === loc.id && p.momentId === moment.id && p.treatmentId).sort((a,b)=>a.order-b.order);
      const ordered = meta.treatments.flatMap(t=>photosMoment.filter(p=>p.treatmentId === t.id));
      for(const group of chunk(ordered, meta.photosPerSlide)){
        slide = pptx.addSlide();
        const labels = group.map(p=>(meta.treatments.find(t=>t.id === p.treatmentId) || {}).name || "");
        const footer = `Protocolo: ${meta.protocolName}   |   Localidad: ${loc.name}   |   Momento: ${moment.name}   |   Fecha: ${moment.date || ""}`;
        await addPhotoRow(slide, group, labels, footer, meta, `${loc.name} · ${moment.name} · Por tratamiento`);
      }
    }

    slide = pptx.addSlide();
    addSectionSlide(slide, meta, `Localidad: ${loc.name}`, "Bloque 2 · Fotos ordenadas por tratamiento");

    for(const treatment of meta.treatments){
      const photosTreat = state.photos.filter(p=>p.locationId === loc.id && p.treatmentId === treatment.id).sort((a,b)=>a.order-b.order);
      const ordered = loc.moments.flatMap(m=>photosTreat.filter(p=>p.momentId === m.id));
      for(const group of chunk(ordered, meta.photosPerSlide)){
        slide = pptx.addSlide();
        const labels = group.map(p=>(loc.moments.find(m=>m.id === p.momentId) || {}).name || "");
        const footer = `Protocolo: ${meta.protocolName}   |   Localidad: ${loc.name}   |   Tratamiento: ${treatment.name}`;
        await addPhotoRow(slide, group, labels, footer, meta, `${loc.name} · ${treatment.name} · Por momento`);
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
    const base = sanitizeFileName(`${meta.protocolName}_${loc.name || "localidad"}_${moment.name || "momento"}_${treatment.name || "sin_tratamiento"}`);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    const name = `${base}${n ? `_foto_${n+1}` : ""}.jpg`;
    folder.file(name, dataUrlToBase64(labeled), {base64:true});
    setStatus(`Generando fotos ${i+1}/${state.photos.length}...`);
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

const saveProject = debounce(async()=>{
  if(!state.hydrated) return;
  syncLocationsFromEditor();
  const project = {
    protocolName: els.protocolName.value,
    treatmentsInput: els.treatmentsInput.value,
    photosPerSlide: els.photosPerSlide.value,
    qualityMode: els.qualityMode.value,
    backgroundSrc: state.backgroundSrc,
    locations: state.locations,
    photos: state.photos,
    step: state.step
  };
  await dbSet(PROJECT_KEY, project);
}, 500);
async function loadProject(){
  const project = await dbGet(PROJECT_KEY);
  if(project){
    els.protocolName.value = project.protocolName || "";
    els.treatmentsInput.value = project.treatmentsInput || "";
    els.photosPerSlide.value = project.photosPerSlide || "3";
    els.qualityMode.value = project.qualityMode || "original";
    state.backgroundSrc = project.backgroundSrc || DEFAULT_BACKGROUND_URL;
    state.locations = Array.isArray(project.locations) ? project.locations : [];
    state.photos = Array.isArray(project.photos) ? project.photos : [];
    state.step = project.step || 1;
  }else{
    state.locations = [
      {id:uid("loc"), name:"Localidad 1", momentsText:"10 DDA |\n20 DDA |"}
    ];
  }
  state.hydrated = true;
  renderAll();
  setStep(state.step || 1);
}
function bindEvents(){
  els.progressTabs.forEach(tab=>tab.addEventListener("click",()=>{
    const target = Number(tab.dataset.step);
    if(target > 1 && !validateConfig()) return;
    renderAll(); setStep(target);
  }));
  els.btnStepConfig?.addEventListener("click",()=>setStep(1));
  els.btnGoPhotos?.addEventListener("click",()=>{ if(!validateConfig()) return; renderAll(); setStep(2); });
  els.btnBackConfig?.addEventListener("click",()=>setStep(1));
  els.btnAddLocation?.addEventListener("click",()=>addLocation());
  els.btnClearPhotos?.addEventListener("click",clearPhotosOnly);
  els.btnClearProject?.addEventListener("click",async()=>{
    if(!confirm("¿Seguro que querés limpiar todo el proyecto guardado?")) return;
    await dbDelete(PROJECT_KEY); location.reload();
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
    const fixed = await normalizeImageFile(file, "high");
    state.backgroundSrc = fixed.dataUrl;
    saveProject();
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
