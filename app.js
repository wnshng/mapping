const STORAGE_KEY = "maping_places_v1";
const NAVER_KEY = "maping_naver_v1";
const NAVER_CALLBACK_RESULT_KEY = "maping_naver_callback_result_v1";

const CATEGORY_OPTIONS = [
  "미분류",
  "음식점",
  "카페",
  "여행",
  "생활",
  "병원/약국",
  "쇼핑",
  "업무",
  "기타",
];

const CATEGORY_RULES = {
  음식점: [
    "식당",
    "맛집",
    "한식",
    "중식",
    "일식",
    "양식",
    "국밥",
    "분식",
    "회",
    "고기",
    "밥집",
    "restaurant",
  ],
  카페: ["카페", "커피", "디저트", "베이커리", "브런치", "cafe"],
  여행: ["호텔", "펜션", "숙소", "관광", "전망대", "해수욕장", "리조트", "여행"],
  생활: ["미용실", "세탁", "은행", "관공서", "동사무소", "주민센터", "행정복지센터"],
  "병원/약국": ["병원", "의원", "치과", "한의원", "약국", "응급실"],
  쇼핑: ["마트", "백화점", "쇼핑", "아울렛", "편의점"],
  업무: ["사무실", "오피스", "거래처", "회의", "업무", "회사"],
};

const TAG_RULES = {
  데이트: ["데이트", "분위기", "야경", "기념일"],
  가족: ["가족", "아이", "유아", "키즈"],
  혼밥: ["혼밥", "1인", "혼자"],
  주차가능: ["주차", "주차장", "발렛"],
  웨이팅주의: ["웨이팅", "대기", "줄"],
  조용함: ["조용", "한적", "북적이지"],
  재방문후보: ["또가고", "재방문", "다시"],
};

const VISIT_OPTIONS = ["미방문", "방문함", "재방문희망"];

const state = {
  places: [],
  selectedIds: new Set(),
  duplicateGroups: [],
  filters: {
    query: "",
    category: "",
    area: "",
    tag: "",
    visitStatus: "",
    sort: "updated_desc",
    view: "all",
  },
  naver: {
    clientId: "",
    redirectUri: "",
    accessToken: "",
    profile: null,
    oauthState: "",
  },
};

const el = {
  naverStatus: document.getElementById("naverStatus"),
  connectNaverBtn: document.getElementById("connectNaverBtn"),
  disconnectNaverBtn: document.getElementById("disconnectNaverBtn"),
  openExportBtn: document.getElementById("openExportBtn"),

  singleAddForm: document.getElementById("singleAddForm"),
  singleName: document.getElementById("singleName"),
  singleAddress: document.getElementById("singleAddress"),
  singleCategory: document.getElementById("singleCategory"),
  singleTags: document.getElementById("singleTags"),
  singleMemo: document.getElementById("singleMemo"),

  bulkTextInput: document.getElementById("bulkTextInput"),
  importTextBtn: document.getElementById("importTextBtn"),
  csvFileInput: document.getElementById("csvFileInput"),
  importResult: document.getElementById("importResult"),

  naverClientIdInput: document.getElementById("naverClientIdInput"),
  naverRedirectInput: document.getElementById("naverRedirectInput"),
  saveNaverConfigBtn: document.getElementById("saveNaverConfigBtn"),
  copyBookmarkletBtn: document.getElementById("copyBookmarkletBtn"),
  bookmarkletManualWrap: document.getElementById("bookmarkletManualWrap"),
  bookmarkletCodeBox: document.getElementById("bookmarkletCodeBox"),
  selectBookmarkletBtn: document.getElementById("selectBookmarkletBtn"),
  naverHelperMsg: document.getElementById("naverHelperMsg"),

  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  areaFilter: document.getElementById("areaFilter"),
  tagFilter: document.getElementById("tagFilter"),
  visitFilter: document.getElementById("visitFilter"),
  sortSelect: document.getElementById("sortSelect"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),

  statsGrid: document.getElementById("statsGrid"),
  viewTabs: document.getElementById("viewTabs"),
  bulkBar: document.getElementById("bulkBar"),
  selectedCount: document.getElementById("selectedCount"),
  bulkCategorySelect: document.getElementById("bulkCategorySelect"),
  bulkTagInput: document.getElementById("bulkTagInput"),
  bulkApplyBtn: document.getElementById("bulkApplyBtn"),
  bulkReorganizeBtn: document.getElementById("bulkReorganizeBtn"),
  bulkDeleteBtn: document.getElementById("bulkDeleteBtn"),
  selectAllCheckbox: document.getElementById("selectAllCheckbox"),
  placeTableBody: document.getElementById("placeTableBody"),
  emptyState: document.getElementById("emptyState"),

  duplicateList: document.getElementById("duplicateList"),
  refreshDuplicatesBtn: document.getElementById("refreshDuplicatesBtn"),
  tagManager: document.getElementById("tagManager"),

  editDialog: document.getElementById("editDialog"),
  editForm: document.getElementById("editForm"),
  editId: document.getElementById("editId"),
  editName: document.getElementById("editName"),
  editAddress: document.getElementById("editAddress"),
  editCategory: document.getElementById("editCategory"),
  editSubcategory: document.getElementById("editSubcategory"),
  editTags: document.getElementById("editTags"),
  editVisitStatus: document.getElementById("editVisitStatus"),
  editFavoriteReason: document.getElementById("editFavoriteReason"),
  editMemo: document.getElementById("editMemo"),
  editReorganized: document.getElementById("editReorganized"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),

  exportDialog: document.getElementById("exportDialog"),
  exportForm: document.getElementById("exportForm"),
  exportScope: document.getElementById("exportScope"),
  exportFormat: document.getElementById("exportFormat"),
  cancelExportBtn: document.getElementById("cancelExportBtn"),
};

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-\_\.\,\(\)\[\]\{\}\/\\:;]+/g, "")
    .replace(/[^\w\u3131-\u3163\uac00-\ud7a3]/g, "");
}

function splitTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))];
  }
  return [...new Set(String(value ?? "").split(/[,\n#]/).map((tag) => tag.trim()).filter(Boolean))];
}

function extractArea(address) {
  const text = String(address ?? "").trim().replace(/\s+/g, " ");
  if (!text) {
    return {
      area_primary: "",
      area_secondary: "",
    };
  }

  const tokens = text.split(" ").filter(Boolean);
  const areaPrimary = tokens[0] || "";
  const areaSecondary =
    tokens.find((token, index) => index > 0 && /[구군시]/.test(token)) ||
    tokens[1] ||
    "";

  return {
    area_primary: areaPrimary,
    area_secondary: areaSecondary,
  };
}

function detectCategory(candidateText) {
  const text = String(candidateText ?? "").toLowerCase();
  let best = "미분류";
  let score = 0;

  Object.entries(CATEGORY_RULES).forEach(([category, keywords]) => {
    const current = keywords.reduce((acc, keyword) => {
      return acc + (text.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    if (current > score) {
      score = current;
      best = category;
    }
  });

  return {
    category: best,
    confidence: score > 0 ? Math.min(0.95, 0.45 + score * 0.1) : 0.28,
  };
}

function suggestTags(candidateText) {
  const text = String(candidateText ?? "").toLowerCase();
  const tags = [];

  Object.entries(TAG_RULES).forEach(([tag, keywords]) => {
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      tags.push(tag);
    }
  });

  return [...new Set(tags)];
}

function priorityScore(place) {
  const updatedAt = place.updated_at ? new Date(place.updated_at).getTime() : 0;
  const days = Math.max(0, (Date.now() - updatedAt) / (1000 * 60 * 60 * 24));
  const recency = Math.max(0, 20 - Math.floor(days));
  const memoBonus = place.memo ? 15 : 0;
  const revisitBonus = place.visit_status === "재방문희망" ? 30 : 0;
  const tagBonus = Math.min(20, (place.tags || []).length * 5);
  const dupPenalty = place.duplicate_group_id ? -10 : 0;
  return recency + memoBonus + revisitBonus + tagBonus + dupPenalty;
}

function areaLabel(place) {
  return [place.area_primary, place.area_secondary].filter(Boolean).join(" ");
}

function mergeUniqueText(base, incoming) {
  const rows = [base, incoming]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return [...new Set(rows)].join(" / ");
}

function makePlace(input) {
  const raw = String(input.raw_input ?? "").trim();
  const placeName = String(input.place_name ?? "").trim();
  if (!placeName) {
    return null;
  }

  const address = String(input.address ?? "").trim();
  const textForRules = [placeName, address, input.memo, input.favorite_reason]
    .filter(Boolean)
    .join(" ");
  const autoCategory = detectCategory(textForRules);
  const chosenCategory = String(input.category ?? "").trim() || autoCategory.category;
  const area = extractArea(address);
  const autoTags = suggestTags(textForRules);
  const manualTags = splitTags(input.tags);
  const tags = [...new Set([...manualTags, ...autoTags])];
  const createdAt = nowIso();

  return {
    id: uid(),
    place_name: placeName,
    source_name: input.source_name || "manual",
    category: CATEGORY_OPTIONS.includes(chosenCategory) ? chosenCategory : "미분류",
    subcategory: String(input.subcategory ?? "").trim(),
    address,
    area_primary: area.area_primary,
    area_secondary: area.area_secondary,
    tags,
    memo: String(input.memo ?? "").trim(),
    visit_status: VISIT_OPTIONS.includes(input.visit_status) ? input.visit_status : "미방문",
    created_at: createdAt,
    updated_at: createdAt,
    duplicate_group_id: null,
    confidence_score: Number(input.confidence_score ?? autoCategory.confidence),
    raw_input: raw || placeName,
    favorite_reason: String(input.favorite_reason ?? "").trim(),
    source_url: String(input.source_url ?? "").trim(),
    is_reorganized: Boolean(input.is_reorganized),
  };
}

function savePlaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.places));
}

function saveNaver() {
  localStorage.setItem(
    NAVER_KEY,
    JSON.stringify({
      clientId: state.naver.clientId,
      redirectUri: state.naver.redirectUri,
      accessToken: state.naver.accessToken,
      profile: state.naver.profile,
      oauthState: state.naver.oauthState,
    })
  );
}

function loadState() {
  state.places = parseJSON(localStorage.getItem(STORAGE_KEY), []);
  const naver = parseJSON(localStorage.getItem(NAVER_KEY), {});
  state.naver.clientId = naver.clientId || "";
  state.naver.redirectUri = naver.redirectUri || "";
  state.naver.accessToken = naver.accessToken || "";
  state.naver.profile = naver.profile || null;
  state.naver.oauthState = naver.oauthState || "";
}

function basePathname() {
  if (window.location.pathname.endsWith("/")) {
    return window.location.pathname;
  }
  const index = window.location.pathname.lastIndexOf("/");
  return window.location.pathname.slice(0, index + 1);
}

function getDefaultNaverRedirectUri() {
  return `${window.location.origin}${basePathname()}naver-callback.html`;
}

function setSelectOptions(select, values, includeAll = false) {
  const options = [];
  if (includeAll) {
    options.push(`<option value="">전체</option>`);
  }
  values.forEach((value) => {
    options.push(`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
  });
  select.innerHTML = options.join("");
}

function refreshSelectOptions() {
  setSelectOptions(el.singleCategory, CATEGORY_OPTIONS);
  setSelectOptions(el.bulkCategorySelect, CATEGORY_OPTIONS);
  setSelectOptions(el.editCategory, CATEGORY_OPTIONS);

  const categoriesInData = [...new Set(state.places.map((place) => place.category).filter(Boolean))];
  const categories = [...new Set([...CATEGORY_OPTIONS, ...categoriesInData])];
  setSelectOptions(el.categoryFilter, categories, true);

  const areas = [...new Set(state.places.map((place) => areaLabel(place)).filter(Boolean))].sort();
  setSelectOptions(el.areaFilter, areas, true);

  const tags = [...new Set(state.places.flatMap((place) => place.tags || []))].sort();
  setSelectOptions(el.tagFilter, tags, true);

  el.categoryFilter.value = state.filters.category;
  el.areaFilter.value = state.filters.area;
  el.tagFilter.value = state.filters.tag;
  el.sortSelect.value = state.filters.sort;
  el.visitFilter.value = state.filters.visitStatus;
}

function getFilteredPlaces() {
  let rows = [...state.places];
  const query = state.filters.query.trim().toLowerCase();

  if (state.filters.view === "recent") {
    rows = rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  } else if (state.filters.view === "duplicates") {
    rows = rows.filter((place) => place.duplicate_group_id);
  } else if (state.filters.view === "memo") {
    rows = rows.filter((place) => String(place.memo || "").trim().length > 0);
  } else if (state.filters.view === "reorganized") {
    rows = rows.filter((place) => place.is_reorganized);
  } else if (state.filters.view === "category") {
    rows = rows.sort((a, b) => String(a.category).localeCompare(String(b.category), "ko"));
  } else if (state.filters.view === "area") {
    rows = rows.sort((a, b) => areaLabel(a).localeCompare(areaLabel(b), "ko"));
  } else if (state.filters.view === "tag") {
    rows = rows.sort((a, b) => String((a.tags || [])[0] || "").localeCompare(String((b.tags || [])[0] || ""), "ko"));
  }

  if (query) {
    rows = rows.filter((place) => {
      const searchable = [
        place.place_name,
        place.address,
        place.memo,
        place.category,
        place.favorite_reason,
        place.area_primary,
        place.area_secondary,
        ...(place.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }

  if (state.filters.category) {
    rows = rows.filter((place) => place.category === state.filters.category);
  }
  if (state.filters.area) {
    rows = rows.filter((place) => areaLabel(place) === state.filters.area);
  }
  if (state.filters.tag) {
    rows = rows.filter((place) => (place.tags || []).includes(state.filters.tag));
  }
  if (state.filters.visitStatus) {
    rows = rows.filter((place) => place.visit_status === state.filters.visitStatus);
  }

  rows.sort((a, b) => {
    if (state.filters.sort === "name_asc") {
      return String(a.place_name).localeCompare(String(b.place_name), "ko");
    }
    if (state.filters.sort === "created_desc") {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (state.filters.sort === "priority_desc") {
      return priorityScore(b) - priorityScore(a);
    }
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  return rows;
}

function renderStats() {
  const total = state.places.length;
  const categorized = state.places.filter((place) => place.category && place.category !== "미분류").length;
  const duplicateCount = state.places.filter((place) => place.duplicate_group_id).length;
  const memoCount = state.places.filter((place) => String(place.memo).trim()).length;
  const reorganizedCount = state.places.filter((place) => place.is_reorganized).length;
  const ratio = total ? `${Math.round((categorized / total) * 100)}%` : "0%";

  el.statsGrid.innerHTML = `
    <div class="stat">
      <div class="stat-label">전체 장소</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat">
      <div class="stat-label">분류 완료율</div>
      <div class="stat-value">${ratio}</div>
    </div>
    <div class="stat">
      <div class="stat-label">중복 후보</div>
      <div class="stat-value">${duplicateCount}</div>
    </div>
    <div class="stat">
      <div class="stat-label">메모 있음</div>
      <div class="stat-value">${memoCount}</div>
    </div>
    <div class="stat">
      <div class="stat-label">재정리함</div>
      <div class="stat-value">${reorganizedCount}</div>
    </div>
  `;
}

function renderTable() {
  const rows = getFilteredPlaces();
  const selectedInView = rows.filter((row) => state.selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedInView === rows.length;
  el.selectAllCheckbox.checked = allSelected;

  if (rows.length === 0) {
    el.placeTableBody.innerHTML = "";
    el.emptyState.classList.remove("hidden");
  } else {
    el.emptyState.classList.add("hidden");
    el.placeTableBody.innerHTML = rows
      .map((place) => {
        const tags = (place.tags || [])
          .slice(0, 4)
          .map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`)
          .join("");
        const memoPreview = escapeHtml(place.memo || "");
        const updated = new Date(place.updated_at).toLocaleDateString("ko-KR");
        return `
          <tr data-id="${escapeHtml(place.id)}">
            <td><input class="row-check" type="checkbox" ${state.selectedIds.has(place.id) ? "checked" : ""} /></td>
            <td>
              <div class="place-name">${escapeHtml(place.place_name)}</div>
              <div class="mini">${escapeHtml(place.address || "주소 없음")}</div>
            </td>
            <td>${escapeHtml(place.category || "미분류")}</td>
            <td>${escapeHtml(areaLabel(place) || "-")}</td>
            <td>${tags || '<span class="mini">-</span>'}</td>
            <td>${escapeHtml(place.visit_status || "미방문")}</td>
            <td>${memoPreview ? `<span class="mini">${memoPreview.slice(0, 34)}</span>` : '<span class="mini">-</span>'}</td>
            <td>${updated}</td>
            <td><button class="btn ghost row-edit-btn" data-id="${escapeHtml(place.id)}">수정</button></td>
          </tr>
        `;
      })
      .join("");
  }

  el.selectedCount.textContent = `${state.selectedIds.size}개 선택됨`;
  if (state.selectedIds.size > 0) {
    el.bulkBar.classList.remove("hidden");
  } else {
    el.bulkBar.classList.add("hidden");
  }
}

function renderDuplicateList() {
  if (state.duplicateGroups.length === 0) {
    el.duplicateList.innerHTML = `<p class="subtext">현재 중복 후보가 없습니다.</p>`;
    return;
  }

  el.duplicateList.innerHTML = state.duplicateGroups
    .map((group) => {
      const itemHtml = group.ids
        .map((id, index) => {
          const place = state.places.find((row) => row.id === id);
          if (!place) {
            return "";
          }
          return `
            <div class="duplicate-item">
              <label class="row">
                <input type="radio" name="keep-${escapeHtml(group.id)}" value="${escapeHtml(place.id)}" ${
                  index === 0 ? "checked" : ""
                } />
                <strong>${escapeHtml(place.place_name)}</strong>
              </label>
              <div class="mini">${escapeHtml(place.address || "주소 없음")}</div>
              <div class="mini">${escapeHtml((place.tags || []).join(", ") || "태그 없음")}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="duplicate-card" data-group-id="${escapeHtml(group.id)}">
          <div class="row">
            <strong>중복 그룹 (${group.ids.length}개)</strong>
            <span class="chip muted">${escapeHtml(group.reason)}</span>
            <span class="chip muted">신뢰도 ${(group.confidence * 100).toFixed(0)}%</span>
          </div>
          <div class="duplicate-items">${itemHtml}</div>
          <div class="row">
            <button class="btn secondary merge-group-btn" data-group-id="${escapeHtml(group.id)}">선택 기준 병합</button>
            <button class="btn ghost ignore-group-btn" data-group-id="${escapeHtml(group.id)}">이번엔 유지</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTagManager() {
  const counts = new Map();
  state.places.forEach((place) => {
    (place.tags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (tags.length === 0) {
    el.tagManager.innerHTML = `<p class="subtext">아직 태그가 없습니다.</p>`;
    return;
  }

  el.tagManager.innerHTML = tags
    .map(([tag, count]) => {
      return `
        <div class="tag-chip" data-tag="${escapeHtml(tag)}">
          <span>#${escapeHtml(tag)} (${count})</span>
          <button class="btn ghost rename-tag-btn" data-tag="${escapeHtml(tag)}">이름변경</button>
          <button class="btn ghost remove-tag-btn" data-tag="${escapeHtml(tag)}">삭제</button>
        </div>
      `;
    })
    .join("");
}

function renderNaverStatus() {
  const hasProfile = state.naver.profile && (state.naver.profile.email || state.naver.profile.name || state.naver.profile.id);
  if (hasProfile) {
    const label = state.naver.profile.nickname || state.naver.profile.name || state.naver.profile.email || "연결됨";
    el.naverStatus.className = "chip success";
    el.naverStatus.textContent = `네이버 연결: ${label}`;
    el.disconnectNaverBtn.classList.remove("hidden");
  } else if (state.naver.accessToken) {
    el.naverStatus.className = "chip muted";
    el.naverStatus.textContent = "네이버 토큰 연결됨";
    el.disconnectNaverBtn.classList.remove("hidden");
  } else {
    el.naverStatus.className = "chip muted";
    el.naverStatus.textContent = "네이버 미연결";
    el.disconnectNaverBtn.classList.add("hidden");
  }
}

function renderViewTabs() {
  const tabs = el.viewTabs.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.filters.view);
  });
}

function renderAll() {
  refreshSelectOptions();
  renderViewTabs();
  renderStats();
  renderTable();
  renderDuplicateList();
  renderTagManager();
  renderNaverStatus();
}

function addPlaces(inputs) {
  const created = inputs.map((input) => makePlace(input)).filter(Boolean);
  if (created.length === 0) {
    return 0;
  }
  state.places = [...created, ...state.places];
  recomputeDuplicateGroups();
  savePlaces();
  renderAll();
  return created.length;
}

function applyBulkUpdates(updater) {
  if (state.selectedIds.size === 0) {
    return;
  }
  state.places = state.places.map((place) => {
    if (!state.selectedIds.has(place.id)) {
      return place;
    }
    return updater(place);
  });
  recomputeDuplicateGroups();
  savePlaces();
  renderAll();
}

function openEditDialog(placeId) {
  const place = state.places.find((row) => row.id === placeId);
  if (!place) {
    return;
  }
  el.editId.value = place.id;
  el.editName.value = place.place_name || "";
  el.editAddress.value = place.address || "";
  el.editCategory.value = place.category || "미분류";
  el.editSubcategory.value = place.subcategory || "";
  el.editTags.value = (place.tags || []).join(", ");
  el.editVisitStatus.value = place.visit_status || "미방문";
  el.editFavoriteReason.value = place.favorite_reason || "";
  el.editMemo.value = place.memo || "";
  el.editReorganized.checked = Boolean(place.is_reorganized);
  el.editDialog.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) {
    dialog.close();
  }
}

function parseLineToInput(line) {
  const raw = String(line ?? "").trim();
  if (!raw) {
    return null;
  }

  if (raw.includes("|")) {
    const [place_name = "", address = "", tags = "", memo = "", source_url = ""] = raw.split("|").map((part) => part.trim());
    if (!place_name) {
      return null;
    }
    return {
      place_name,
      address,
      tags,
      memo,
      source_url,
      raw_input: raw,
      source_name: "text_import",
    };
  }

  if (raw.includes("\t")) {
    const [place_name = "", address = "", tags = "", memo = ""] = raw.split("\t").map((part) => part.trim());
    if (!place_name) {
      return null;
    }
    return {
      place_name,
      address,
      tags,
      memo,
      raw_input: raw,
      source_name: "text_import",
    };
  }

  if (/https?:\/\/(map\.naver\.com|m\.map\.naver\.com|naver\.me)/i.test(raw)) {
    return {
      place_name: "네이버 링크 가져오기 항목",
      address: "",
      tags: "",
      memo: "",
      source_url: raw,
      raw_input: raw,
      source_name: "naver_link",
    };
  }

  if (raw.includes(",")) {
    const [place_name = "", address = "", tags = "", memo = ""] = raw.split(",").map((part) => part.trim());
    if (!place_name) {
      return null;
    }
    return {
      place_name,
      address,
      tags,
      memo,
      raw_input: raw,
      source_name: "text_import",
    };
  }

  return {
    place_name: raw,
    address: "",
    tags: "",
    memo: "",
    raw_input: raw,
    source_name: "text_import",
  };
}

function parseCSVRows(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      current.push(value);
      rows.push(current);
      current = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  return rows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
}

function parseCSVToInputs(text) {
  const rows = parseCSVRows(text);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => String(header).trim().toLowerCase());
  const indexByKeys = (keys) => headers.findIndex((header) => keys.includes(header));

  const nameIndex = indexByKeys(["place_name", "name", "장소명", "title", "place"]);
  const addressIndex = indexByKeys(["address", "주소", "location"]);
  const categoryIndex = indexByKeys(["category", "카테고리"]);
  const tagsIndex = indexByKeys(["tags", "tag", "태그"]);
  const memoIndex = indexByKeys(["memo", "메모", "note"]);
  const reasonIndex = indexByKeys(["favorite_reason", "reason", "저장이유", "purpose"]);
  const sourceUrlIndex = indexByKeys(["source_url", "url", "link", "링크"]);

  const hasHeader = nameIndex !== -1 || addressIndex !== -1 || categoryIndex !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row) => {
      const getCell = (index, fallback = "") => {
        if (index >= 0) {
          return String(row[index] ?? "").trim();
        }
        return fallback;
      };

      const placeName = hasHeader ? getCell(nameIndex) : String(row[0] ?? "").trim();
      const address = hasHeader ? getCell(addressIndex) : String(row[1] ?? "").trim();
      const tags = hasHeader ? getCell(tagsIndex) : String(row[2] ?? "").trim();
      const memo = hasHeader ? getCell(memoIndex) : String(row[3] ?? "").trim();
      if (!placeName) {
        return null;
      }
      return {
        place_name: placeName,
        address,
        category: getCell(categoryIndex),
        tags,
        memo,
        favorite_reason: getCell(reasonIndex),
        source_url: getCell(sourceUrlIndex),
        raw_input: row.join(","),
        source_name: "csv_import",
      };
    })
    .filter(Boolean);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCSV(rows) {
  const headers = [
    "id",
    "place_name",
    "source_name",
    "category",
    "subcategory",
    "address",
    "area_primary",
    "area_secondary",
    "tags",
    "memo",
    "visit_status",
    "created_at",
    "updated_at",
    "duplicate_group_id",
    "confidence_score",
    "raw_input",
    "favorite_reason",
    "source_url",
    "is_reorganized",
  ];
  const lines = rows.map((row) =>
    [
      row.id,
      row.place_name,
      row.source_name,
      row.category,
      row.subcategory,
      row.address,
      row.area_primary,
      row.area_secondary,
      (row.tags || []).join("|"),
      row.memo,
      row.visit_status,
      row.created_at,
      row.updated_at,
      row.duplicate_group_id,
      row.confidence_score,
      row.raw_input,
      row.favorite_reason,
      row.source_url,
      row.is_reorganized ? "true" : "false",
    ]
      .map(csvEscape)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function bigramSet(text) {
  const normalized = normalizeText(text);
  const result = new Set();
  for (let i = 0; i < normalized.length - 1; i += 1) {
    result.add(normalized.slice(i, i + 2));
  }
  if (normalized.length === 1) {
    result.add(normalized);
  }
  return result;
}

function jaccardSimilarity(a, b) {
  const setA = bigramSet(a);
  const setB = bigramSet(b);
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let intersection = 0;
  setA.forEach((item) => {
    if (setB.has(item)) {
      intersection += 1;
    }
  });
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function recomputeDuplicateGroups() {
  state.places = state.places.map((place) => ({
    ...place,
    duplicate_group_id: null,
  }));

  const groups = [];
  const used = new Set();
  const exactMap = new Map();

  state.places.forEach((place) => {
    const exactKey = `${normalizeText(place.place_name)}|${normalizeText(place.address || areaLabel(place))}`;
    if (!exactMap.has(exactKey)) {
      exactMap.set(exactKey, []);
    }
    exactMap.get(exactKey).push(place.id);
  });

  exactMap.forEach((ids) => {
    if (ids.length > 1) {
      const groupId = uid();
      groups.push({
        id: groupId,
        ids,
        reason: "정확 일치(이름+주소)",
        confidence: 0.98,
      });
      ids.forEach((id) => used.add(id));
    }
  });

  const candidates = state.places.filter((place) => !used.has(place.id));
  const adjacency = new Map();
  candidates.forEach((item) => adjacency.set(item.id, new Set()));

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      const sim = jaccardSimilarity(a.place_name, b.place_name);
      const sameArea =
        normalizeText(areaLabel(a)) && normalizeText(areaLabel(a)) === normalizeText(areaLabel(b));
      if (sim >= 0.92 && (sameArea || normalizeText(a.address) === normalizeText(b.address))) {
        adjacency.get(a.id).add(b.id);
        adjacency.get(b.id).add(a.id);
      }
    }
  }

  const visited = new Set();
  candidates.forEach((item) => {
    if (visited.has(item.id)) {
      return;
    }
    const stack = [item.id];
    const component = [];
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      component.push(id);
      adjacency.get(id).forEach((next) => {
        if (!visited.has(next)) {
          stack.push(next);
        }
      });
    }
    if (component.length > 1) {
      groups.push({
        id: uid(),
        ids: component,
        reason: "유사 이름 + 동일 지역",
        confidence: 0.93,
      });
    }
  });

  const groupById = new Map();
  groups.forEach((group) => {
    group.ids.forEach((id) => {
      if (!groupById.has(id)) {
        groupById.set(id, group.id);
      }
    });
  });

  state.places = state.places.map((place) => ({
    ...place,
    duplicate_group_id: groupById.get(place.id) || null,
  }));
  state.duplicateGroups = groups;
}

function mergeDuplicateGroup(groupId, keepId) {
  const group = state.duplicateGroups.find((item) => item.id === groupId);
  if (!group) {
    return;
  }

  const keep = state.places.find((place) => place.id === keepId);
  if (!keep) {
    return;
  }

  const merged = group.ids
    .filter((id) => id !== keepId)
    .map((id) => state.places.find((place) => place.id === id))
    .filter(Boolean);

  const nextKeep = merged.reduce((acc, place) => {
    return {
      ...acc,
      address: acc.address || place.address,
      category: acc.category === "미분류" ? place.category : acc.category,
      subcategory: acc.subcategory || place.subcategory,
      tags: [...new Set([...(acc.tags || []), ...(place.tags || [])])],
      memo: mergeUniqueText(acc.memo, place.memo),
      favorite_reason: mergeUniqueText(acc.favorite_reason, place.favorite_reason),
      source_url: acc.source_url || place.source_url,
      updated_at: nowIso(),
    };
  }, keep);

  state.places = state.places
    .filter((place) => !group.ids.includes(place.id) || place.id === keepId)
    .map((place) => (place.id === keepId ? nextKeep : place));

  state.selectedIds.forEach((id) => {
    if (!state.places.some((place) => place.id === id)) {
      state.selectedIds.delete(id);
    }
  });

  recomputeDuplicateGroups();
  savePlaces();
  renderAll();
}

function dismissDuplicateGroup(groupId) {
  state.duplicateGroups = state.duplicateGroups.filter((group) => group.id !== groupId);
  state.places = state.places.map((place) => {
    if (place.duplicate_group_id === groupId) {
      return {
        ...place,
        duplicate_group_id: null,
      };
    }
    return place;
  });
  savePlaces();
  renderAll();
}

function renameTag(oldTag, nextTag) {
  const trimmed = String(nextTag || "").trim();
  if (!trimmed || trimmed === oldTag) {
    return;
  }
  state.places = state.places.map((place) => ({
    ...place,
    tags: [...new Set((place.tags || []).map((tag) => (tag === oldTag ? trimmed : tag)))],
    updated_at: (place.tags || []).includes(oldTag) ? nowIso() : place.updated_at,
  }));
  savePlaces();
  renderAll();
}

function removeTag(tag) {
  state.places = state.places.map((place) => ({
    ...place,
    tags: (place.tags || []).filter((item) => item !== tag),
    updated_at: (place.tags || []).includes(tag) ? nowIso() : place.updated_at,
  }));
  savePlaces();
  renderAll();
}

async function fetchNaverProfile(accessToken) {
  try {
    const response = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error("profile_fetch_failed");
    }
    const data = await response.json();
    if (data && data.response) {
      state.naver.profile = data.response;
      saveNaver();
      renderNaverStatus();
      el.naverHelperMsg.textContent = "네이버 프로필 확인에 성공했습니다. 이제 저장목록 페이지에서 추출을 진행하세요.";
      return;
    }
    throw new Error("empty_profile");
  } catch (error) {
    state.naver.profile = {
      name: "프로필 조회 제한",
      email: "",
      id: "",
    };
    saveNaver();
    renderNaverStatus();
    el.naverHelperMsg.textContent =
      "토큰은 연결되었지만 브라우저/CORS 환경에서 프로필 조회가 제한되었습니다. 가져오기 헬퍼는 계속 사용할 수 있습니다.";
  }
}

function consumeNaverCallbackResult() {
  const raw =
    sessionStorage.getItem(NAVER_CALLBACK_RESULT_KEY) ||
    localStorage.getItem(NAVER_CALLBACK_RESULT_KEY);
  if (!raw) {
    return;
  }

  sessionStorage.removeItem(NAVER_CALLBACK_RESULT_KEY);
  localStorage.removeItem(NAVER_CALLBACK_RESULT_KEY);
  const payload = parseJSON(raw, null);
  if (!payload) {
    return;
  }

  if (payload.error) {
    el.naverHelperMsg.textContent = `네이버 로그인 실패: ${payload.error_description || payload.error}`;
    return;
  }

  if (!payload.access_token) {
    return;
  }

  if (state.naver.oauthState && payload.state && payload.state !== state.naver.oauthState) {
    el.naverHelperMsg.textContent = "네이버 로그인 state 검증에 실패했습니다. 다시 로그인해주세요.";
    return;
  }

  state.naver.accessToken = payload.access_token;
  state.naver.oauthState = "";
  saveNaver();
  fetchNaverProfile(payload.access_token);
}

function handleNaverOAuthCallback() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) {
    return;
  }
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  if (!token) {
    return;
  }

  state.naver.accessToken = token;
  state.naver.oauthState = "";
  saveNaver();
  history.replaceState({}, document.title, window.location.pathname + window.location.search);
  fetchNaverProfile(token);
}

function startNaverOAuth() {
  const clientId = el.naverClientIdInput.value.trim();
  const redirectUri = el.naverRedirectInput.value.trim() || getDefaultNaverRedirectUri();

  if (!clientId) {
    el.naverHelperMsg.textContent = "Client ID를 먼저 입력하고 연동 설정을 저장해주세요.";
    return;
  }

  const stateToken = uid();
  const authorizeUrl =
    "https://nid.naver.com/oauth2.0/authorize" +
    `?response_type=token&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(stateToken)}`;

  state.naver.clientId = clientId;
  state.naver.redirectUri = redirectUri;
  state.naver.oauthState = stateToken;
  saveNaver();
  window.location.href = authorizeUrl;
}

function disconnectNaver() {
  state.naver.accessToken = "";
  state.naver.profile = null;
  state.naver.oauthState = "";
  saveNaver();
  renderNaverStatus();
  el.naverHelperMsg.textContent = "네이버 연결이 해제되었습니다.";
}

function getBookmarkletCode() {
  return `javascript:(()=>{const out=[];const seen=new Set();const links=[...new Set(Array.from(document.querySelectorAll('a[href*="/place/"],a[href*="entry/place"],a[href*="map.naver.com"]')))];links.forEach((a)=>{const href=a.href||'';const container=a.closest('li,article,div');const raw=(container?container.innerText:a.innerText)||'';const lines=raw.split('\\n').map((s)=>s.trim()).filter(Boolean);const name=(a.innerText||lines[0]||'').split('\\n')[0].trim();const address=lines.find((line)=>/[가-힣]+(시|도)\\s+[가-힣]+(시|군|구)/.test(line))||'';if(name&&name.length>1){const key=name+'|'+address;if(!seen.has(key)){seen.add(key);out.push([name,address,'','',''+href].join('|'));}}});const text=out.join('\\n');if(!text){alert('장소를 찾지 못했습니다. 저장목록 리스트가 화면에 보이는 상태에서 다시 시도하세요.');return;}if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(()=>alert('복사 완료: 앱의 텍스트 가져오기에 붙여넣으세요.')).catch(()=>prompt('아래 텍스트를 복사하세요',text));}else{prompt('아래 텍스트를 복사하세요',text);}})();`;
}

function fillBookmarkletCodeBox(code) {
  if (el.bookmarkletCodeBox) {
    el.bookmarkletCodeBox.value = code;
  }
}

function fallbackCopyText(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "true");
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }
  temp.remove();
  return copied;
}

function bindEvents() {
  el.singleAddForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const created = addPlaces([
      {
        place_name: el.singleName.value,
        address: el.singleAddress.value,
        category: el.singleCategory.value,
        tags: el.singleTags.value,
        memo: el.singleMemo.value,
        source_name: "manual",
        raw_input: [el.singleName.value, el.singleAddress.value].filter(Boolean).join(" | "),
      },
    ]);
    if (created > 0) {
      el.singleAddForm.reset();
      el.singleCategory.value = "미분류";
      el.importResult.textContent = `${created}개 장소를 추가했습니다.`;
    }
  });

  el.importTextBtn.addEventListener("click", () => {
    const lines = el.bulkTextInput.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const inputs = lines.map(parseLineToInput).filter(Boolean);
    const created = addPlaces(inputs);
    el.importResult.textContent = `${created}개 장소를 텍스트에서 가져왔습니다.`;
    if (created > 0) {
      el.bulkTextInput.value = "";
    }
  });

  el.csvFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const inputs = parseCSVToInputs(text);
    const created = addPlaces(inputs);
    el.importResult.textContent = `${created}개 장소를 CSV에서 가져왔습니다.`;
    event.target.value = "";
  });

  el.searchInput.addEventListener("input", (event) => {
    state.filters.query = event.target.value;
    renderAll();
  });
  el.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    renderAll();
  });
  el.areaFilter.addEventListener("change", (event) => {
    state.filters.area = event.target.value;
    renderAll();
  });
  el.tagFilter.addEventListener("change", (event) => {
    state.filters.tag = event.target.value;
    renderAll();
  });
  el.visitFilter.addEventListener("change", (event) => {
    state.filters.visitStatus = event.target.value;
    renderAll();
  });
  el.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    renderAll();
  });
  el.resetFiltersBtn.addEventListener("click", () => {
    state.filters.query = "";
    state.filters.category = "";
    state.filters.area = "";
    state.filters.tag = "";
    state.filters.visitStatus = "";
    state.filters.sort = "updated_desc";
    state.filters.view = "all";
    el.searchInput.value = "";
    renderAll();
  });

  el.viewTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) {
      return;
    }
    state.filters.view = tab.dataset.view || "all";
    renderAll();
  });

  el.selectAllCheckbox.addEventListener("change", (event) => {
    const rows = getFilteredPlaces();
    if (event.target.checked) {
      rows.forEach((place) => state.selectedIds.add(place.id));
    } else {
      rows.forEach((place) => state.selectedIds.delete(place.id));
    }
    renderTable();
  });

  el.placeTableBody.addEventListener("change", (event) => {
    if (!event.target.classList.contains("row-check")) {
      return;
    }
    const row = event.target.closest("tr");
    const id = row?.dataset?.id;
    if (!id) {
      return;
    }
    if (event.target.checked) {
      state.selectedIds.add(id);
    } else {
      state.selectedIds.delete(id);
    }
    renderTable();
  });

  el.placeTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".row-edit-btn");
    if (button?.dataset?.id) {
      openEditDialog(button.dataset.id);
    }
  });

  el.bulkApplyBtn.addEventListener("click", () => {
    const nextCategory = el.bulkCategorySelect.value;
    const nextTags = splitTags(el.bulkTagInput.value);
    if (!nextCategory && nextTags.length === 0) {
      return;
    }

    applyBulkUpdates((place) => ({
      ...place,
      category: nextCategory || place.category,
      tags: [...new Set([...(place.tags || []), ...nextTags])],
      updated_at: nowIso(),
    }));
    el.bulkTagInput.value = "";
  });

  el.bulkReorganizeBtn.addEventListener("click", () => {
    applyBulkUpdates((place) => ({
      ...place,
      is_reorganized: true,
      updated_at: nowIso(),
    }));
  });

  el.bulkDeleteBtn.addEventListener("click", () => {
    if (state.selectedIds.size === 0) {
      return;
    }
    if (!window.confirm(`선택한 ${state.selectedIds.size}개 장소를 삭제할까요?`)) {
      return;
    }
    state.places = state.places.filter((place) => !state.selectedIds.has(place.id));
    state.selectedIds.clear();
    recomputeDuplicateGroups();
    savePlaces();
    renderAll();
  });

  el.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = el.editId.value;
    state.places = state.places.map((place) => {
      if (place.id !== id) {
        return place;
      }
      const area = extractArea(el.editAddress.value);
      return {
        ...place,
        place_name: el.editName.value.trim(),
        address: el.editAddress.value.trim(),
        area_primary: area.area_primary,
        area_secondary: area.area_secondary,
        category: el.editCategory.value || "미분류",
        subcategory: el.editSubcategory.value.trim(),
        tags: splitTags(el.editTags.value),
        visit_status: el.editVisitStatus.value,
        favorite_reason: el.editFavoriteReason.value.trim(),
        memo: el.editMemo.value.trim(),
        is_reorganized: el.editReorganized.checked,
        updated_at: nowIso(),
      };
    });
    recomputeDuplicateGroups();
    savePlaces();
    renderAll();
    closeDialog(el.editDialog);
  });

  el.cancelEditBtn.addEventListener("click", () => {
    closeDialog(el.editDialog);
  });

  el.refreshDuplicatesBtn.addEventListener("click", () => {
    recomputeDuplicateGroups();
    savePlaces();
    renderAll();
  });

  el.duplicateList.addEventListener("click", (event) => {
    const mergeBtn = event.target.closest(".merge-group-btn");
    if (mergeBtn?.dataset?.groupId) {
      const groupId = mergeBtn.dataset.groupId;
      const checked = document.querySelector(`input[name="keep-${groupId}"]:checked`);
      const keepId = checked ? checked.value : null;
      if (keepId) {
        mergeDuplicateGroup(groupId, keepId);
      }
      return;
    }

    const ignoreBtn = event.target.closest(".ignore-group-btn");
    if (ignoreBtn?.dataset?.groupId) {
      dismissDuplicateGroup(ignoreBtn.dataset.groupId);
    }
  });

  el.tagManager.addEventListener("click", (event) => {
    const renameBtn = event.target.closest(".rename-tag-btn");
    if (renameBtn?.dataset?.tag) {
      const oldTag = renameBtn.dataset.tag;
      const nextTag = window.prompt(`태그 이름 변경: ${oldTag}`, oldTag);
      if (nextTag !== null) {
        renameTag(oldTag, nextTag);
      }
      return;
    }

    const removeBtn = event.target.closest(".remove-tag-btn");
    if (removeBtn?.dataset?.tag) {
      const tag = removeBtn.dataset.tag;
      if (window.confirm(`#${tag} 태그를 전체 장소에서 제거할까요?`)) {
        removeTag(tag);
      }
    }
  });

  el.openExportBtn.addEventListener("click", () => {
    el.exportDialog.showModal();
  });
  el.cancelExportBtn.addEventListener("click", () => {
    closeDialog(el.exportDialog);
  });
  el.exportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const scope = el.exportScope.value;
    const format = el.exportFormat.value;
    const rows = scope === "all" ? state.places : getFilteredPlaces();
    if (format === "json") {
      downloadFile(`maping_export_${Date.now()}.json`, JSON.stringify(rows, null, 2), "application/json");
    } else {
      downloadFile(`maping_export_${Date.now()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
    }
    closeDialog(el.exportDialog);
  });

  el.saveNaverConfigBtn.addEventListener("click", () => {
    state.naver.clientId = el.naverClientIdInput.value.trim();
    state.naver.redirectUri = el.naverRedirectInput.value.trim();
    saveNaver();
    el.naverHelperMsg.textContent = "네이버 연동 설정을 저장했습니다.";
  });

  el.connectNaverBtn.addEventListener("click", () => {
    startNaverOAuth();
  });

  el.disconnectNaverBtn.addEventListener("click", () => {
    disconnectNaver();
  });

  el.copyBookmarkletBtn.addEventListener("click", async () => {
    const code = getBookmarkletCode();
    fillBookmarkletCodeBox(code);
    try {
      await navigator.clipboard.writeText(code);
      el.naverHelperMsg.textContent = "북마클릿 코드가 복사되었습니다. 북마크 URL로 등록해 실행하세요.";
    } catch (error) {
      const copiedByFallback = fallbackCopyText(code);
      if (copiedByFallback) {
        el.naverHelperMsg.textContent =
          "클립보드 API는 실패했지만 대체 방식으로 복사했습니다. 북마크 URL에 붙여넣어주세요.";
      } else {
        if (el.bookmarkletManualWrap) {
          el.bookmarkletManualWrap.open = true;
        }
        el.naverHelperMsg.textContent =
          "자동 복사에 실패했습니다. 아래 '수동 복사 열기'에서 코드를 직접 복사해주세요.";
      }
    }
  });

  if (el.selectBookmarkletBtn) {
    el.selectBookmarkletBtn.addEventListener("click", () => {
      const code = getBookmarkletCode();
      fillBookmarkletCodeBox(code);
      if (el.bookmarkletCodeBox) {
        el.bookmarkletCodeBox.focus();
        el.bookmarkletCodeBox.select();
      }
    });
  }
}

function hydrateInputsFromState() {
  el.singleCategory.value = "미분류";
  el.bulkCategorySelect.value = "미분류";

  el.searchInput.value = state.filters.query;
  el.categoryFilter.value = state.filters.category;
  el.areaFilter.value = state.filters.area;
  el.tagFilter.value = state.filters.tag;
  el.visitFilter.value = state.filters.visitStatus;
  el.sortSelect.value = state.filters.sort;

  el.naverClientIdInput.value = state.naver.clientId || "";
  el.naverRedirectInput.value = state.naver.redirectUri || getDefaultNaverRedirectUri();
}

function initialize() {
  loadState();
  recomputeDuplicateGroups();
  consumeNaverCallbackResult();
  handleNaverOAuthCallback();
  refreshSelectOptions();
  hydrateInputsFromState();
  fillBookmarkletCodeBox(getBookmarkletCode());
  bindEvents();
  renderAll();
}

initialize();
