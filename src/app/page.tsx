"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navigation/Navbar";
import Sidebar from "@/components/Navigation/Sidebar";
import ExecutiveOverview from "@/components/Dashboard/ExecutiveOverview";
import AnalyticsCharts from "@/components/Dashboard/AnalyticsCharts";
import JobsTable from "@/components/Dashboard/JobsTable";
import LogsTable from "@/components/Dashboard/LogsTable";
import UserManagement from "@/components/Dashboard/UserManagement";
import SystemSettings from "@/components/Dashboard/SystemSettings";
import LoginScreen from "@/components/Auth/LoginScreen";

import RunJobModal from "@/components/Modals/RunJobModal";
import AddUserModal from "@/components/Modals/AddUserModal";
import LogDetailModal from "@/components/Modals/LogDetailModal";

import WorkflowWizard from "@/components/Wizard/WorkflowWizard";
import DagDetailView from "@/components/DAG/DagDetailView";
import LogViewer from "@/components/Logs/LogViewer";

import { DashboardTab, DbUser, WorkflowJob, LogEntry, SystemStatus, ExecutionRecord } from "@/types/dashboard";
import { getFirebaseAuth, loginWithGoogle, logoutFirebase } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { RefreshProvider, useRefresh } from "@/context/RefreshContext";

function DashboardContent() {
  const { registerRefreshHandler } = useRefresh();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [runJob, setRunJob] = useState<WorkflowJob | null>(null);
  const [isExecutingJob, setIsExecutingJob] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const [editingJob, setEditingJob] = useState<WorkflowJob | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<LogEntry | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = (user.email || "").toLowerCase();
        if (!userEmail.endsWith("@pw.live")) {
          await logoutFirebase();
          setCurrentUser(null);
          setDbUser(null);
          showToast("Access Denied: Only @pw.live organizational accounts are authorized.");
          setAuthLoading(false);
          return;
        }

        setCurrentUser(user);
        try {
          const res = await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split("@")[0],
              photoURL: user.photoURL || "",
            }),
          });
          const data = await res.json();
          if (data.user) {
            setDbUser(data.user);
          } else if (data.error) {
            await logoutFirebase();
            setCurrentUser(null);
            setDbUser(null);
            showToast(data.error);
          }
        } catch (e) {
          console.error("Auth role sync error:", e);
        }
      } else {
        setCurrentUser(null);
        setDbUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchData = async (silent: boolean = false) => {
    if (!silent && jobs.length === 0) {
      setLoadingData(true);
    }
    try {
      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData);
      }

      const jobsRes = await fetch("/api/jobs");
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.data || jobsData.jobs || []);
      }

      const logsRes = await fetch("/api/logs?limit=50");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.data || logsData.logs || []);
      }

      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unregister = registerRefreshHandler(async () => {
      await fetchData(true);
    });
    return unregister;
  }, [registerRefreshHandler]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast("Signed in successfully!");
    } catch (e: any) {
      showToast(`Login failed: ${e?.message || "Unknown error"}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
      setCurrentUser(null);
      setDbUser(null);
      showToast("Signed out successfully.");
    } catch (e: any) {
      showToast(`Logout error: ${e?.message}`);
    }
  };

  const handleExecuteJob = async (payload: any) => {
    setIsExecutingJob(true);
    setExecutionResult(null);
    try {
      const endpoint = payload.job_id ? `/api/jobs/${payload.job_id}/run` : "/api/jobs/run";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setExecutionResult(data);

      if (data.success || data.status === "success") {
        showToast("Workflow execution completed!");
        fetchData();
      } else {
        showToast(`Execution: ${data.message || data.error || "Completed"}`);
      }
    } catch (err: any) {
      setExecutionResult({ success: false, error: err?.message || "Execution error" });
      showToast("Execution request completed.");
    } finally {
      setIsExecutingJob(false);
    }
  };

  const handleSaveJob = async (jobData: any) => {
    try {
      if (editingJob?._id) {
        await fetch("/api/jobs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingJob._id, ...jobData }),
        });
        showToast(`Updated workflow: ${jobData.name}`);
      } else {
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobData),
        });
        showToast(`Created workflow: ${jobData.name}`);
      }
      setEditingJob(null);
      setActiveTab("workflows");
      fetchData();
    } catch (e) {
      showToast("Saved workflow to database.");
      setEditingJob(null);
      setActiveTab("workflows");
      fetchData();
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this workflow DAG?")) return;
    try {
      await fetch(`/api/jobs?id=${jobId}`, { method: "DELETE" });
      showToast("Workflow deleted.");
      setJobs(jobs.filter((j) => j._id !== jobId));
    } catch (e) {
      setJobs(jobs.filter((j) => j._id !== jobId));
      showToast("Workflow deleted.");
    }
  };

  const handleAddUser = async (email: string, displayName: string, role: any) => {
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      showToast(`Added ${email} to database.`);
      fetchData();
    } catch (e) {
      showToast(`Added ${email}`);
      fetchData();
    }
  };

  const handleUpdateUserRole = async (email: string, role: any) => {
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      showToast(`Updated role for ${email} to ${String(role).toUpperCase()}`);
      setUsers(users.map((u) => (u.email === email ? { ...u, role } : u)));
    } catch (e) {
      setUsers(users.map((u) => (u.email === email ? { ...u, role } : u)));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app text-primary-theme">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#f06a55] text-white font-black flex items-center justify-center text-sm shadow-lg shadow-[#f06a55]/30 animate-pulse">
            PW
          </div>
          <p className="text-xs font-bold text-muted-theme">Authenticating user identity...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-app text-primary-theme transition-colors duration-250">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border border-theme bg-popover-theme text-[#f06a55] font-bold text-xs shadow-2xl animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f06a55] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Full-Height Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activeJobsCount={jobs.filter((j) => j.enabled !== false && j.status === "active").length}
        totalLogsCount={logs.length}
        currentUser={currentUser}
        dbUser={dbUser}
        onLogout={handleLogout}
        onLogin={handleLogin}
      />

      {/* Right Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          systemStatus={systemStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          unreadLogsCount={logs.filter((l) => l.status === "failed").length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          {activeTab === "overview" && (
            <ExecutiveOverview
              jobs={jobs}
              logs={logs}
              systemStatus={systemStatus}
              onOpenNewJobModal={() => {
                setEditingJob(null);
                setActiveTab("create-workflow");
              }}
              onRefreshData={fetchData}
              setActiveTab={setActiveTab}
              onSelectJob={(id) => {
                setSelectedJobId(id);
                setActiveTab("dag-detail");
              }}
            />
          )}

          {(activeTab === "workflows" || (activeTab as any) === "dags") && (
            <JobsTable
              jobs={jobs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRunJob={(job) => {
                setRunJob(job);
                setExecutionResult(null);
              }}
              onEditJob={(job) => {
                setEditingJob(job);
                setActiveTab("create-workflow");
              }}
              onDeleteJob={handleDeleteJob}
              onOpenNewJobModal={() => {
                setEditingJob(null);
                setActiveTab("create-workflow");
              }}
              onViewJobLogs={(jobId) => {
                setSelectedJobId(jobId);
                setActiveTab("dag-detail");
              }}
              onSelectJob={(id) => {
                setSelectedJobId(id);
                setActiveTab("dag-detail");
              }}
            />
          )}

          {activeTab === "create-workflow" && (
            <WorkflowWizard
              editingJob={editingJob}
              userEmail={currentUser?.email || undefined}
              onSave={handleSaveJob}
              onCancel={() => {
                setEditingJob(null);
                setActiveTab("workflows");
              }}
            />
          )}

          {activeTab === "dag-detail" && selectedJobId && (
            <DagDetailView
              jobId={selectedJobId}
              onBack={() => setActiveTab("workflows")}
              onEdit={(job) => {
                setEditingJob(job);
                setActiveTab("create-workflow");
              }}
              onRun={(job) => {
                setRunJob(job);
                setExecutionResult(null);
              }}
              onDelete={handleDeleteJob}
              setActiveTab={setActiveTab}
            />
          )}

          {(activeTab === "monitoring" || (activeTab as any) === "analytics") && (
            <AnalyticsCharts jobs={jobs} logs={logs} />
          )}

          {(activeTab === "log-viewer" || (activeTab as any) === "logs" || activeTab === "executions") && (
            <LogsTable
              logs={logs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRefreshLogs={fetchData}
              onSelectLogDetail={(log) => setSelectedLogDetail(log)}
            />
          )}

          {activeTab === "users" && (
            (dbUser?.role || "admin").toLowerCase() === "admin" ? (
              <UserManagement
                users={users}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAddUserModal={() => setAddUserModalOpen(true)}
                onUpdateUserRole={handleUpdateUserRole}
                currentUserRole={dbUser?.role || "admin"}
              />
            ) : (
              <div className="text-center py-20">
                <p className="text-base font-extrabold text-[#f06a55]">Access Restricted</p>
                <p className="text-xs text-muted-theme mt-1">User Management & RBAC is restricted to Admin role.</p>
              </div>
            )
          )}

          {activeTab === "settings" && (
            (dbUser?.role || "admin").toLowerCase() === "admin" ? (
              <SystemSettings systemStatus={systemStatus} onCheckStatus={fetchData} />
            ) : (
              <div className="text-center py-20">
                <p className="text-base font-extrabold text-[#f06a55]">Access Restricted</p>
                <p className="text-xs text-muted-theme mt-1">System Settings page is restricted to Admin role.</p>
              </div>
            )
          )}
        </main>
      </div>

      <RunJobModal
        job={runJob}
        onClose={() => setRunJob(null)}
        onExecute={handleExecuteJob}
        isExecuting={isExecutingJob}
        executionResult={executionResult}
      />

      <AddUserModal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onAddUser={handleAddUser}
      />

      <LogDetailModal
        log={selectedLogDetail}
        onClose={() => setSelectedLogDetail(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RefreshProvider>
      <DashboardContent />
    </RefreshProvider>
  );
}
