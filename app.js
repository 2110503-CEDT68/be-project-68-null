const API = "http://localhost:5000/api/v1";
let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user") || "null");
let selectedRestaurantId = null;

updateNavbar();

function updateNavbar() {
  const loggedIn = !!token;
  const isAdmin = currentUser?.role === "admin";
  document.getElementById("nav-login").style.display = loggedIn ? "none" : "";
  document.getElementById("nav-register").style.display = loggedIn
    ? "none"
    : "";
  document.getElementById("nav-logout").style.display = loggedIn ? "" : "none";
  document.getElementById("nav-restaurants").style.display = loggedIn
    ? ""
    : "none";
  document.getElementById("nav-my-res").style.display =
    loggedIn && !isAdmin ? "" : "none";
  document.getElementById("nav-admin").style.display = isAdmin ? "" : "none";
  document.getElementById("user-info").innerHTML = currentUser
    ? `${isAdmin ? '<span class="admin-badge">ADMIN</span>' : ""}สวัสดี, ${currentUser.name}`
    : "";
}

function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  if (name === "restaurants") loadRestaurants();
  if (name === "my-reservations") loadMyReservations();
  if (name === "admin") loadAdminReservations();
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => (t.className = "toast"), 3000);
}

// ===== AUTH =====
async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.msg || "เข้าสู่ระบบไม่สำเร็จ", "error");
      return;
    }
    token = data.token;
    localStorage.setItem("token", token);
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    currentUser = meData.data;
    localStorage.setItem("user", JSON.stringify(currentUser));
    updateNavbar();
    showToast("เข้าสู่ระบบสำเร็จ!");
    showPage("restaurants");
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

async function register() {
  const body = {
    name: document.getElementById("reg-name").value,
    tel: document.getElementById("reg-tel").value,
    email: document.getElementById("reg-email").value,
    password: document.getElementById("reg-password").value,
  };
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.msg || "สมัครไม่สำเร็จ", "error");
      return;
    }
    token = data.token;
    localStorage.setItem("token", token);
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    currentUser = meData.data;
    localStorage.setItem("user", JSON.stringify(currentUser));
    updateNavbar();
    showToast("สมัครสมาชิกสำเร็จ!");
    showPage("restaurants");
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

async function logout() {
  try {
    await fetch(`${API}/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {}
  token = null;
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateNavbar();
  showPage("home");
  showToast("ออกจากระบบแล้ว");
}

// ===== RESTAURANTS =====
let allRestaurants = [];

function getTodayName() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(),
  );
}

function setTodayDefault() {
  document.getElementById("filter-day").value = getTodayName();
}

function isOpenOnDay(restaurant, day) {
  if (!day) return true;
  if (!restaurant.openingHours || !restaurant.openingHours.length) return false;
  const info = restaurant.openingHours.find((h) => h.day === day);
  return info && !info.closed;
}

function extractProvince(address) {
  if (!address) return "อื่นๆ";
  const parts = address.split(",").map((s) => s.trim());
  return parts[parts.length - 1] || "อื่นๆ";
}

function populateProvinces(restaurants) {
  const provinces = [
    ...new Set(restaurants.map((r) => extractProvince(r.address))),
  ].sort();
  const sel = document.getElementById("filter-province");
  const current = sel.value;
  sel.innerHTML = '<option value="">📍 ทุกพื้นที่</option>';
  provinces.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function applyFilters() {
  const name = document.getElementById("filter-name").value.toLowerCase();
  const day = document.getElementById("filter-day").value;
  const province = document.getElementById("filter-province").value;
  const filtered = allRestaurants.filter((r) => {
    const matchName = !name || r.name.toLowerCase().includes(name);
    const matchDay = isOpenOnDay(r, day);
    const matchProvince = !province || extractProvince(r.address) === province;
    return matchName && matchDay && matchProvince;
  });
  document.getElementById("filter-count").textContent =
    `แสดง ${filtered.length} / ${allRestaurants.length} ร้าน`;
  renderRestaurants(filtered);
}

function renderRestaurants(list) {
  if (!list.length) {
    document.getElementById("restaurant-list").innerHTML =
      '<div class="empty-state"><p>ไม่พบร้านอาหารที่ตรงกับเงื่อนไข</p></div>';
    return;
  }
  const today = getTodayName();
  document.getElementById("restaurant-list").innerHTML = list
    .map((r) => {
      const openToday = isOpenOnDay(r, today);
      const todayInfo = r.openingHours?.find((h) => h.day === today);
      const todayText =
        todayInfo && !todayInfo.closed
          ? `เปิด ${todayInfo.open} - ${todayInfo.close}`
          : "ปิดวันนี้";
      const hoursRows = r.openingHours?.length
        ? r.openingHours
            .map(
              (h) =>
                `<tr><td>${h.day}</td><td>${h.closed ? "ปิด" : `${h.open} - ${h.close}`}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>';
      return `
      <div class="restaurant-card">
        <h3>${r.name}${
          openToday
            ? '<span class="open-badge">เปิดอยู่</span>'
            : '<span class="closed-badge">ปิดวันนี้</span>'
        }
        </h3>
        <p>📍 ${r.address}</p>
        <p>📞 ${r.tel}</p>
        <p style="color:${openToday ? "#2ecc71" : "var(--muted)"}; font-size:0.8rem; margin-top:4px;">🕐 วันนี้: ${todayText}</p>
        <span class="tables-badge">🪑 ${r.totalTables} โต๊ะ</span>
        <div class="hours-list">
          <details><summary>ดูเวลาเปิด-ปิดทั้งสัปดาห์</summary>
            <table class="hours-table">${hoursRows}</table>
          </details>
        </div>
        ${
          token
            ? `<button class="reserve-btn" onclick="openReserveModal('${r._id}', '${r.name}')">จองโต๊ะ</button>`
            : `<button class="reserve-btn" onclick="showPage('login')">เข้าสู่ระบบเพื่อจอง</button>`
        }
      </div>`;
    })
    .join("");
}

async function loadRestaurants() {
  document.getElementById("restaurant-list").innerHTML =
    '<div class="loading"><div class="spinner"></div><br/>กำลังโหลด...</div>';
  try {
    const res = await fetch(`${API}/restaurants?limit=100`);
    const data = await res.json();
    if (!data.success || !data.data.length) {
      document.getElementById("restaurant-list").innerHTML =
        '<div class="empty-state"><p>ไม่พบร้านอาหาร</p></div>';
      return;
    }
    allRestaurants = data.data;
    populateProvinces(allRestaurants);
    setTodayDefault();
    applyFilters();
  } catch (e) {
    document.getElementById("restaurant-list").innerHTML =
      '<div class="empty-state"><p>เชื่อมต่อ server ไม่ได้</p></div>';
  }
}

// ===== MODAL =====
function openReserveModal(restaurantId, name) {
  selectedRestaurantId = restaurantId;
  document.getElementById("modal-restaurant-name").textContent =
    `จองโต๊ะ — ${name}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  document.getElementById("reserve-date").value = tomorrow
    .toISOString()
    .slice(0, 16);
  document.getElementById("reserve-tables").value = 1;
  document.getElementById("modal-reserve").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-reserve").classList.remove("open");
}
document
  .getElementById("modal-reserve")
  .addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

async function submitReservation() {
  const reservationDate = new Date(
    document.getElementById("reserve-date").value,
  ).toISOString();
  const tableCount = parseInt(document.getElementById("reserve-tables").value);
  if (!reservationDate || !tableCount) {
    showToast("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }
  try {
    const res = await fetch(
      `${API}/restaurants/${selectedRestaurantId}/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reservationDate, tableCount }),
      },
    );
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || data.error || "จองไม่สำเร็จ", "error");
      return;
    }
    closeModal();
    showToast("จองโต๊ะสำเร็จ! 🎉");
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

// ===== MY RESERVATIONS =====
let editingReservationId = null;

async function loadMyReservations() {
  if (!token) {
    showPage("login");
    return;
  }
  document.getElementById("reservation-list").innerHTML =
    '<div class="loading"><div class="spinner"></div><br/>กำลังโหลด...</div>';
  try {
    const res = await fetch(`${API}/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success || !data.data.length) {
      document.getElementById("reservation-list").innerHTML =
        '<div class="empty-state"><p>ยังไม่มีการจอง</p></div>';
      return;
    }
    document.getElementById("reservation-list").innerHTML = data.data
      .map(
        (r) => `
      <div class="reservation-item">
        <div class="res-info">
          <h4>${r.restaurant?.name || "ร้านอาหาร"}</h4>
          <p>📅 ${new Date(r.reservationDate).toLocaleString("th-TH")} &nbsp;–&nbsp; ${new Date(r.endTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
          <p>📍 ${r.restaurant?.address || ""} &nbsp;·&nbsp; 🪑 ${r.tableCount} โต๊ะ</p>
        </div>
        <div class="res-actions">
          <button class="edit-btn" onclick="openEditModal('${r._id}', '${r.reservationDate}', ${r.tableCount})">✏️ แก้ไข</button>
          <button class="delete-btn" onclick="deleteReservation('${r._id}')">ยกเลิก</button>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (e) {
    document.getElementById("reservation-list").innerHTML =
      '<div class="empty-state"><p>เชื่อมต่อ server ไม่ได้</p></div>';
  }
}

function openEditModal(id, reservationDate, tableCount) {
  editingReservationId = id;
  document.getElementById("edit-date").value = new Date(reservationDate)
    .toISOString()
    .slice(0, 16);
  document.getElementById("edit-tables").value = tableCount;
  document.getElementById("modal-edit").classList.add("open");
}

function closeEditModal() {
  document.getElementById("modal-edit").classList.remove("open");
}
document.getElementById("modal-edit").addEventListener("click", function (e) {
  if (e.target === this) closeEditModal();
});

async function submitEdit() {
  const reservationDate = new Date(
    document.getElementById("edit-date").value,
  ).toISOString();
  const tableCount = parseInt(document.getElementById("edit-tables").value);
  if (!reservationDate || !tableCount) {
    showToast("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }
  try {
    const res = await fetch(`${API}/reservations/${editingReservationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reservationDate, tableCount }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || data.error || "แก้ไขไม่สำเร็จ", "error");
      return;
    }
    closeEditModal();
    showToast("แก้ไขการจองสำเร็จ! ✅");
    loadMyReservations();
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

async function deleteReservation(id) {
  if (!confirm("ต้องการยกเลิกการจองนี้?")) return;
  try {
    const res = await fetch(`${API}/reservations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || "ยกเลิกไม่สำเร็จ", "error");
      return;
    }
    showToast("ยกเลิกการจองแล้ว");
    loadMyReservations();
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

// ===== ADMIN =====
let allAdminReservations = [];
let adminEditingId = null;

async function loadAdminReservations() {
  document.getElementById("admin-reservation-tbody").innerHTML =
    '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">กำลังโหลด...</td></tr>';
  try {
    const res = await fetch(`${API}/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) {
      showToast("โหลดข้อมูลไม่สำเร็จ", "error");
      return;
    }
    allAdminReservations = data.data || [];
    document.getElementById("admin-filter-count").textContent =
      `ทั้งหมด ${allAdminReservations.length} รายการ`;
    renderAdminTable(allAdminReservations);
  } catch (e) {
    document.getElementById("admin-reservation-tbody").innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">เชื่อมต่อ server ไม่ได้</td></tr>';
  }
}

function applyAdminFilter() {
  const q = document.getElementById("admin-filter-name").value.toLowerCase();
  const filtered = allAdminReservations.filter(
    (r) =>
      (r.restaurant?.name || "").toLowerCase().includes(q) ||
      (r.user?.name || r.user || "").toString().toLowerCase().includes(q),
  );
  document.getElementById("admin-filter-count").textContent =
    `แสดง ${filtered.length} / ${allAdminReservations.length} รายการ`;
  renderAdminTable(filtered);
}

function renderAdminTable(list) {
  if (!list.length) {
    document.getElementById("admin-reservation-tbody").innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);">ไม่พบข้อมูล</td></tr>';
    return;
  }
  document.getElementById("admin-reservation-tbody").innerHTML = list
    .map(
      (r) => `
    <tr>
      <td style="color:var(--text)">${r.user?.name || r.user || "-"}</td>
      <td style="color:var(--gold)">${r.restaurant?.name || "-"}</td>
      <td style="color:var(--muted)">${new Date(r.reservationDate).toLocaleString("th-TH")}</td>
      <td style="text-align:center">${r.tableCount}</td>
      <td>
        <div class="res-actions">
          <button class="edit-btn" onclick="openAdminEditModal('${r._id}','${r.reservationDate}',${r.tableCount},'${r.restaurant?.name || ""}')">✏️</button>
          <button class="delete-btn" onclick="adminDeleteReservation('${r._id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

function openAdminEditModal(id, reservationDate, tableCount, restaurantName) {
  adminEditingId = id;
  document.getElementById("admin-edit-info").textContent =
    `ร้าน: ${restaurantName}`;
  document.getElementById("admin-edit-date").value = new Date(reservationDate)
    .toISOString()
    .slice(0, 16);
  document.getElementById("admin-edit-tables").value = tableCount;
  document.getElementById("modal-admin-edit").classList.add("open");
}

function closeAdminEditModal() {
  document.getElementById("modal-admin-edit").classList.remove("open");
}
document
  .getElementById("modal-admin-edit")
  .addEventListener("click", function (e) {
    if (e.target === this) closeAdminEditModal();
  });

async function submitAdminEdit() {
  const reservationDate = new Date(
    document.getElementById("admin-edit-date").value,
  ).toISOString();
  const tableCount = parseInt(
    document.getElementById("admin-edit-tables").value,
  );
  try {
    const res = await fetch(`${API}/reservations/${adminEditingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reservationDate, tableCount }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || "แก้ไขไม่สำเร็จ", "error");
      return;
    }
    closeAdminEditModal();
    showToast("แก้ไขสำเร็จ ✅");
    loadAdminReservations();
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}

async function adminDeleteReservation(id) {
  if (!confirm("ต้องการลบการจองนี้?")) return;
  try {
    const res = await fetch(`${API}/reservations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) {
      showToast("ลบไม่สำเร็จ", "error");
      return;
    }
    showToast("ลบการจองแล้ว");
    loadAdminReservations();
  } catch (e) {
    showToast("เชื่อมต่อ server ไม่ได้", "error");
  }
}
