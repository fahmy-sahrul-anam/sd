const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_j39Q5DHRUJTIdEf7yW99Dw_SKycORWF";
const SESSION_KEY = "ruangHadiahAdminSession";

// Menggunakan inisialisasi eksplisit dari window objek agar terhindar dari error "not defined"
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    console.error(err);
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
    if (emptyState) emptyState.hidden = false;
    if (updatedNote) updatedNote.textContent = `Menampilkan 0 klaim.`;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  filtered.forEach((record) => {
    const row = document.createElement("tr");
    
    const timeStr = record.created_at ? new Date(record.created_at).toLocaleString("id-ID") : "-";
    row.append(createCell(timeStr));
    row.append(createCell(record.recipient_name));
    row.append(createCell(record.recipient_address));
    row.append(createCell(record.prize));
    
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

  if (updatedNote) updatedNote.textContent = `Menampilkan ${filtered.length} dari ${claimRecords.length} klaim.`;
}

async function openAdmin() {
  if (loginStatus) loginStatus.textContent = "Memuat data dari server cloud...";
  claimRecords = await loadClaimsFromDatabase();
  
  const totalCountEl = document.querySelector("#total-count");
  const locationCountEl = document.querySelector("#location-count");
  const photoCountEl = document.querySelector("#photo-count");

  if (totalCountEl) totalCountEl.textContent = String(claimRecords.length);
  if (locationCountEl) locationCountEl.textContent = String(claimRecords.filter((r) => r.latitude).length);
  if (photoCountEl) photoCountEl.textContent = String(claimRecords.filter((r) => r.photo_url).length);
  
  if (loginPanel) loginPanel.hidden = true;
  if (adminData) adminData.hidden = false;
  if (loginStatus) loginStatus.textContent = "";
  
  renderRecords(searchInput ? searchInput.value : "");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation(); // Menghentikan bubbling agar browser tidak melakukan refresh sepihak
    
    const passwordField = document.querySelector("#admin-password");
    if (!passwordField) return;
    
    const passwordInput = passwordField.value.trim();
    if (loginStatus) loginStatus.textContent = "Memverifikasi kata sandi...";

    try {
      // Mengambil data secara langsung dari tabel config
      const { data, error } = await supabaseClient
        .from('admin_config')
        .select('value')
        .eq('key', 'admin_password');

      if (error) {
        if (loginStatus) loginStatus.textContent = "Error Database: " + error.message;
        return;
      }

      if (!data || data.length === 0) {
        if (loginStatus) loginStatus.textContent = "Sandi admin belum di-setup di database Supabase.";
        return;
      }

      const dbPassword = data[0].value;

      if (passwordInput !== dbPassword) {
        if (loginStatus) loginStatus.textContent = "Sandi salah. Coba lagi.";
        return;
      }

      // Login Sukses
      window.sessionStorage.setItem(SESSION_KEY, "1");
      passwordField.value = "";
      if (loginStatus) loginStatus.textContent = "";
      await openAdmin();

    } catch (err) {
      if (loginStatus) loginStatus.textContent = "Gagal terhubung: " + err.message;
    }
  });
}

if (signoutButton) {
  signoutButton.addEventListener("click", () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    claimRecords = [];
    if (recordsBody) recordsBody.replaceChildren();
    if (adminData) adminData.hidden = true;
    if (loginPanel) loginPanel.hidden = false;
    if (loginForm) loginForm.reset();
    if (loginStatus) loginStatus.textContent = "Kamu sudah keluar.";
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => renderRecords(searchInput.value));
}

// Inisialisasi otomatis jika sesi sudah aktif saat halaman dimuat ulang
if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
  openAdmin();
}
