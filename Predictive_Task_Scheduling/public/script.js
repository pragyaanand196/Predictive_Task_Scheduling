// Global Application State
let tasks = [];
let metrics = {};
let prediction = null;

// Search, Filters & Sorting State
let searchQuery = "";
let typeFilter = "";
let statusFilter = "";
let priorityFilter = "";
let sortBy = "";
let sortOrder = "asc";

// Modal and Form editing state
let editingTaskId = null;

// DOM Elements
const statTotalTasks = document.getElementById("stat-total-tasks");
const statCompletedTasks = document.getElementById("stat-completed-tasks");
const statPendingTasks = document.getElementById("stat-pending-tasks");
const statAvgTime = document.getElementById("stat-avg-time");
const statBestEmployee = document.getElementById("stat-best-employee");
const statAvgPerformance = document.getElementById("stat-avg-performance");
const statCommonType = document.getElementById("stat-common-type");

const predTypeSelect = document.getElementById("pred-type");
const predDurationInput = document.getElementById("pred-duration");
const predResultContainer = document.getElementById("pred-result-container");
const predCandidatesList = document.getElementById("pred-candidates-list");

const searchInput = document.getElementById("search-input");
const filterType = document.getElementById("filter-type");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const btnClearFilters = document.getElementById("btn-clear-filters");

const tasksTableBody = document.getElementById("tasks-table-body");
const footerCount = document.getElementById("footer-count");
const footerFilters = document.getElementById("footer-filters");

const taskModal = document.getElementById("task-modal");
const modalTitle = document.getElementById("modal-title");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal = document.getElementById("btn-cancel-modal");
const taskForm = document.getElementById("task-form");
const modalErrorAlert = document.getElementById("modal-error-alert");
const modalErrorText = document.getElementById("modal-error-text");

const formTaskName = document.getElementById("form-task-name");
const formTaskType = document.getElementById("form-task-type");
const formTaskPriority = document.getElementById("form-task-priority");
const formTaskEst = document.getElementById("form-task-est");
const formTaskStatus = document.getElementById("form-task-status");
const formTaskEmployee = document.getElementById("form-task-employee");
const btnFormAutoAssign = document.getElementById("btn-form-auto-assign");
const formCompletedFields = document.getElementById("form-completed-fields");
const formTaskAct = document.getElementById("form-task-act");
const formTaskDate = document.getElementById("form-task-date");

const btnCreateTaskHeader = document.getElementById("btn-create-task-header");
const btnCreateTaskBody = document.getElementById("btn-create-task-body");
const btnSubmitForm = document.getElementById("btn-submit-form");

const toastNotification = document.getElementById("toast-notification");
const toastMessage = document.getElementById("toast-message");

// API Requests
async function loadData() {
  try {
    const tasksRes = await fetch("/api/tasks");
    tasks = await tasksRes.json();

    const metricsRes = await fetch("/api/dashboard");
    metrics = await metricsRes.json();

    renderDashboard();
    renderTasksTable();
    updatePrediction();
  } catch (err) {
    console.error("Failed to read database logs:", err);
    showToast("Error establishing connection with background node", "error");
  }
}

// Render Dashboard
function renderDashboard() {
  statTotalTasks.textContent = metrics.totalTasks || 0;
  statCompletedTasks.textContent = metrics.completedTasks || 0;
  statPendingTasks.textContent = metrics.pendingTasks || 0;
  statAvgTime.textContent = (metrics.avgCompletionTime || 0) + " hrs";
  statBestEmployee.textContent = metrics.bestEmployee || "None";
  statAvgPerformance.textContent = (metrics.avgEmployeePerformance || 0) + "%";
  statCommonType.textContent = metrics.mostCommonTaskType || "None";
}

// Render Table of Tasks
function renderTasksTable() {
  // Apply Search Query & Filter parameters
  const filtered = tasks.filter(task => {
    const matchesSearch = 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.employee.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter ? task.type === typeFilter : true;
    const matchesStatus = statusFilter ? task.status === statusFilter : true;
    const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  // Apply Sorting
  if (sortBy) {
    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // Clear Table
  tasksTableBody.innerHTML = "";

  if (filtered.length === 0) {
    tasksTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-slate text-center" style="padding: 48px 0;">
          <svg style="margin: 0 auto 12px auto; display: block;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          No matching scheduling entries in database
        </td>
      </tr>
    `;
    footerCount.textContent = `Showing 0 of ${tasks.length} tasks`;
    return;
  }

  // Populate rows
  filtered.forEach(task => {
    const tr = document.createElement("tr");

    const dateHtml = task.completionDate 
      ? `<span class="task-date-sub"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Completed on ${task.completionDate}</span>` 
      : "";

    const priorityClass = task.priority ? task.priority.toLowerCase() : "medium";
    
    let durationHtml = `Est: ${task.estimatedDuration}h`;
    if (task.actualDuration) {
      durationHtml += `<br><span class="duration-act font-mono">Act: ${task.actualDuration}h</span>`;
    }

    const statusClass = task.status ? task.status.toLowerCase().replace(" ", "-") : "pending";

    tr.innerHTML = `
      <td>
        <div class="task-title-cell">${escapeHtml(task.name)}</div>
        ${dateHtml}
      </td>
      <td><span class="type-pill">${task.type}</span></td>
      <td class="assignee-name">${task.employee}</td>
      <td><span class="priority-cell ${priorityClass}">${task.priority}</span></td>
      <td><div class="duration-stack font-mono">${durationHtml}</div></td>
      <td><span class="status-pill ${statusClass}">${task.status}</span></td>
      <td>
        <div class="actions-group">
          <button class="btn-icon edit" onclick="editTask('${task.id}')" title="Edit Task Record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" onclick="deleteTask('${task.id}')" title="Delete Task Record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tasksTableBody.appendChild(tr);
  });

  footerCount.textContent = `Showing ${filtered.length} of ${tasks.length} tasks`;
  
  const filterCount = [typeFilter, statusFilter, priorityFilter].filter(Boolean).length;
  footerFilters.textContent = `Filters active: ${filterCount}`;
  
  if (filterCount > 0 || searchQuery) {
    btnClearFilters.classList.remove("hidden");
  } else {
    btnClearFilters.classList.add("hidden");
  }
}

// Trigger Prediction
let predictionTimeout = null;
function triggerPredictionChange() {
  clearTimeout(predictionTimeout);
  predictionTimeout = setTimeout(updatePrediction, 250);
}

async function updatePrediction() {
  const type = predTypeSelect.value;
  const duration = predDurationInput.value || 8;

  if (!type || !duration) return;

  try {
    const res = await fetch(`/api/predict?type=${encodeURIComponent(type)}&estimatedDuration=${duration}`);
    if (!res.ok) throw new Error("Predict request failed");
    prediction = await res.json();

    // Render prediction card
    predResultContainer.innerHTML = `
      <div class="rec-row-top">
        <div>
          <span class="rec-badge">Optimal Recomended Team Assignee</span>
          <h4 class="rec-employee">${prediction.predictedEmployee}</h4>
        </div>
        <div class="rec-confidence">
          <span class="rec-badge" style="display: block;">Predictive Match</span>
          <span class="rec-confidence-val">${prediction.confidencePercentage}%</span>
        </div>
      </div>
      <p class="rec-desc">${prediction.reason}</p>
      <div class="rec-stats">
        <div class="rec-stat-card">
          <span class="rec-stat-label">Expected Completion</span>
          <span class="rec-stat-value">${prediction.expectedDuration} hrs</span>
        </div>
        <div class="rec-stat-card">
          <span class="rec-stat-label">Type Historic Avg</span>
          <span class="rec-stat-value">${prediction.averageTime} hrs</span>
        </div>
      </div>
    `;

    // Render candidates stacked suitability lists
    predCandidatesList.innerHTML = "";
    prediction.allRecommendations.forEach(rec => {
      const isWinner = rec.employee === prediction.predictedEmployee;
      const winnerClass = isWinner ? "winner" : "";
      
      const itemDiv = document.createElement("div");
      itemDiv.className = `candidate-item ${winnerClass}`;
      itemDiv.innerHTML = `
        <div class="candidate-info">
          <span class="candidate-name">
            ${rec.employee}
            ${isWinner ? '<span class="winner-tag">Highly Recommended</span>' : ""}
          </span>
          <span class="candidate-subtext">
            Active: <strong>${rec.workload}h</strong> &bull; Completed: <strong>${rec.completionRate}%</strong> &bull; Historic Speed: <strong>${rec.avgTimeForType}h</strong>
          </span>
        </div>
        <span class="candidate-score">Score: ${rec.compositeScore}</span>
      `;
      predCandidatesList.appendChild(itemDiv);
    });

  } catch (err) {
    predResultContainer.innerHTML = `<p class="text-slate text-center text-xs">Failed to calculate predictive scheduling model</p>`;
  }
}

// CRUD Operations
async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this scheduled task record?")) return;
  try {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Task deleted successfully!", "success");
      loadData();
    } else {
      showToast("Server rejected delete command", "error");
    }
  } catch (e) {
    showToast("Network failure executing delete", "error");
  }
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = task.id;
  modalTitle.textContent = "Modify Task Records";
  btnSubmitForm.textContent = "Save Changes";

  formTaskName.value = task.name;
  formTaskType.value = task.type;
  formTaskPriority.value = task.priority;
  formTaskEst.value = task.estimatedDuration;
  formTaskStatus.value = task.status;
  formTaskEmployee.value = task.employee;
  formTaskAct.value = task.actualDuration || "";
  formTaskDate.value = task.completionDate || "";

  toggleFormCompletedFields();
  modalErrorAlert.classList.add("hidden");
  taskModal.classList.remove("hidden");
}

function openAddModal() {
  editingTaskId = null;
  modalTitle.textContent = "Schedule New Task";
  btnSubmitForm.textContent = "Schedule Task";

  taskForm.reset();
  formTaskType.value = "Development";
  formTaskPriority.value = "Medium";
  formTaskEst.value = "8";
  formTaskStatus.value = "Pending";
  formTaskEmployee.value = "Alice Vance";

  toggleFormCompletedFields();
  modalErrorAlert.classList.add("hidden");
  taskModal.classList.remove("hidden");
}

function closeFormModal() {
  taskModal.classList.add("hidden");
}

function toggleFormCompletedFields() {
  if (formTaskStatus.value === "Completed") {
    formCompletedFields.classList.remove("hidden");
    formTaskAct.setAttribute("required", "required");
    formTaskDate.setAttribute("required", "required");
  } else {
    formCompletedFields.classList.add("hidden");
    formTaskAct.removeAttribute("required");
    formTaskDate.removeAttribute("required");
  }
}

async function handleAutoAssign() {
  const type = formTaskType.value;
  const duration = formTaskEst.value || 8;

  if (!type || !duration) {
    showFormError("Select task type and write estimated duration hours first");
    return;
  }

  try {
    const res = await fetch(`/api/predict?type=${encodeURIComponent(type)}&estimatedDuration=${duration}`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    formTaskEmployee.value = data.predictedEmployee;
    showToast(`🤖 Optimal employee predicted: ${data.predictedEmployee} (${data.confidencePercentage}% Confidence)`, "success");
  } catch (e) {
    showToast("Prediction algorithm failed inside form", "error");
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  modalErrorAlert.classList.add("hidden");

  const name = formTaskName.value.trim();
  const type = formTaskType.value;
  const priority = formTaskPriority.value;
  const est = Number(formTaskEst.value);
  const status = formTaskStatus.value;
  const employee = formTaskEmployee.value;
  const act = formTaskAct.value ? Number(formTaskAct.value) : null;
  const date = formTaskDate.value || null;

  // Manual Validation checks
  if (!name) {
    showFormError("Please enter a descriptive task title");
    return;
  }
  if (est <= 0) {
    showFormError("Estimated duration must be positive hours");
    return;
  }
  if (status === "Completed") {
    if (!act || act <= 0) {
      showFormError("Completed tasks require a valid actual duration");
      return;
    }
    if (!date) {
      showFormError("Completed tasks require a completion date calendar entry");
      return;
    }
  }

  const payload = {
    name,
    type,
    priority,
    estimatedDuration: est,
    status,
    employee,
    actualDuration: status === "Completed" ? act : null,
    completionDate: status === "Completed" ? date : null
  };

  try {
    let res;
    if (editingTaskId) {
      res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(editingTaskId ? "Task record updated" : "New task scheduled!", "success");
      closeFormModal();
      loadData();
    } else {
      const err = await res.json();
      showFormError(err.error || "Save operation failed on server");
    }
  } catch (err) {
    showFormError("Server connection timeout. Ensure dev server binds to port 3000.");
  }
}

function showFormError(msg) {
  modalErrorText.textContent = msg;
  modalErrorAlert.classList.remove("hidden");
}

// Visual Helpers
function showToast(message, type) {
  toastMessage.textContent = message;
  if (type === "success") {
    toastNotification.style.borderColor = "#a7f3d0";
    toastNotification.style.color = "#065f46";
    toastNotification.querySelector(".toast-indicator").style.backgroundColor = "#059669";
    toastNotification.querySelector(".toast-indicator").innerHTML = "&#10004;";
  } else {
    toastNotification.style.borderColor = "#fca5a5";
    toastNotification.style.color = "#991b1b";
    toastNotification.querySelector(".toast-indicator").style.backgroundColor = "#dc2626";
    toastNotification.querySelector(".toast-indicator").innerHTML = "&#10008;";
  }
  toastNotification.classList.remove("hidden");
  setTimeout(() => {
    toastNotification.classList.add("hidden");
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Event Listeners Configuration
predTypeSelect.addEventListener("change", triggerPredictionChange);
predDurationInput.addEventListener("input", triggerPredictionChange);

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderTasksTable();
});

filterType.addEventListener("change", (e) => {
  typeFilter = e.target.value;
  renderTasksTable();
});

filterStatus.addEventListener("change", (e) => {
  statusFilter = e.target.value;
  renderTasksTable();
});

filterPriority.addEventListener("change", (e) => {
  priorityFilter = e.target.value;
  renderTasksTable();
});

btnClearFilters.addEventListener("click", () => {
  searchInput.value = "";
  filterType.value = "";
  filterStatus.value = "";
  filterPriority.value = "";
  searchQuery = "";
  typeFilter = "";
  statusFilter = "";
  priorityFilter = "";
  renderTasksTable();
});

btnCreateTaskHeader.addEventListener("click", openAddModal);
btnCreateTaskBody.addEventListener("click", openAddModal);
btnCloseModal.addEventListener("click", closeFormModal);
btnCancelModal.addEventListener("click", closeFormModal);
formTaskStatus.addEventListener("change", toggleFormCompletedFields);
btnFormAutoAssign.addEventListener("click", handleAutoAssign);
taskForm.addEventListener("submit", handleFormSubmit);

// Sort header handlers
document.querySelectorAll(".sortable").forEach(th => {
  th.addEventListener("click", () => {
    const property = th.getAttribute("data-sort");
    if (sortBy === property) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortBy = property;
      sortOrder = "asc";
    }

    // Update arrows
    document.querySelectorAll(".sort-icon").forEach(icon => {
      icon.innerHTML = "&#11097;";
    });
    const indicator = th.querySelector(".sort-icon");
    indicator.innerHTML = sortOrder === "asc" ? "&#9650;" : "&#9660;";

    renderTasksTable();
  });
});

// App Startup
loadData();
