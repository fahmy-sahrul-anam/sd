const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_j39Q5DHRUJTIdEf7yW99Dw_SKycORWF";
const SESSION_KEY = "ruangHadiahAdminSession";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginPanel = document.querySelector("#login-panel");
const adminData = document.querySelector("#admin-data");
const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#login-status");
const signoutButton = document.querySelector("#signout-button");
const recordsBody = document.querySelector("#records-body");
const searchInput = document.querySelector("#record-search");
const emptyState = document.querySelector("#empty-state");
const updatedNote = document.querySelector("#updated-note");

let claimRecords = [];

function createCell(content) {
  const cell = document.createElement("td");
  cell.textContent = content || "-";
  return cell;
}

async function loadClaimsFromDatabase() {
  try {
    const { data, error } = await supabaseClient
      .from('ruang_hadiah_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Gagal memuat data dari database cloud:", err);
    return [];
  }
}

function renderRecords(query = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase("id");
  const filtered = claimRecords.filter((record) =>
    `${record.recipient_name || ''} ${record.recipient_address || ''} ${record.prize || ''}`
      .toLocaleLowerCase("id")
      .includes(normalizedQuery)
  );

  recordsBody.replaceChildren();
  
  if (filtered.length === 0) {
    emptyState.hidden = false;
    updatedNote.textContent = `Menampilkan 0 klaim.`;
    return;
  }

  emptyState.hidden = true;
  filtered.forEach((record) => {
    const row = document.createElement("tr");
    
    const timeStr = record.created_at ? new Date(record.created_at).toLocaleString("id-ID") : "-";
    row.append(createCell(timeStr));
    row.append(createCell(record.recipient_name));
    row.append(createCell(record.recipient_address));
    row.append(createCell(record.prize));
    
    // Kolom Tautan Google Maps
    const locationCell = document.createElement("td");
    if (record.latitude && record.longitude) {
      const mapLink = document.createElement("a");
      mapLink.className = "photo-link"; 
      mapLink.href = `https://google.com{record.latitude},${record.longitude}`;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.textContent = `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`;
      locationCell.append(mapLink);
    } else {
      locationCell.textContent = "Tidak dibagikan";
    }
    row.append(locationCell);

    // Kolom Tautan Foto Cloud
    const photoCell = document.createElement("td");
    if (record.photo_url) {
      const link = document.createElement("a");
      link.className = "photo-link";
      link.href = record.photo_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Lihat foto";
      photoCell.append(link);
    } else {
      photoCell.textContent = "Tidak dibagikan";
    }
    row.append(photoCell);
    
    recordsBody.append(row);
  });

  updatedNote.textContent = `Menampilkan ${filtered.length} dari ${claimRecords.length} klaim.`;
}

async function openAdmin() {
  loginStatus.textContent = "Memuat data dari server cloud...";
  claimRecords = await loadClaimsFromDatabase();
  
  // Memastikan elemen counter terisi dengan aman tanpa memicu crash jika data kosong
  const totalCountEl = document.querySelector("#total-count");
  const locationCountEl = document.querySelector("#location-count");
  const photoCountEl = document.querySelector("#photo-count");

  if (totalCountEl) totalCountEl.textContent = String(claimRecords.length);
  if (locationCountEl) locationCountEl.textContent = String(claimRecords.filter((r) => r.latitude).length);
  if (photoCountEl) photoCountEl.textContent = String(claimRecords.filter((r) => r.photo_url).length);
  
  loginPanel.hidden = true;
  adminData.hidden = false;
  loginStatus.textContent = "";
  renderRecords(searchInput.value || "");
}

// Proses validasi login langsung ke database cloud
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const passwordInput = document.querySelector("#admin-password").value;
  loginStatus.textContent = "Memverifikasi kata sandi...";

  try {
    const { data, error } = await supabaseClient
      .from('admin_config')
      .select('value')
      .eq('key', 'admin_password')
      .maybeSingle(); // Menggunakan maybeSingle agar tidak memicu crash jika konfigurasi kosong

    if (error || !data) {
      loginStatus.textContent = "Gagal terhubung ke sistem keamanan database. Periksa RLS Policy Anda.";
      return;
    }

    if (passwordInput !== data.value) {
      loginStatus.textContent = "Password salah.";
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, "1");
    document.querySelector("#admin-password").value = "";
    loginStatus.textContent = "";
    await openAdmin();

  } catch (err) {
    loginStatus.textContent = "Terjadi kesalahan sistem login.";
    console.error(err);
  }
});

signoutButton.addEventListener("click", () => {
  window.sessionStorage.removeItem(SESSION_KEY);
  claimRecords = [];
  recordsBody.replaceChildren();
  adminData.hidden = true;
  loginPanel.hidden = false;
  loginForm.reset();
  loginStatus.textContent = "Kamu sudah keluar.";
});

searchInput.addEventListener("input", () => renderRecords(searchInput.value));

// Inisialisasi otomatis jika sesi sudah aktif
if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
  openAdmin();
}
