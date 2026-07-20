# Predictive Task Scheduling Dashboard

A smart, lightweight, rule-based predictive scheduling simulator that analyzes historical timesheets to recommend optimal task owners, estimate actual completion times, and calculate performance metrics. This project is built using **Node.js**, **Express.js**, **Vanilla JavaScript**, **HTML5**, and **CSS3** with a file-based **JSON database** for persistence.

This folder is designed specifically for standard desktop/offline use. It can be copied directly into **Visual Studio Code** and booted locally using standard NPM commands.

---

## 🚀 Quick Start (Local VS Code Run)

To run this standalone version locally on your system:

1. **Extract or Copy** the `Predictive_Task_Scheduling` folder to your computer.
2. **Open the Folder** in Visual Studio Code.
3. Open your terminal in VS Code (`Ctrl + ~`) and install dependencies:
   ```bash
   npm install
   ```
4. **Start the Express Server**:
   ```bash
   npm start
   ```
5. **Open in Browser**: Navigate to [http://localhost:3000](http://localhost:3000) to view the live dashboard.

---

## 🛠️ Predictive Algorithm & Rules

The predictive allocator analyzes historical tasks in `data/tasks.json` using a multi-criteria weighted formula to suggest the best employee for a given task type and estimated duration. 

### Composite Scoring System:
Each employee is scored dynamically out of **1.0**:
$$\text{Suitability Score} = 0.4 \times S_{\text{workload}} + 0.3 \times S_{\text{reliability}} + 0.3 \times S_{\text{efficiency}}$$

1. **Active Workload Score ($S_{\text{workload}}$) - 40% Weight**:
   - Calculates total backlog hours for tasks with statuses `"Pending"` or `"In Progress"`.
   - Normalizes this against other candidates to reward employees with the lowest capacity usage, protecting them from burnout.
2. **Historical Reliability Score ($S_{\text{reliability}}$) - 30% Weight**:
   - Calculates the ratio of completed tasks divided by the total assigned tasks for that employee.
   - Rewards employees with high historical completion percentages.
3. **Speed Efficiency Score ($S_{\text{efficiency}}$) - 30% Weight**:
   - Compares actual completed duration versus estimated duration specifically for the selected task type: $\text{Ratio} = \text{Actual Duration} / \text{Estimated Duration}$.
   - A ratio of `< 1.0` means the employee is faster than expected. 
   - Efficiency is capped to prioritize candidates who historically finish task types ahead of schedule.

### Match Confidence:
The suitability score is mapped to a realistic confidence range ($60\%$ to $98\%$) based on the composite score.

---

## 📂 Folder Structure

The project has been laid out in a clean, professional, and modular workspace structure:

```text
Predictive_Task_Scheduling/
├── data/
│   └── tasks.json       # JSON file database storing task records
├── public/
│   ├── index.html       # Primary responsive user interface
│   ├── style.css        # Clean, modern white-background CSS styling
│   └── script.js        # Event listeners, state managers, and API connectors
├── package.json         # Project manifests and dependency configurations
├── server.js            # Node.js + Express backend serving REST APIs and pages
└── README.md            # Technical documentation and guides
```

---

## 🔌 API Details

The Express.js server implements the following REST endpoints:

### 1. Task Management (CRUD)
* **`GET /api/tasks`**
  * *Description*: Retrieves all task objects from `tasks.json`.
  * *Response*: Array of Task objects.
* **`POST /api/tasks`**
  * *Description*: Creates a new task record.
  * *Payload*: `{ name, type, employee, priority, estimatedDuration, status }`
* **`PUT /api/tasks/:id`**
  * *Description*: Modifies an existing task record (e.g., completes a task by adding `actualDuration` and `completionDate`).
* **`DELETE /api/tasks/:id`**
  * *Description*: Permanently deletes a task record.

### 2. Live Recommender
* **`GET /api/predict?type={Type}&estimatedDuration={Hours}`**
  * *Description*: Triggers the rule-based prediction engine for a given task specification.
  * *Response*: Includes `predictedEmployee`, `reason` breakdown, `averageTime`, `expectedDuration`, and detailed scorecard records for all candidates.

### 3. Dashboard Metrics
* **`GET /api/dashboard`**
  * *Description*: Compiles real-time stats (Total Tasks, Completed Count, Pending Count, Average Completion Time, Best Performing Employee, and Average Team Reliability Rate).

---

## 🔮 Future Scope

For an internship expansion, the following updates are recommended:
1. **Relational Database Migration**: Connect the Express app to a PostgreSQL or SQLite database using Drizzle ORM.
2. **Calendar Booking Integration**: Match recommended tasks against employees' real Google Calendar schedules via OAuth to avoid booking conflicts.
3. **Advanced Trend Forecasting**: Replace the rule-based average ratio with simple regression algorithms to improve duration estimations based on seasonal or daily performance factors.
