import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

const TASKS_FILE = path.join(__dirname, "data", "tasks.json");

// Ensure data directory exists
async function ensureDataDir() {
  const dir = path.join(__dirname, "data");
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Already exists or can't create
  }
}

async function readTasks() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(TASKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading tasks file, returning empty array:", error);
    return [];
  }
}

async function writeTasks(tasks) {
  await ensureDataDir();
  try {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing tasks file:", error);
  }
}

// API: GET Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: GET Tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to read tasks" });
  }
});

// API: POST Task
app.post("/api/tasks", async (req, res) => {
  try {
    const { name, type, employee, priority, estimatedDuration, status, actualDuration, completionDate } = req.body;
    
    if (!name || !type || !employee || !priority || !estimatedDuration || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tasks = await readTasks();
    const newTask = {
      id: "task-" + Date.now(),
      name,
      type,
      employee,
      priority,
      estimatedDuration: Number(estimatedDuration),
      actualDuration: (actualDuration !== undefined && actualDuration !== null && actualDuration !== "") ? Number(actualDuration) : null,
      status,
      completionDate: completionDate || null
    };

    tasks.push(newTask);
    await writeTasks(tasks);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// API: PUT Task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, employee, priority, estimatedDuration, actualDuration, status, completionDate } = req.body;

    const tasks = await readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    tasks[index] = {
      ...tasks[index],
      name: name !== undefined ? name : tasks[index].name,
      type: type !== undefined ? type : tasks[index].type,
      employee: employee !== undefined ? employee : tasks[index].employee,
      priority: priority !== undefined ? priority : tasks[index].priority,
      estimatedDuration: estimatedDuration !== undefined ? Number(estimatedDuration) : tasks[index].estimatedDuration,
      actualDuration: actualDuration !== undefined ? (actualDuration === null || actualDuration === "" ? null : Number(actualDuration)) : tasks[index].actualDuration,
      status: status !== undefined ? status : tasks[index].status,
      completionDate: completionDate !== undefined ? (completionDate === null || completionDate === "" ? null : completionDate) : tasks[index].completionDate,
    };

    await writeTasks(tasks);
    res.json(tasks[index]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// API: DELETE Task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await readTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) {
      return res.status(404).json({ error: "Task not found" });
    }
    await writeTasks(filtered);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// API: Predictive Scheduling Recommender
app.get("/api/predict", async (req, res) => {
  try {
    const { type, estimatedDuration } = req.query;
    if (!type || !estimatedDuration) {
      return res.status(400).json({ error: "Task type and estimated duration are required" });
    }

    const taskType = String(type);
    const estDur = Number(estimatedDuration);

    const tasks = await readTasks();
    const employees = ["Alice Vance", "Bob Miller", "Charlie Smith", "Diana Prince", "Evan Wright"];
    const completedTasks = tasks.filter(t => t.status === "Completed");

    // 1. Calculate metrics for each employee
    const employeeStats = employees.map(emp => {
      const empTasks = tasks.filter(t => t.employee === emp);
      const empCompleted = empTasks.filter(t => t.status === "Completed");
      const empUnfinished = empTasks.filter(t => t.status === "Pending" || t.status === "In Progress");

      // Workload: Sum of estimated durations of unfinished tasks
      const workload = empUnfinished.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);

      // Completion Rate (default to 1.0 for fresh employees)
      const completionRate = empTasks.length > 0 ? empCompleted.length / empTasks.length : 1.0;

      // Type-specific speed ratio: actual / estimated
      const typeCompleted = empCompleted.filter(t => t.type === taskType);
      let speedRatio = 1.0;

      if (typeCompleted.length > 0) {
        const totalAct = typeCompleted.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
        const totalEst = typeCompleted.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
        speedRatio = totalEst > 0 ? totalAct / totalEst : 1.0;
      } else if (empCompleted.length > 0) {
        // Fallback to general speed ratio
        const totalAct = empCompleted.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
        const totalEst = empCompleted.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
        speedRatio = totalEst > 0 ? totalAct / totalEst : 1.0;
      }

      // Calculate historical average duration for this type
      let avgTimeForType = estDur;
      if (typeCompleted.length > 0) {
        avgTimeForType = typeCompleted.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / typeCompleted.length;
      } else {
        // Fallback to all employees' average for this type
        const allTypeCompleted = completedTasks.filter(t => t.type === taskType);
        if (allTypeCompleted.length > 0) {
          avgTimeForType = allTypeCompleted.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / allTypeCompleted.length;
        }
      }

      return {
        employee: emp,
        workload,
        completionRate,
        speedRatio,
        avgTimeForType
      };
    });

    // Find max workload for normalization
    const maxWorkload = Math.max(...employeeStats.map(s => s.workload));

    // Calculate score for each employee
    const scoredEmployees = employeeStats.map(stat => {
      // Normalised Workload Score (higher is better, range [0, 1])
      const workloadScore = maxWorkload > 0 ? 1.0 - (stat.workload / (maxWorkload + 1)) : 1.0;

      // Completion Rate Score [0, 1]
      const completionScore = stat.completionRate;

      // Speed Score: lower ratio is better.
      const cappedRatio = Math.max(0.4, Math.min(2.5, stat.speedRatio));
      const speedScore = Math.max(0.1, 1.5 - 0.5 * cappedRatio);

      // Composite Score: 40% Workload, 30% Completion, 30% Speed
      const compositeScore = 0.4 * workloadScore + 0.3 * completionScore + 0.3 * speedScore;

      return {
        ...stat,
        workloadScore,
        completionScore,
        speedScore,
        compositeScore
      };
    });

    // Sort by compositeScore descending
    scoredEmployees.sort((a, b) => b.compositeScore - a.compositeScore);

    const best = scoredEmployees[0];

    // Expected duration based on employee speed ratio
    const expectedDuration = Math.round((estDur * best.speedRatio) * 10) / 10;

    // Confidence percentage
    const confidencePercentage = Math.min(98, Math.max(60, Math.round(best.compositeScore * 95)));

    // Generate reasoning sentence
    let reason = `${best.employee} has the best overall predictive score. `;
    if (best.workload === 0) {
      reason += `They currently have zero active workload, minimizing scheduling bottlenecks. `;
    } else {
      reason += `They have a highly manageable active workload of ${best.workload}h. `;
    }

    if (best.speedRatio < 0.95) {
      reason += `Historically, they complete ${taskType} tasks ${Math.round((1 - best.speedRatio) * 100)}% faster than estimate. `;
    } else if (best.speedRatio > 1.05) {
      reason += `They complete ${taskType} tasks slightly slower than estimated but are chosen due to high current availability. `;
    } else {
      reason += `They are highly reliable and finish ${taskType} tasks very close to schedule. `;
    }

    reason += `Their track record shows a ${Math.round(best.completionRate * 100)}% task completion rate.`;

    res.json({
      predictedEmployee: best.employee,
      reason,
      averageTime: Math.round(best.avgTimeForType * 10) / 10,
      expectedDuration,
      confidencePercentage,
      allRecommendations: scoredEmployees.map(e => ({
        employee: e.employee,
        workload: e.workload,
        completionRate: Math.round(e.completionRate * 100),
        avgTimeForType: Math.round(e.avgTimeForType * 10) / 10,
        compositeScore: Math.round(e.compositeScore * 100)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate predictive scheduling recommendation" });
  }
});

// API: GET Dashboard Statistics
app.get("/api/dashboard", async (req, res) => {
  try {
    const tasks = await readTasks();
    const completedTasks = tasks.filter(t => t.status === "Completed");
    const pendingTasks = tasks.filter(t => t.status === "Pending");
    const inProgressTasks = tasks.filter(t => t.status === "In Progress");

    const totalTasks = tasks.length;
    const completedCount = completedTasks.length;
    const pendingCount = pendingTasks.length + inProgressTasks.length;

    // Average Completion Time
    const avgCompletionTime = completedCount > 0
      ? Math.round((completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedCount) * 10) / 10
      : 0;

    // Best Performing Employee calculation
    const employees = ["Alice Vance", "Bob Miller", "Charlie Smith", "Diana Prince", "Evan Wright"];
    const employeeMetrics = employees.map(emp => {
      const empTasks = tasks.filter(t => t.employee === emp);
      const empCompleted = empTasks.filter(t => t.status === "Completed");
      
      const completionRate = empTasks.length > 0 ? empCompleted.length / empTasks.length : 0;
      
      let speedRatio = 1.0;
      if (empCompleted.length > 0) {
        const totalAct = empCompleted.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
        const totalEst = empCompleted.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
        speedRatio = totalEst > 0 ? totalAct / totalEst : 1.0;
      }

      // Performance Score combines rate and speed ratio
      const performanceScore = (completionRate * 50) + (speedRatio > 0 ? (50 / speedRatio) : 0);

      return {
        employee: emp,
        completionRate,
        speedRatio,
        performanceScore,
        completedCount: empCompleted.length
      };
    });

    // Find employee with highest performance score
    employeeMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
    const bestEmployee = employeeMetrics[0]?.completedCount > 0 ? employeeMetrics[0].employee : "None yet";

    // Most Common Task Type
    const typeCounts = {};
    tasks.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    let mostCommonType = "None";
    let maxTypeCount = 0;
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > maxTypeCount) {
        maxTypeCount = count;
        mostCommonType = type;
      }
    });

    // Average Employee Performance Score
    const activeEmployees = employeeMetrics.filter(e => e.completedCount > 0 || e.employee === "Alice Vance");
    const avgEmployeePerformance = activeEmployees.length > 0
      ? Math.round((activeEmployees.reduce((sum, e) => sum + e.completionRate, 0) / activeEmployees.length) * 100)
      : 85;

    res.json({
      totalTasks,
      completedTasks: completedCount,
      pendingTasks: pendingCount,
      avgCompletionTime,
      bestEmployee,
      mostCommonTaskType: mostCommonType,
      avgEmployeePerformance
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate dashboard statistics" });
  }
});

// SPA Fallback: Serve public/index.html for any other requests
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
