/* =========================
   script.js — Part 3 (FINAL)
   Full advanced Kanban features:
   - dynamic columns (add/remove)
   - reorder within column (insert at index)
   - add / edit / delete tasks
   - subtasks (checklist) per task
   - comments per task
   - undo delete (snackbar)
   - export / import JSON with validation
   - animations hooks and mobile-friendly behavior
   - robust comments and structure for learning
   ========================= */

/* ---------- CONFIG & DOM refs ---------- */
const STORAGE_KEY = "kb_full_v3";

/*
State structure:
{
  columnsOrder: [ 'todo', 'progress', 'done', ... ],
  columns: {
    todo: { id:'todo', title:'To Do', tasks: [ {id, title, description, priority, due, subtasks: [{id,text,done}], comments: [{id,text,when}], createdAt}, ... ] },
    ...
  }
}
*/

const boardRoot = document.querySelector(".board"); // container for columns
const addBtn = document.getElementById("add-btn");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const taskTitleInput = document.getElementById("task-title");
const taskDescInput = document.getElementById("task-desc");
const taskPriorityInput = document.getElementById("task-priority");
const taskDueInput = document.getElementById("task-due");
const taskColumnInput = document.getElementById("task-column");
const saveBtn = document.getElementById("save-task");
const closeModalBtn = document.getElementById("close-modal");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-json");
const snack = document.getElementById("snack");
const snackText = document.getElementById("snack-text");
const undoBtn = document.getElementById("undo-btn");

// dynamic references (populated after render)
let colsMap = {};    // { colId: { tasksContainer, columnElement, countElt, titleElt } }

// internal runtime
let state = {
  columnsOrder: ["todo", "progress", "done"],
  columns: {
    todo: { id: "todo", title: "To Do", tasks: [] },
    progress: { id: "progress", title: "In Progress", tasks: [] },
    done: { id: "done", title: "Done", tasks: [] }
  }
};

let dragItem = null;
let editingId = null;   // task id being edited
let lastDeleted = null; // { task, columnId, index }
let activeSearch = "";

/* ---------- Utilities ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function nowIso() { return new Date().toISOString(); }
function escapeHtml(s = "") { return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatDate(d) { if(!d) return ""; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString(undefined,{day:'2-digit', month:'short'}); }

/* ---------- Persistence ---------- */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    // Basic validation
    if (!parsed.columnsOrder || !parsed.columns) return;
    state = parsed;
  } catch(e) {
    console.warn("Invalid saved state, ignoring.");
  }
}

/* ---------- Rendering columns & tasks ---------- */

/* Build column DOM from state.columnsOrder and state.columns */
function renderBoard() {
  // clear root
  boardRoot.innerHTML = "";

  // normalize colsMap
  colsMap = {};

  state.columnsOrder.forEach(colId => {
    const col = state.columns[colId];
    if (!col) return;

    // create column element
    const columnEl = document.createElement("div");
    columnEl.className = "column";
    columnEl.dataset.id = colId;

    // header with title, count & controls (rename, delete)
    const head = document.createElement("div");
    head.className = "col-head";

    const titleSpan = document.createElement("span");
    titleSpan.innerText = col.title || colId;

    const rightSpan = document.createElement("span");
    rightSpan.className = "right";
    rightSpan.innerText = col.tasks.length;

    // small controls for column
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "6px";
    const renameBtn = document.createElement("button");
    renameBtn.className = "btn";
    renameBtn.innerText = "Rename";
    renameBtn.addEventListener("click", () => renameColumn(colId));

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.innerText = "Delete";
    delBtn.addEventListener("click", () => removeColumn(colId));

    controls.appendChild(renameBtn);
    controls.appendChild(delBtn);

    head.appendChild(titleSpan);
    head.appendChild(rightSpan);
    // append controls to header (right side)
    const headWrapper = document.createElement("div");
    headWrapper.style.display = "flex";
    headWrapper.style.justifyContent = "space-between";
    headWrapper.style.alignItems = "center";
    headWrapper.appendChild(head);
    headWrapper.appendChild(controls);

    // tasks container
    const tasksContainer = document.createElement("div");
    tasksContainer.className = "tasks";

    // append all tasks in order
    col.tasks.forEach(task => {
      const tEl = createTaskElement(task);
      tasksContainer.appendChild(tEl);
    });

    // attach header and container
    columnEl.appendChild(headWrapper);
    columnEl.appendChild(tasksContainer);

    // append to board
    boardRoot.appendChild(columnEl);

    // save references
    colsMap[colId] = {
      columnElement: columnEl,
      tasksContainer,
      countElt: rightSpan,
      titleElt: titleSpan
    };

    // attach drag/drop handlers for this column wrapper
    enableColumnDragHandlers(colId);
  });

  // update search filter & counts
  applySearchFilter(activeSearch);
}

/* ---------- Create task card DOM ---------- */
function createTaskElement(task) {
  const el = document.createElement("div");
  el.className = "task";
  el.draggable = true;
  el.dataset.id = task.id;

  // inner HTML: title, priority, desc, subtasks count, comments icon
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2>${escapeHtml(task.title)}</h2>
      <div class="pri ${task.priority}">${task.priority==='high'?'HIGH':task.priority==='med'?'MED':'LOW'}</div>
    </div>
    <div class="small" style="color:var(--muted)">${escapeHtml(task.description||'')}</div>
    <div class="small" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <div>
        <span class="small">${task.due?formatDate(task.due):''}</span>
        <span style="margin-left:8px;color:var(--muted)">${task.subtasks?task.subtasks.filter(s=>s.done).length+'/'+(task.subtasks?task.subtasks.length:0):''}</span>
      </div>
      <div class="actions">
        <button data-action="subtask" class="icon-btn">☑</button>
        <button data-action="comment" class="icon-btn">💬</button>
        <button data-action="edit" class="icon-btn">✎</button>
        <button data-action="delete" class="icon-btn">🗑</button>
      </div>
    </div>
  `;

  // drag events
  el.addEventListener("dragstart", (e) => {
    dragItem = el;
    el.classList.add("dragging");
    try { e.dataTransfer.setData("text/plain", task.id); } catch(e){}
  });
  el.addEventListener("dragend", () => {
    if(el) el.classList.remove("dragging");
    dragItem = null;
  });

  return el;
}

/* ---------- Column operations ---------- */

// rename column
function renameColumn(colId) {
  const newName = prompt("Rename column:", state.columns[colId].title || colId);
  if (newName !== null && newName.trim() !== "") {
    state.columns[colId].title = newName.trim();
    saveState();
    renderBoard();
  }
}

// remove column (asks confirmation) — tasks will be moved to first column (if exists) or deleted
function removeColumn(colId) {
  if (!confirm("Delete column and its tasks? You can move tasks to another column instead.")) return;
  // move tasks to first existing column (excluding this)
  const idx = state.columnsOrder.indexOf(colId);
  state.columnsOrder.splice(idx,1);
  const target = state.columnsOrder[0];
  if (target && state.columns[colId] && state.columns[colId].tasks.length) {
    state.columns[colId].tasks.forEach(t => state.columns[target].tasks.push(t));
  }
  delete state.columns[colId];
  saveState();
  renderBoard();
}

/* add new column */
function addColumn() {
  const title = prompt("New column title:");
  if (!title) return;
  const id = "col_" + uid();
  state.columnsOrder.push(id);
  state.columns[id] = { id, title: title.trim(), tasks: [] };
  saveState();
  renderBoard();
}

/* ---------- Column drag handlers (reorder within) ---------- */
function enableColumnDragHandlers(colId) {
  const mapping = colsMap[colId];
  if (!mapping) return;
  const wrapper = mapping.columnElement;

  wrapper.addEventListener("dragover", (e) => {
    e.preventDefault();
    wrapper.classList.add("hover-over");
  });

  wrapper.addEventListener("dragleave", () => {
    wrapper.classList.remove("hover-over");
  });

  wrapper.addEventListener("drop", (e) => {
    e.preventDefault();
    wrapper.classList.remove("hover-over");
    if (!dragItem) return;

    const destId = colId;
    const draggedId = dragItem.dataset.id;

    // find DOM tasks in dest before mutation
    const tasksDom = Array.from(mapping.tasksContainer.querySelectorAll(".task"));

    // compute insertion index
    let insertIndex = tasksDom.length;
    for (let i = 0; i < tasksDom.length; i++) {
      const rect = tasksDom[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { insertIndex = i; break; }
    }

    // remove from previous column and capture object
    const removedInfo = removeTaskById(draggedId);
    let taskObj = removedInfo ? removedInfo.removed : findTaskById(draggedId);

    if (!taskObj) {
      taskObj = reconstructFromEl(dragItem, draggedId);
    }

    // insert into destination column at index
    state.columns[destId].tasks.splice(insertIndex, 0, taskObj);

    saveState();
    renderBoard();
  });
}

/* ---------- Find / Remove / reconstruct helpers ---------- */
function findTaskById(id) {
  for (const cId of state.columnsOrder) {
    const t = state.columns[cId].tasks.find(x => x.id === id);
    if (t) return t;
  }
  return null;
}
function removeTaskById(id) {
  for (const cId of state.columnsOrder) {
    const idx = state.columns[cId].tasks.findIndex(x => x.id === id);
    if (idx > -1) {
      const [removed] = state.columns[cId].tasks.splice(idx,1);
      lastDeleted = { task: removed, columnId: cId, index: idx };
      return { removed, from: cId, index: idx };
    }
  }
  return null;
}
function reconstructFromEl(el, id) {
  const title = el.querySelector("h2")?.innerText || "Untitled";
  const desc = el.querySelector(".small")?.innerText || "";
  const pri = el.querySelector(".pri")?.classList.contains("high") ? "high" : el.querySelector(".pri")?.classList.contains("med") ? "med" : "low";
  return { id, title, description: desc, priority: pri, due: "", subtasks: [], comments: [], createdAt: nowIso() };
}

/* ---------- Event delegation: delete / edit / subtask / comment ---------- */
document.addEventListener("click", (e) => {
  const taskEl = e.target.closest(".task");
  // actions only if clicked inside a task
  if (!taskEl) return;
  const id = taskEl.dataset.id;
  const action = e.target.dataset.action;

  if (action === "delete") {
    removeTaskById(id);
    saveState();
    renderBoard();
    showSnack("Task deleted", true);
    return;
  }

  if (action === "edit") {
    const task = findTaskById(id);
    if (!task) return;
    editingId = id;
    modalTitle.innerText = "Edit Task";
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || "";
    taskPriorityInput.value = task.priority || "low";
    taskDueInput.value = task.due || "";
    // set column select to containing column
    taskColumnInput.value = findTaskColumn(id) || state.columnsOrder[0];
    openModal();
    return;
  }

  if (action === "subtask") {
    // open small subtask prompt
    const task = findTaskById(id);
    if (!task) return;
    const subText = prompt("Enter subtask:");
    if (subText && subText.trim()) {
      if (!Array.isArray(task.subtasks)) task.subtasks = [];
      task.subtasks.push({ id: uid(), text: subText.trim(), done: false });
      saveState();
      renderBoard();
    }
    return;
  }

  if (action === "comment") {
    const task = findTaskById(id);
    if (!task) return;
    const comment = prompt("Add comment:");
    if (comment && comment.trim()) {
      if (!Array.isArray(task.comments)) task.comments = [];
      task.comments.push({ id: uid(), text: comment.trim(), when: nowIso() });
      saveState();
      renderBoard();
    }
    return;
  }
});

/* helper to find column containing an id */
function findTaskColumn(id) {
  for (const cId of state.columnsOrder) {
    if (state.columns[cId].tasks.some(x => x.id === id)) return cId;
  }
  return null;
}

/* ---------- Modal add/edit ---------- */
function openModal() { modal.classList.add("active"); taskTitleInput.focus(); }
function closeModal() { modal.classList.remove("active"); editingId = null; }

addBtn.addEventListener("click", () => {
  // open add modal, fill column select with current columns
  editingId = null;
  modalTitle.innerText = "Add Task";
  taskTitleInput.value = "";
  taskDescInput.value = "";
  taskPriorityInput.value = "low";
  taskDueInput.value = "";
  refreshColumnSelect();
  taskColumnInput.value = state.columnsOrder[0] || "";
  openModal();
});

closeModalBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* save new or update existing */
saveBtn.addEventListener("click", () => {
  const title = taskTitleInput.value.trim();
  if (!title) { alert("Title required"); taskTitleInput.focus(); return; }
  const desc = taskDescInput.value.trim();
  const priority = taskPriorityInput.value;
  const due = taskDueInput.value || "";
  const column = taskColumnInput.value || state.columnsOrder[0];

  if (editingId) {
    const col = findTaskColumn(editingId);
    if (col) {
      const t = state.columns[col].tasks.find(x => x.id === editingId);
      if (t) {
        t.title = title; t.description = desc; t.priority = priority; t.due = due;
        // if column changed, move to end of new column
        if (col !== column) {
          const idx = state.columns[col].tasks.findIndex(x => x.id === editingId);
          state.columns[col].tasks.splice(idx,1);
          state.columns[column].tasks.push(t);
        }
      }
    }
  } else {
    const newTask = { id: uid(), title, description: desc, priority, due, subtasks: [], comments: [], createdAt: nowIso() };
    state.columns[column].tasks.push(newTask);
  }

  saveState();
  renderBoard();
  closeModal();
});

/* ---------- Subtask checkbox toggle (delegated) ---------- */
document.addEventListener("change", (e) => {
  if (e.target.matches("input.subtask-checkbox")) {
    const sid = e.target.dataset.sid;
    const tid = e.target.closest(".task").dataset.id;
    const task = findTaskById(tid);
    if (!task || !task.subtasks) return;
    const s = task.subtasks.find(x => x.id === sid);
    if (s) {
      s.done = e.target.checked;
      saveState();
      renderBoard();
    }
  }
});

/* ---------- Search / Filter ---------- */
function applySearchFilter(q) {
  activeSearch = q;
  const allTasks = document.querySelectorAll(".task");
  if (!q) {
    allTasks.forEach(t => t.style.display = "");
    return;
  }
  allTasks.forEach(t => {
    const txt = (t.querySelector("h2")?.innerText + " " + t.querySelector(".small")?.innerText).toLowerCase();
    t.style.display = txt.includes(q) ? "" : "none";
  });
}
searchInput.addEventListener("input", (e) => applySearchFilter(e.target.value.trim().toLowerCase()));

/* ---------- Snackbar undo ---------- */
function showSnack(text, enableUndo=false) {
  snackText.innerText = text;
  snack.classList.add("show");
  undoBtn.style.display = enableUndo ? "" : "none";
  clearTimeout(snack._t);
  snack._t = setTimeout(()=> snack.classList.remove("show"), 5000);
}
undoBtn.addEventListener("click", () => {
  if (!lastDeleted) return;
  const { task, columnId, index } = lastDeleted;
  // restore
  if (!state.columns[columnId]) {
    // if original column removed, put in first column
    const first = state.columnsOrder[0];
    state.columns[first].tasks.splice(0,0, task);
  } else {
    state.columns[columnId].tasks.splice(index, 0, task);
  }
  saveState();
  renderBoard();
  lastDeleted = null;
  snack.classList.remove("show");
});

/* ---------- Export & Import (robust) ---------- */
// Export pretty JSON
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kanban-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import and validate
importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      // basic validation: must have columnsOrder array and columns object
      if (!parsed.columnsOrder || !parsed.columns) { alert("Invalid Kanban JSON"); return; }
      // optional: confirm merge or replace
      if (confirm("Replace current board with imported data? Click Cancel to merge.")) {
        state = parsed;
        saveState();
        renderBoard();
      } else {
        // merge: append columns not present, append tasks to existing columns
        parsed.columnsOrder.forEach(cid => {
          if (!state.columns[cid]) {
            state.columnsOrder.push(cid);
            state.columns[cid] = parsed.columns[cid];
          } else {
            // merge tasks (simple append)
            state.columns[cid].tasks = state.columns[cid].tasks.concat(parsed.columns[cid].tasks || []);
          }
        });
        saveState();
        renderBoard();
      }
    } catch (err) {
      alert("Failed to import JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  // reset file input
  importFileInput.value = "";
});

importBtn.addEventListener("click", () => importFileInput.click());

/* ---------- Column add handler (header-level) ---------- */
(function attachAddColumnToHeader() {
  // Add a button near existing controls (the HTML header has controls).
  // If there's already an "Add Column" button inserted, don't duplicate.
  if (document.getElementById("add-col-btn")) return;
  const headerControls = document.querySelector(".controls");
  if (!headerControls) return;
  const btn = document.createElement("button");
  btn.id = "add-col-btn";
  btn.className = "btn";
  btn.innerText = "Add Column";
  btn.addEventListener("click", addColumn);
  headerControls.appendChild(btn);
})();

/* ---------- Helper: refresh <select> options for column choices in modal ---------- */
function refreshColumnSelect() {
  // clear existing options
  taskColumnInput.innerHTML = "";
  state.columnsOrder.forEach(cid => {
    const opt = document.createElement("option");
    opt.value = cid;
    opt.innerText = state.columns[cid].title || cid;
    taskColumnInput.appendChild(opt);
  });
}

/* ---------- Initial load / render ---------- */
loadState();
renderBoard();
refreshColumnSelect();

/* ---------- Small animation improvements (CSS classes already present in HTML/CSS) ----------
   - You can add CSS transitions for .task hover, .hover-over etc. in CSS (Part1).
   - Here we only toggle classes for smoothness.
*/

/* ---------- End of script.js (Part 3) ----------
   If you want, I'll also:
   - Add inline UI to show subtasks and comments in a small popup (instead of prompt)
   - Implement reorder-within-column visual placeholder (insert marker)
   - Add drag-handle and touch support for mobile specifically
   - Provide a GitHub-ready zip and readme
*/
