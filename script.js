(() => {
  "use strict";

  // ===== Storage =====

  const STORAGE_KEY = "architectTodo.tasks.v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, tasks: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks)) return { version: 1, tasks: [] };
      return parsed;
    } catch (e) {
      console.warn("タスクの読み込みに失敗しました", e);
      return { version: 1, tasks: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("タスクの保存に失敗しました", e);
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const state = loadState();

  // ===== Date / Section helpers =====

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toDateStr(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  // 週の起点は月曜。直近の日曜(週の最終日)の日付文字列を返す。
  function endOfWeekStr() {
    const now = new Date();
    const day = now.getDay(); // 0=日,1=月,...,6=土
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday);
    return toDateStr(end);
  }

  function formatDateShort(dateStr) {
    const [, m, d] = dateStr.split("-");
    return `${Number(m)}/${Number(d)}`;
  }

  function sectionForTask(task, today, endOfWeek) {
    if (!task.dueDate) return "later";
    if (task.dueDate <= today) return "today";
    if (task.dueDate <= endOfWeek) return "thisWeek";
    return "later";
  }

  function dueBadge(task, today, endOfWeek) {
    if (!task.dueDate) return null;
    if (task.dueDate < today) {
      return { className: "due-overdue", text: `期限切れ ${formatDateShort(task.dueDate)}` };
    }
    if (task.dueDate === today) {
      return { className: "due-today", text: "今日" };
    }
    if (task.dueDate <= endOfWeek) {
      return { className: "due-soon", text: formatDateShort(task.dueDate) };
    }
    return { className: "due-later", text: formatDateShort(task.dueDate) };
  }

  const PRIORITY_LABEL = { high: "優先度:高", mid: "優先度:中", low: "優先度:低" };
  const PRIORITY_RANK = { high: 0, mid: 1, low: 2, "": 3 };

  // ===== Sorting =====

  function compareActiveTasks(a, b) {
    const aDue = a.dueDate || "9999-99-99";
    const bDue = b.dueDate || "9999-99-99";
    if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    const aPri = PRIORITY_RANK[a.priority] ?? 3;
    const bPri = PRIORITY_RANK[b.priority] ?? 3;
    if (aPri !== bPri) return aPri - bPri;
    return a.createdAt - b.createdAt;
  }

  function compareCompletedTasks(a, b) {
    const aAt = a.completedAt || 0;
    const bAt = b.completedAt || 0;
    if (aAt !== bAt) return bAt - aAt;
    return b.createdAt - a.createdAt;
  }

  // ===== Rendering =====

  const els = {
    listToday: document.getElementById("list-today"),
    listThisWeek: document.getElementById("list-thisWeek"),
    listLater: document.getElementById("list-later"),
    listCompleted: document.getElementById("list-completed"),
    countToday: document.getElementById("count-today"),
    countThisWeek: document.getElementById("count-thisWeek"),
    countLater: document.getElementById("count-later"),
    sectionToday: document.querySelector('.task-section[data-section="today"]'),
    sectionThisWeek: document.querySelector('.task-section[data-section="thisWeek"]'),
    sectionLater: document.querySelector('.task-section[data-section="later"]'),
    emptyHint: document.getElementById("empty-hint"),
    emptyHintCompleted: document.getElementById("empty-hint-completed"),
  };

  function buildTaskMenu(items) {
    const menu = document.createElement("div");
    menu.className = "task-menu";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "menu-trigger";
    trigger.setAttribute("aria-label", "操作メニュー");
    trigger.textContent = "⋮";

    const dropdown = document.createElement("div");
    dropdown.className = "menu-dropdown";
    dropdown.hidden = true;

    items.forEach(({ label, className }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.textContent = label;
      dropdown.appendChild(btn);
    });

    menu.appendChild(trigger);
    menu.appendChild(dropdown);
    return menu;
  }

  function buildTaskItem(task, today, endOfWeek) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.id = task.id;

    const check = document.createElement("button");
    check.type = "button";
    check.className = "task-check";
    check.setAttribute("aria-label", "完了にする");
    check.textContent = "✓";

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    main.appendChild(title);

    const badge = dueBadge(task, today, endOfWeek);
    if (badge || task.priority) {
      const meta = document.createElement("div");
      meta.className = "task-meta";
      if (badge) {
        const b = document.createElement("span");
        b.className = `badge ${badge.className}`;
        b.textContent = badge.text;
        meta.appendChild(b);
      }
      if (task.priority) {
        const b = document.createElement("span");
        b.className = `badge priority-${task.priority}`;
        b.textContent = PRIORITY_LABEL[task.priority];
        meta.appendChild(b);
      }
      main.appendChild(meta);
    }

    li.appendChild(check);
    li.appendChild(main);
    li.appendChild(
      buildTaskMenu([
        { label: "編集", className: "menu-edit" },
        { label: "削除", className: "menu-delete" },
      ])
    );
    return li;
  }

  function buildCompletedItem(task) {
    const li = document.createElement("li");
    li.className = "task-item completed-item";
    li.dataset.id = task.id;

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    main.appendChild(title);

    const date = document.createElement("div");
    date.className = "completed-date";
    date.textContent = task.completedAt
      ? `完了日: ${formatDateShort(toDateStr(new Date(task.completedAt)))}`
      : "";
    main.appendChild(date);

    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "restore-btn";
    restore.textContent = "戻す";

    li.appendChild(main);
    li.appendChild(restore);
    li.appendChild(buildTaskMenu([{ label: "削除", className: "menu-delete" }]));
    return li;
  }

  function render() {
    const today = todayStr();
    const endOfWeek = endOfWeekStr();

    const active = state.tasks.filter((t) => !t.completed);
    const buckets = { today: [], thisWeek: [], later: [] };
    for (const task of active) {
      buckets[sectionForTask(task, today, endOfWeek)].push(task);
    }
    buckets.today.sort(compareActiveTasks);
    buckets.thisWeek.sort(compareActiveTasks);
    buckets.later.sort(compareActiveTasks);

    els.listToday.innerHTML = "";
    buckets.today.forEach((t) => els.listToday.appendChild(buildTaskItem(t, today, endOfWeek)));
    els.listThisWeek.innerHTML = "";
    buckets.thisWeek.forEach((t) => els.listThisWeek.appendChild(buildTaskItem(t, today, endOfWeek)));
    els.listLater.innerHTML = "";
    buckets.later.forEach((t) => els.listLater.appendChild(buildTaskItem(t, today, endOfWeek)));

    els.countToday.textContent = buckets.today.length ? `${buckets.today.length}件` : "";
    els.countThisWeek.textContent = buckets.thisWeek.length ? `${buckets.thisWeek.length}件` : "";
    els.countLater.textContent = buckets.later.length ? `${buckets.later.length}件` : "";

    els.sectionToday.hidden = buckets.today.length === 0;
    els.sectionThisWeek.hidden = buckets.thisWeek.length === 0;
    els.sectionLater.hidden = buckets.later.length === 0;

    els.emptyHint.hidden = active.length !== 0;

    const completed = state.tasks.filter((t) => t.completed).sort(compareCompletedTasks);
    els.listCompleted.innerHTML = "";
    completed.forEach((t) => els.listCompleted.appendChild(buildCompletedItem(t)));
    els.emptyHintCompleted.hidden = completed.length !== 0;
  }

  // ===== Toast =====

  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2200);
  }

  // ===== Task actions =====

  function completeTask(task) {
    task.completed = true;
    task.completedAt = Date.now();
    saveState();
    render();
    showToast("完了しました");
  }

  function restoreTask(task) {
    task.completed = false;
    task.completedAt = null;
    saveState();
    render();
    showToast("未完了に戻しました");
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    state.tasks.splice(index, 1);
    saveState();
    render();
    showToast("削除しました");
  }

  // ===== Task menu (kebab) =====

  function closeAllMenus() {
    document.querySelectorAll(".menu-dropdown").forEach((d) => {
      d.hidden = true;
    });
  }

  function toggleMenu(menuEl) {
    const dropdown = menuEl.querySelector(".menu-dropdown");
    const wasOpen = !dropdown.hidden;
    closeAllMenus();
    dropdown.hidden = wasOpen;
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".task-menu")) closeAllMenus();
  });

  // ===== View / Sheet open-close =====

  const viewToday = document.getElementById("view-today");
  const viewCompleted = document.getElementById("view-completed");
  const navToday = document.getElementById("nav-today");
  const navCompleted = document.getElementById("nav-completed");
  const pageTitle = document.getElementById("page-title");

  function showView(name) {
    const isToday = name === "today";
    viewToday.hidden = !isToday;
    viewCompleted.hidden = isToday;
    navToday.classList.toggle("active", isToday);
    navCompleted.classList.toggle("active", !isToday);
    pageTitle.textContent = isToday ? "やることリスト" : "完了済みタスク";
  }

  const addSheet = document.getElementById("add-sheet");
  const addForm = document.getElementById("add-form");
  const inputTitle = document.getElementById("input-title");
  const inputDue = document.getElementById("input-due");
  const inputPriority = document.getElementById("input-priority");

  function openAddSheet() {
    addForm.reset();
    addSheet.hidden = false;
    inputTitle.focus();
  }

  function closeAddSheet() {
    addSheet.hidden = true;
  }

  const editSheet = document.getElementById("edit-sheet");
  const editForm = document.getElementById("edit-form");
  const editTitle = document.getElementById("edit-title");
  const editDue = document.getElementById("edit-due");
  const editPriority = document.getElementById("edit-priority");
  let editingTaskId = null;

  function openEditSheet(task) {
    editingTaskId = task.id;
    editTitle.value = task.title;
    editDue.value = task.dueDate || "";
    editPriority.value = task.priority || "";
    editSheet.hidden = false;
  }

  function closeEditSheet() {
    editSheet.hidden = true;
    editingTaskId = null;
  }

  // ===== Event wiring =====

  navToday.addEventListener("click", () => showView("today"));
  navCompleted.addEventListener("click", () => showView("completed"));

  document.getElementById("fab-add").addEventListener("click", openAddSheet);
  document.getElementById("cancel-add").addEventListener("click", closeAddSheet);

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = inputTitle.value.trim();
    if (!title) return;
    state.tasks.push({
      id: makeId(),
      title,
      dueDate: inputDue.value || null,
      priority: inputPriority.value || "",
      completed: false,
      createdAt: Date.now(),
      completedAt: null,
    });
    saveState();
    closeAddSheet();
    render();
  });

  document.getElementById("cancel-edit").addEventListener("click", closeEditSheet);

  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const task = state.tasks.find((t) => t.id === editingTaskId);
    if (task) {
      const title = editTitle.value.trim();
      if (!title) return;
      task.title = title;
      task.dueDate = editDue.value || null;
      task.priority = editPriority.value || "";
      saveState();
      showToast("変更しました");
    }
    closeEditSheet();
    render();
  });

  function findTaskFromEvent(e) {
    const li = e.target.closest("li[data-id]");
    if (!li) return null;
    return state.tasks.find((t) => t.id === li.dataset.id) || null;
  }

  [els.listToday, els.listThisWeek, els.listLater].forEach((list) => {
    list.addEventListener("click", (e) => {
      const task = findTaskFromEvent(e);
      if (!task) return;
      if (e.target.closest(".task-check")) {
        completeTask(task);
      } else if (e.target.closest(".menu-trigger")) {
        toggleMenu(e.target.closest(".task-menu"));
      } else if (e.target.closest(".menu-edit")) {
        closeAllMenus();
        openEditSheet(task);
      } else if (e.target.closest(".menu-delete")) {
        closeAllMenus();
        deleteTask(task.id);
      }
    });
  });

  els.listCompleted.addEventListener("click", (e) => {
    const task = findTaskFromEvent(e);
    if (!task) return;
    if (e.target.closest(".restore-btn")) {
      restoreTask(task);
    } else if (e.target.closest(".menu-trigger")) {
      toggleMenu(e.target.closest(".task-menu"));
    } else if (e.target.closest(".menu-delete")) {
      closeAllMenus();
      deleteTask(task.id);
    }
  });

  // ===== Init =====

  function init() {
    showView("today");
    render();
  }

  init();
})();
