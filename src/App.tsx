import { useState, useEffect } from "react";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  TrendingUp, 
  Users, 
  Briefcase, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  X,
  Gauge,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  name: string;
  type: string;
  employee: string;
  priority: 'Low' | 'Medium' | 'High';
  estimatedDuration: number;
  actualDuration?: number | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  completionDate?: string | null;
}

interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgCompletionTime: number;
  bestEmployee: string;
  mostCommonTaskType: string;
  avgEmployeePerformance: number;
}

interface PredictionResult {
  predictedEmployee: string;
  reason: string;
  averageTime: number;
  expectedDuration: number;
  confidencePercentage: number;
  allRecommendations: Array<{
    employee: string;
    workload: number;
    completionRate: number;
    avgTimeForType: number;
    compositeScore: number;
  }>;
}

const TASK_TYPES = ["Development", "Design", "Testing", "Marketing", "Research"];
const EMPLOYEES = ["Alice Vance", "Bob Miller", "Charlie Smith", "Diana Prince", "Evan Wright"];
const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["Pending", "In Progress", "Completed"];

export default function App() {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    avgCompletionTime: 0,
    bestEmployee: "Loading...",
    mostCommonTaskType: "Loading...",
    avgEmployeePerformance: 0
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState<keyof Task | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Predictor Inputs & State
  const [predType, setPredType] = useState("Development");
  const [predDuration, setPredDuration] = useState(8);
  const [predPriority, setPredPriority] = useState("Medium");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Modal State for Task Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Development");
  const [formEmployee, setFormEmployee] = useState("Alice Vance");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formEstDuration, setFormEstDuration] = useState("8");
  const [formActDuration, setFormActDuration] = useState("");
  const [formStatus, setFormStatus] = useState<Task["status"]>("Pending");
  const [formCompletionDate, setFormCompletionDate] = useState("");
  const [formError, setFormError] = useState("");

  // UI Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null
  });

  // Load Data
  const loadData = async () => {
    try {
      const tasksRes = await fetch("/api/tasks");
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      const metricsRes = await fetch("/api/dashboard");
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);
    } catch (e) {
      showToast("Failed to fetch fresh data from server", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate Prediction whenever inputs change
  useEffect(() => {
    const fetchPrediction = async () => {
      if (!predType || !predDuration) return;
      setIsPredicting(true);
      try {
        const res = await fetch(`/api/predict?type=${encodeURIComponent(predType)}&estimatedDuration=${predDuration}`);
        const data = await res.json();
        setPrediction(data);
      } catch (err) {
        console.error("Prediction error:", err);
      } finally {
        setIsPredicting(false);
      }
    };

    const timer = setTimeout(() => {
      fetchPrediction();
    }, 300);

    return () => clearTimeout(timer);
  }, [predType, predDuration]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: null });
    }, 4000);
  };

  // Delete Task Handler
  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Task deleted successfully!", "success");
        loadData();
      } else {
        showToast("Failed to delete task", "error");
      }
    } catch (err) {
      showToast("Network error deleting task", "error");
    }
  };

  // Open Add Task Form
  const openAddModal = () => {
    setEditingTask(null);
    setFormName("");
    setFormType("Development");
    setFormEmployee("Alice Vance");
    setFormPriority("Medium");
    setFormEstDuration("8");
    setFormActDuration("");
    setFormStatus("Pending");
    setFormCompletionDate("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Task Form
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormName(task.name);
    setFormType(task.type);
    setFormEmployee(task.employee);
    setFormPriority(task.priority);
    setFormEstDuration(task.estimatedDuration.toString());
    setFormActDuration(task.actualDuration ? task.actualDuration.toString() : "");
    setFormStatus(task.status);
    setFormCompletionDate(task.completionDate || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Run auto-assign prediction helper inside form
  const handleAutoAssign = async () => {
    if (!formType || !formEstDuration) {
      setFormError("Please select a task type and estimated duration first.");
      return;
    }
    try {
      const res = await fetch(`/api/predict?type=${encodeURIComponent(formType)}&estimatedDuration=${formEstDuration}`);
      if (res.ok) {
        const data = await res.json();
        setFormEmployee(data.predictedEmployee);
        showToast(`Auto-assigned to ${data.predictedEmployee} (${data.confidencePercentage}% Match)`, "success");
      }
    } catch (e) {
      showToast("Auto-assign prediction failed", "error");
    }
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validations
    if (!formName.trim()) return setFormError("Task name is required");
    if (!formEstDuration || Number(formEstDuration) <= 0) return setFormError("Estimated duration must be positive hours");
    
    if (formStatus === "Completed") {
      if (!formActDuration || Number(formActDuration) <= 0) {
        return setFormError("Completed tasks require actual duration hours");
      }
      if (!formCompletionDate) {
        return setFormError("Completed tasks require a completion date");
      }
    }

    const payload = {
      name: formName.trim(),
      type: formType,
      employee: formEmployee,
      priority: formPriority,
      estimatedDuration: Number(formEstDuration),
      status: formStatus,
      actualDuration: formActDuration ? Number(formActDuration) : null,
      completionDate: formCompletionDate || null
    };

    try {
      let res;
      if (editingTask) {
        res = await fetch(`/api/tasks/${editingTask.id}`, {
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
        showToast(editingTask ? "Task updated successfully!" : "Task created successfully!", "success");
        setIsModalOpen(false);
        loadData();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to save task on server");
      }
    } catch (err) {
      setFormError("Network error: failed to communicate with backend");
    }
  };

  // Sort and Filter Tasks
  const handleSort = (field: keyof Task) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.employee.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter ? task.type === typeFilter : true;
    const matchesStatus = statusFilter ? task.status === statusFilter : true;
    const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!sortBy) return 0;
    
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg text-slate-900 leading-tight">
                Predictive Task Scheduling
              </h1>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                v1.2 Rule-Based Allocator
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden md:inline">
              Internship Assignment Sandbox
            </span>
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Intro & Educational Explanation (Feature Overview Section) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              Algorithm Process Flow
            </div>
            <h2 className="text-2xl font-display font-semibold text-slate-900 tracking-tight">
              Task Assignment Prediction Mechanics
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              This sandbox uses a <strong>rule-based multi-criteria algorithm</strong> to automatically recommend employees for incoming tasks. By analyzing historical timesheets stored inside a local JSON file database, it extracts trends in speed, capacity, and reliability to prevent bottlenecks and ensure deadlines are met.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">1. Workload Check</h4>
                <p className="text-xs text-slate-500">Calculates cumulative estimated hours of active tasks to avoid overloading staff.</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">2. Completion Rates</h4>
                <p className="text-xs text-slate-500">Extracts percentage of historically completed tasks over total assigned work.</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">3. Speed Ratio</h4>
                <p className="text-xs text-slate-500">Compares actual vs estimated hours for the task type to measure speed trend.</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 shrink-0 bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex flex-col justify-between self-stretch">
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Score Distribution
              </h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Suitability = 40% Workload Rank + 30% Historical Completion Rate + 30% Specific Task Speed Efficiency.
              </p>
            </div>
            <div className="border-t border-blue-100 mt-4 pt-3 flex items-center justify-between text-xs font-mono text-blue-800">
              <span>Database Source</span>
              <span className="font-semibold bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">data/tasks.json</span>
            </div>
          </div>
        </section>

        {/* Dashboard Analytics Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Workload</span>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold font-display text-slate-900">{metrics.totalTasks}</div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <span className="font-medium text-slate-700">{metrics.completedTasks}</span> completed &bull; 
                <span className="font-medium text-slate-700">{metrics.pendingTasks}</span> active
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Avg Completion</span>
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold font-display text-slate-900">{metrics.avgCompletionTime} hrs</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Across all historical timesheet logs
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Top Employee</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <div className="text-lg font-semibold font-display text-slate-900 truncate">
                {metrics.bestEmployee}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Best efficiency &amp; rate combo
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Avg Perf Score</span>
              <CheckCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold font-display text-slate-900">
                {metrics.avgEmployeePerformance}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Most common type: <span className="font-medium text-slate-700">{metrics.mostCommonTaskType}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Dual Section: Predictor Widget (Left) & Task Manager (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Live Recommender Panel */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                <h3 className="font-display font-semibold text-base text-slate-900">
                  Predictive Scheduling Engine
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Interactive Live
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Type</label>
                <select 
                  value={predType}
                  onChange={(e) => setPredType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                >
                  {TASK_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Duration (hrs)</label>
                <input 
                  type="number" 
                  value={predDuration}
                  onChange={(e) => setPredDuration(Math.max(1, Number(e.target.value)))}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                />
              </div>
            </div>

            {/* Recommendation Result Card */}
            {isPredicting ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono">Running predictive rules...</span>
              </div>
            ) : prediction ? (
              <div className="space-y-5">
                {/* Winner Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Recommended Assignee</span>
                      <h4 className="text-lg font-display font-semibold text-slate-900 mt-0.5">{prediction.predictedEmployee}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Confidence Match</span>
                      <span className="text-xl font-bold font-display text-blue-600 mt-0.5 block">{prediction.confidencePercentage}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                    {prediction.reason}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex flex-col justify-between">
                      <span className="text-slate-400 text-[10px]">Expected Duration</span>
                      <span className="font-semibold text-slate-900 mt-0.5 font-mono">{prediction.expectedDuration} hrs</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-2.5 rounded-lg flex flex-col justify-between">
                      <span className="text-slate-400 text-[10px]">Historical Average</span>
                      <span className="font-semibold text-slate-900 mt-0.5 font-mono">{prediction.averageTime} hrs</span>
                    </div>
                  </div>
                </div>

                {/* Score breakdown of all candidate employees */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Scorecard Breakdown</h4>
                  
                  <div className="space-y-2">
                    {prediction.allRecommendations.map((rec) => {
                      const isWinner = rec.employee === prediction.predictedEmployee;
                      return (
                        <div 
                          key={rec.employee} 
                          className={`p-2.5 border rounded-lg flex items-center justify-between text-xs transition-colors ${
                            isWinner 
                              ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-100/50' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-900 flex items-center gap-1.5">
                              {rec.employee}
                              {isWinner && (
                                <span className="bg-blue-600 text-[8px] text-white font-bold uppercase tracking-wider px-1 py-0.2 rounded-sm">
                                  Optimal
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>Workload: <strong>{rec.workload}h</strong></span>
                              <span>&bull;</span>
                              <span>Comp Rate: <strong>{rec.completionRate}%</strong></span>
                              <span>&bull;</span>
                              <span>Hist Avg: <strong>{rec.avgTimeForType}h</strong></span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              Score: {rec.compositeScore}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                No active predictions. Try adjusting inputs.
              </div>
            )}
          </section>

          {/* RIGHT: Tasks Control Panel & Table */}
          <section className="lg:col-span-7 space-y-4">
            
            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search field */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by task name or employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:border-blue-500 focus:outline-hidden bg-slate-50"
                  />
                </div>
                {/* Create button */}
                <button 
                  onClick={openAddModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              </div>

              {/* Filters dropdowns */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="text-xs border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">All Task Types</option>
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select 
                    value={priorityFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)} // Wait, let's fix: priorityFilter should update setPriorityFilter!
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="text-xs border border-slate-200 bg-slate-50 text-slate-600 rounded px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">All Priorities</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Reset button */}
                {(typeFilter || statusFilter || priorityFilter || searchQuery) && (
                  <button 
                    onClick={() => {
                      setTypeFilter("");
                      setStatusFilter("");
                      setPriorityFilter("");
                      setSearchQuery("");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Task list table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-1">Task Details <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("type")}>
                        <div className="flex items-center gap-1">Type <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("employee")}>
                        <div className="flex items-center gap-1">Assignee <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("priority")}>
                        <div className="flex items-center gap-1">Priority <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("estimatedDuration")}>
                        <div className="flex items-center gap-1">Duration <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                        <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-sm">
                    {sortedTasks.length > 0 ? (
                      sortedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 leading-tight">{task.name}</div>
                            {task.completionDate && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                Completed on {task.completionDate}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              {task.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {task.employee}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-xs font-semibold ${
                              task.priority === "High" ? "text-red-600" :
                              task.priority === "Medium" ? "text-amber-600" : "text-slate-500"
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div>Est: {task.estimatedDuration}h</div>
                            {task.actualDuration && (
                              <div className="text-emerald-600">Act: {task.actualDuration}h</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              task.status === "Completed" ? "bg-emerald-50 text-emerald-700" :
                              task.status === "In Progress" ? "bg-blue-50 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => openEditModal(task)}
                                className="text-slate-500 hover:text-blue-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                title="Edit Task"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-slate-500 hover:text-red-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <AlertTriangle className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm">No matching tasks found in database.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 font-mono flex items-center justify-between">
                <span>Showing {sortedTasks.length} of {tasks.length} tasks</span>
                <span>Active Filters: {[typeFilter, statusFilter, priorityFilter].filter(Boolean).length || "None"}</span>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Task Creation / Editing Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            {/* Modal Content */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative z-10"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900">
                  {editingTask ? "Modify Task Records" : "Schedule New Task"}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2 border border-red-100">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Design Dashboard Prototype"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Type</label>
                    <select 
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full text-sm border border-slate-200 bg-slate-50 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden font-medium"
                    >
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Priority</label>
                    <select 
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full text-sm border border-slate-200 bg-slate-50 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden font-medium"
                    >
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Duration (hrs)</label>
                    <input 
                      type="number" 
                      value={formEstDuration}
                      onChange={(e) => setFormEstDuration(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workflow Status</label>
                    <select 
                      value={formStatus}
                      onChange={(e) => {
                        const s = e.target.value as Task["status"];
                        setFormStatus(s);
                        if (s !== "Completed") {
                          setFormActDuration("");
                          setFormCompletionDate("");
                        }
                      }}
                      className="w-full text-sm border border-slate-200 bg-slate-50 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden font-medium"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Assigned Employee & Autoassign Button */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Employee</label>
                    <button 
                      type="button"
                      onClick={handleAutoAssign}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100/85 px-2 py-1 rounded"
                    >
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      Auto-Predict Best Match
                    </button>
                  </div>
                  <select 
                    value={formEmployee}
                    onChange={(e) => setFormEmployee(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-slate-50 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden font-medium"
                  >
                    {EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                  </select>
                </div>

                {/* Actual Fields shown conditionally if completed */}
                {formStatus === "Completed" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Duration (hrs)</label>
                      <input 
                        type="number" 
                        value={formActDuration}
                        onChange={(e) => setFormActDuration(e.target.value)}
                        placeholder="e.g. 7"
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Date</label>
                      <input 
                        type="date" 
                        value={formCompletionDate}
                        onChange={(e) => setFormCompletionDate(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:outline-hidden bg-slate-50 font-medium"
                        required
                      />
                    </div>
                  </motion.div>
                )}

                <div className="border-t border-slate-150 pt-4 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-xs"
                  >
                    {editingTask ? "Save Record" : "Add Task"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <AnimatePresence>
        {toast.message && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-3.5 rounded-lg border shadow-lg text-sm max-w-sm ${
              toast.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <CheckCircle className={`h-4.5 w-4.5 shrink-0 ${toast.type === "success" ? "text-emerald-600" : "text-red-600"}`} />
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-xs text-slate-400">
        <p>&copy; 2026 Predictive Task Scheduling Simulator. Built with Express.js, React, &amp; Tailwind CSS.</p>
        <p className="mt-1 font-mono text-[10px]">Data is safely persisted inside the local server container at data/tasks.json.</p>
      </footer>
    </div>
  );
}
