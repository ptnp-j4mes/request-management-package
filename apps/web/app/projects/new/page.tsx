"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi, githubApi } from "../../../lib/api";
import { parseGithubUrl, buildCloneCommands, type CloneCommands } from "../../../lib/github-url";
import { Check, Copy, GitBranch, Github, SkipForward } from "lucide-react";

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// ── Clone command row ─────────────────────────────────────────────────────────
function CloneRow({ label, command, accent }: { label: string; command: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <span className={`text-xs font-medium w-20 shrink-0 ${accent ?? "text-slate-500"}`}>{label}</span>
      <code className="flex-1 text-xs font-mono bg-slate-50 rounded px-2 py-1.5 text-slate-700 overflow-x-auto whitespace-nowrap">
        {command}
      </code>
      <CopyBtn text={command} />
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", placeholder = "", required = false, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({
  projectCode,
  projectName,
  projectId,
  repoOwner,
  repoName,
  cloneCommands,
  onCreateAnother,
}: {
  projectCode: string;
  projectName: string;
  projectId: number;
  repoOwner?: string;
  repoName?: string;
  cloneCommands?: CloneCommands;
  onCreateAnother: () => void;
}) {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <Check className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-green-800 text-base">Project Created Successfully</h2>
          <p className="text-green-700 text-sm mt-0.5">
            <span className="font-mono font-semibold">{projectCode}</span> — {projectName}
          </p>
          {repoOwner && repoName && (
            <p className="text-green-600 text-xs mt-1">
              GitHub: <span className="font-mono">{repoOwner}/{repoName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Clone commands */}
      {cloneCommands && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Clone Commands</h3>
          </div>
          <CloneRow label="HTTPS" command={cloneCommands.https} accent="text-blue-600" />
          <CloneRow label="SSH" command={cloneCommands.ssh} accent="text-amber-600" />
          <CloneRow label="GitHub CLI" command={cloneCommands.cli} accent="text-purple-600" />
          <p className="text-xs text-slate-400 mt-3">
            💡 GitHub CLI: ติดตั้งด้วย <code className="bg-slate-100 px-1 py-0.5 rounded">brew install gh</code> แล้ว <code className="bg-slate-100 px-1 py-0.5 rounded">gh auth login</code>
          </p>
        </div>
      )}

      {/* Quick start */}
      {cloneCommands && (
        <div className="bg-slate-50 rounded-lg border p-5">
          <h3 className="font-medium text-slate-700 text-sm mb-3">Quick Start</h3>
          <div className="space-y-1.5 text-xs font-mono text-slate-600">
            <p className="text-slate-400"># Clone and setup</p>
            <p>{cloneCommands.cli}</p>
            <p>cd {repoName}</p>
            <p className="text-slate-400"># Or with git</p>
            <p>{cloneCommands.ssh}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Go to Project →
        </button>
        <button
          onClick={onCreateAnother}
          className="px-5 py-2 border text-slate-600 text-sm font-medium rounded-md hover:bg-slate-50"
        >
          Create Another
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type GithubOption = "existing" | "create" | "skip";

export default function NewProjectPage() {
  const router = useRouter();

  // Project fields
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [goLiveDate, setGoLiveDate] = useState("");
  const [estimatedMd, setEstimatedMd] = useState("");

  // GitHub fields
  const [githubOption, setGithubOption] = useState<GithubOption>("skip");
  const [existingUrl, setExistingUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoOwner, setNewRepoOwner] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [repoDescription, setRepoDescription] = useState("");

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    projectCode: string;
    projectName: string;
    projectId: number;
    repoOwner?: string;
    repoName?: string;
    cloneCommands?: CloneCommands;
  } | null>(null);

  const parsedRepo = githubOption === "existing" ? parseGithubUrl(existingUrl) : null;
  const urlValid = githubOption !== "existing" || parsedRepo !== null || existingUrl === "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) { setError("Project name is required"); return; }
    if (githubOption === "existing" && existingUrl && !parsedRepo) {
      setError("Invalid GitHub URL — use SSH (git@github.com:owner/repo.git) or HTTPS (https://github.com/owner/repo)");
      return;
    }
    if (githubOption === "create" && !newRepoName.trim()) {
      setError("Repo name is required"); return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create project
      const projectBody: any = { projectName: projectName.trim() };
      if (customerName) projectBody.customerName = customerName;
      if (startDate) projectBody.startDate = startDate;
      if (goLiveDate) projectBody.goLiveDate = goLiveDate;
      if (estimatedMd) projectBody.estimatedMd = parseFloat(estimatedMd);

      const projectRes = await projectsApi.create(projectBody);
      if (!projectRes.success) throw new Error(projectRes.error ?? "Failed to create project");
      const project = projectRes.data;

      let repoOwner: string | undefined;
      let repoName: string | undefined;
      let cloneCommands: CloneCommands | undefined;

      // 2. GitHub setup
      if (githubOption === "existing" && parsedRepo) {
        // Link existing repo
        await githubApi.updateSettings(project.id, {
          repoOwner: parsedRepo.owner,
          repoName: parsedRepo.repo,
        });
        repoOwner = parsedRepo.owner;
        repoName = parsedRepo.repo;
        cloneCommands = buildCloneCommands(parsedRepo.owner, parsedRepo.repo);

      } else if (githubOption === "create") {
        // Create new repo
        const createRes = await githubApi.createRepo(project.id, {
          repoName: newRepoName.trim(),
          repoOwner: newRepoOwner.trim() || undefined,
          isPrivate,
          description: repoDescription.trim() || undefined,
        });
        if (!createRes.success) throw new Error(createRes.error ?? "Failed to create GitHub repo");
        repoOwner = createRes.data.repoOwner;
        repoName = createRes.data.repoName;
        cloneCommands = buildCloneCommands(createRes.data.repoOwner, createRes.data.repoName);
      }

      setSuccess({
        projectCode: project.projectCode,
        projectName: project.projectName,
        projectId: project.id,
        repoOwner,
        repoName,
        cloneCommands,
      });
    } catch (e: any) {
      setError(e.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setProjectName("");
    setCustomerName("");
    setStartDate("");
    setGoLiveDate("");
    setEstimatedMd("");
    setGithubOption("skip");
    setExistingUrl("");
    setNewRepoName("");
    setNewRepoOwner("");
    setIsPrivate(false);
    setRepoDescription("");
    setError(null);
  };

  // Auto-fill repo name from project name
  const handleProjectNameChange = (v: string) => {
    setProjectName(v);
    if (!newRepoName) {
      setNewRepoName(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  if (success) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/projects" className="hover:underline">Projects</Link>
          <span>/</span>
          <span className="text-slate-800">New Project</span>
        </div>
        <SuccessScreen {...success} onCreateAnother={resetForm} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/projects" className="hover:underline">Projects</Link>
        <span>/</span>
        <span className="text-slate-800">New Project</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Project</h1>
        <p className="text-sm text-slate-500 mt-1">สร้าง AIT Project พร้อม GitHub repository</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Project Info ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Project Info</h2>
          <Field
            label="Project Name" value={projectName}
            onChange={handleProjectNameChange}
            placeholder="e.g. Finance Dashboard" required
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer Name" value={customerName} onChange={setCustomerName} placeholder="e.g. ACME Corp" />
            <Field label="Estimated MD" value={estimatedMd} onChange={setEstimatedMd} type="number" placeholder="30" hint="Man-days budget" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" value={startDate} onChange={setStartDate} type="date" />
            <Field label="Go Live Date" value={goLiveDate} onChange={setGoLiveDate} type="date" />
          </div>
        </div>

        {/* ── GitHub Repository ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-slate-600" />
            <h2 className="font-semibold text-slate-800">GitHub Repository</h2>
          </div>

          {/* Option selector */}
          <div className="space-y-3">
            {/* Option 1: Existing repo */}
            <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${githubOption === "existing" ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50"}`}>
              <input
                type="radio"
                name="ghOption"
                value="existing"
                checked={githubOption === "existing"}
                onChange={() => setGithubOption("existing")}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">มี repo อยู่แล้ว</p>
                  <p className="text-xs text-slate-500">วาง SSH หรือ HTTPS URL ของ repository</p>
                </div>
                {githubOption === "existing" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={existingUrl}
                      onChange={(e) => setExistingUrl(e.target.value)}
                      placeholder="git@github.com:owner/repo.git  หรือ  https://github.com/owner/repo"
                      className="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    {existingUrl && (
                      parsedRepo ? (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <Check className="h-3.5 w-3.5" />
                          <span>
                            Parsed: <span className="font-mono font-semibold">{parsedRepo.owner}/{parsedRepo.repo}</span>
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-red-500">
                          รูปแบบ URL ไม่ถูกต้อง — ใช้ SSH (<code>git@github.com:owner/repo.git</code>) หรือ HTTPS (<code>https://github.com/owner/repo</code>)
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Option 2: Create new repo */}
            <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${githubOption === "create" ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50"}`}>
              <input
                type="radio"
                name="ghOption"
                value="create"
                checked={githubOption === "create"}
                onChange={() => setGithubOption("create")}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">สร้าง repo ใหม่บน GitHub</p>
                  <p className="text-xs text-slate-500">สร้าง repository ใหม่ผ่าน GitHub API (ต้องมี system token หรือ project token)</p>
                </div>
                {githubOption === "create" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Repo Name <span className="text-red-500">*</span></label>
                        <input
                          value={newRepoName}
                          onChange={(e) => setNewRepoName(e.target.value)}
                          placeholder="my-project"
                          className="w-full border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Owner / Org (ว่าง = personal)</label>
                        <input
                          value={newRepoOwner}
                          onChange={(e) => setNewRepoOwner(e.target.value)}
                          placeholder="e.g. my-org"
                          className="w-full border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Description (optional)</label>
                      <input
                        value={repoDescription}
                        onChange={(e) => setRepoDescription(e.target.value)}
                        placeholder="Brief description of the repository"
                        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700">Private repository</span>
                    </label>
                    {newRepoName && (
                      <p className="text-xs text-slate-400">
                        จะสร้าง: <span className="font-mono text-slate-600">
                          {newRepoOwner ? `${newRepoOwner}/${newRepoName}` : newRepoName}
                        </span>
                        {isPrivate ? " 🔒 Private" : " 🌐 Public"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Option 3: Skip */}
            <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${githubOption === "skip" ? "border-slate-400 bg-slate-50" : "hover:bg-slate-50"}`}>
              <input
                type="radio"
                name="ghOption"
                value="skip"
                checked={githubOption === "skip"}
                onChange={() => setGithubOption("skip")}
              />
              <SkipForward className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">ข้ามก่อน</p>
                <p className="text-xs text-slate-400">เพิ่ม GitHub repo ทีหลังในหน้า Project → tab GitHub</p>
              </div>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !projectName.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating…" : "Create Project"}
          </button>
          <Link
            href="/projects"
            className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 border rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
