# Predictive Task Scheduling System

A lightweight, rule-based predictive task scheduling and assignment dashboard. The application analyzes historical timesheet data, staff availability, and individual execution ratios to predict the most efficient task assignee, estimate project completion times, and prevent workload bottlenecks.

This project was built to satisfy internship requirements as a high-quality, fully modular, and production-ready system. It contains two functional layers:
1. **Full-Stack Production Environment**: Built with React (Vite, TypeScript, Tailwind CSS, Motion) on an Express.js backend.
2. **Offline Standalone Sandbox**: Located in `/Predictive_Task_Scheduling`, built with vanilla HTML, CSS, client-side JS, and Node.js for zero-configuration local execution directly inside Visual Studio Code.

---

## 🛠️ The Predictive Algorithm

The heart of the application is a rule-based suitability scorer that evaluates potential assignees when scheduling a new task. Rather than using black-box machine learning, it relies on a transparent, multi-criteria mathematical formula designed for reliability and speed:

$$\text{Suitability Score} = (0.4 \times S_{\text{workload}}) + (0.3 \times S_{\text{reliability}}) + (0.3 \times S_{\text{efficiency}})$$

### 1. Workload Capacity ($S_{\text{workload}}$) — 40% Weight
To prevent developer burnout and minimize project bottlenecking, the system calculates the sum of all estimated hours for active tasks (statuses of `Pending` or `In Progress`) currently assigned to each developer:
* Let $W_i$ be the total pending hours of employee $i$.
* Let $W_{\text{max}}$ be the maximum pending workload in the candidate pool.
* The normalized capacity score is: 
  $$S_{\text{workload}} = 1.0 - \frac{W_i}{W_{\text{max}} + 1}$$
* Candidates with lower workloads receive higher scores.

### 2. Historical Reliability ($S_{\text{reliability}}$) — 30% Weight
The algorithm rewards employees who maintain a strong record of task completion:
* Let $T_{\text{total}}$ be the total number of tasks assigned to an employee.
* Let $T_{\text{completed}}$ be the number of tasks marked as `Completed`.
* The reliability score is:
  $$S_{\text{reliability}} = \frac{T_{\text{completed}}}{T_{\text{total}}}$$
* If a team member has no historical tasks, they default to a baseline of `1.0` to encourage initial scheduling.

### 3. Task Type Speed Efficiency ($S_{\text{efficiency}}$) — 30% Weight
Different employees excel at different categories of work (e.g., Development, Design, Testing, Marketing, Research). The system tracks the employee's average completion ratio for the selected task type:
* Let $E_{\text{actual}}$ be the sum of actual durations for completed tasks of type $T$.
* Let $E_{\text{est}}$ be the sum of estimated durations for those same tasks.
* The speed ratio is:
  $$\text{Ratio} = \frac{E_{\text{actual}}}{E_{\text{est}}}$$
* A ratio of $< 1.0$ indicates the developer completes tasks faster than the original estimates.
* The speed score is mapped to prevent outliers:
  $$S_{\text{efficiency}} = \max\left(0.1, 1.5 - (0.5 \times \text{Ratio})\right)$$

---

## 📂 Repository Structure

```text
.
├── Predictive_Task_Scheduling/  # Standalone local VS Code sandbox (No-bundler)
│   ├── data/
│   │   └── tasks.json           # File-based JSON database for local run
│   ├── public/
│   │   ├── index.html           # Main dashboard user interface (Vanilla)
│   │   ├── style.css            # Custom CSS styles (Blue Accent Theme)
│   │   └── script.js            # DOM controllers and local API callers
│   ├── package.json             # Sandbox metadata and start scripts
│   ├── server.js                # Express app serving static public files & APIs
│   └── README.md                # Standalone setup guides
│
├── src/                         # Full-stack production files (React + TS)
│   ├── App.tsx                  # Main React dashboard layout & interactive views
│   ├── index.css                # Tailwind CSS imports & global typography config
│   └── main.tsx                 # Client application entry point
│
├── data/                        # JSON file store for production environment
│   └── tasks.json               # Seed task logs and operational data
│
├── package.json                 # Parent dev server and build orchestrator
├── server.ts                    # Production Express backend and API endpoints
├── vite.config.ts               # Vite configuration (HMR policies and path aliases)
└── README.md                    # This master documentation file
```

---

## 📡 API Architecture

The Express server implements a REST API to query metrics, handle CRUD actions on the JSON file database, and run prediction rules:

### Task CRUD
* **`GET /api/tasks`**: Returns all recorded tasks from `tasks.json`.
* **`POST /api/tasks`**: Adds a new task. Compulsory body params: `name`, `type`, `employee`, `priority`, `estimatedDuration`, `status`.
* **`PUT /api/tasks/:id`**: Modifies a task by its unique ID. If setting a task's status to `Completed`, you must provide `actualDuration` and `completionDate`.
* **`DELETE /api/tasks/:id`**: Removes a task from the datastore.

### Analytic Operations
* **`GET /api/dashboard`**: Generates real-time, consolidated metric aggregates:
  * Total task count
  * Ratio of pending vs. completed tasks
  * Average timesheet completion time (hours)
  * Best-performing employee based on the composite score
  * Most frequent task type
  * Average team reliability rate
* **`GET /api/predict?type={Type}&estimatedDuration={Hours}`**: Evaluates the scheduling algorithm rules for a pending task. Returns:
  * Recommended developer (`predictedEmployee`)
  * Human-readable algorithmic explanation (`reason`)
  * Historical average time for this category (`averageTime`)
  * Expected actual completion duration (`expectedDuration`)
  * Confidence rating percentage (`confidencePercentage`)
  * Complete developer scorecard array (`allRecommendations`)

---

## 🚀 Installation & Local Execution

This repository supports two execution modes. Choose the one that matches your local environment requirements.

### Mode A: Standalone Vanilla Sandbox (Recommended for quick testing)
Use this option if you want to run the project locally without complex TypeScript build tools or compilation steps.

1. Navigate into the sandbox directory:
   ```bash
   cd Predictive_Task_Scheduling
   ```
2. Install the production dependencies:
   ```bash
   npm install
   ```
3. Boot the server:
   ```bash
   npm start
   ```
4. Access the web dashboard in your browser:
   [http://localhost:3000](http://localhost:3000)

### Mode B: Full-Stack React Production Server
Use this option if you want to run the React single-page application with hot asset serving.

1. Install development dependencies in the root directory:
   ```bash
   npm install
   ```
2. Launch the developer server:
   ```bash
   npm run dev
   ```
3. Access the compilation live stream at:
   [http://localhost:3000](http://localhost:3000)

---

## 🛡️ Input Validation Policies

To maintain dataset integrity, the frontend and backend validate fields on every state change:
* **Task Title**: Cannot be empty; white spaces are automatically trimmed.
* **Estimated Duration**: Must be a positive number greater than `0`.
* **Completion Constraints**: Tasks marked as `Completed` must provide an actual completion date and a positive non-zero number for actual hours worked. Failure to do so throws a visible inline error.

---

## 🔮 Future Expansion Roadmaps

While kept light and accessible for a standard internship demonstration, the architecture is easily extendable:
1. **Durable Database Transition**: Replace the static filesystem-based `tasks.json` with a PostgreSQL database instance connected via Drizzle ORM.
2. **Third-Party Calendar Syncing**: Query team members' real-world calendars (such as Google Calendar or Outlook) via OAuth integration to automatically check for scheduled leave and meetings before recommending assignments.
3. **Continuous Estimation Tuning**: Refine the speed ratio over time using a simple rolling exponential moving average (EMA) to weigh recent performance heavier than historical performance.
