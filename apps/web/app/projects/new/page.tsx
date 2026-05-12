"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi, githubApi } from "../../../lib/api";
import { parseGithubUrl, buildCloneCommands, type CloneCommands } from "../../../lib/github-url";
import { Check, Copy, GitBranch, Github, SkipForward, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassInput } from "../../../components/ui/GlassInput";
import { GlassButton } from "../../../components/ui/GlassButton";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="shrink-0 text-white/35 hover:text-white/70 transition-colors" title="Copy">
      {copied ? <Check className="h-4 w-4 text-[#36d399]" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CloneRow({ label, command, accent }: { label: string; command: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[.06] last:border-0">
      <span className={`text-xs font-medium w-20 shrink-0 ${accent ?? "text-white/40"}`}>{label}</span>
      <code className="flex-1 text-xs font-mono bg-white/[.05] rounded-xs px-2 py-1.5 text-white/70 overflow-x-auto whitespace-nowrap">
        {command}
      </code>
      <CopyBtn text={command} />
    </div>
  );
}

function SuccessScreen({
  projectCode, projectName, projectId, repoOwner, repoName, cloneCommands, onCreateAnother,
}: {
  projectCode: string; projectName: string; projectId: number;
  repoOwner?: string; repoName?: string; cloneCommands?: CloneCommands;
  onCreateAnother: () => void;
}) {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GlassCard variant="default" className="border border-[#36d399]/30 bg-[#36d399]/[.05]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#36d399]/20 rounded-full flex items-center justify-center shrink-0 border border-[#36d399]/30">
            <Check className="h-4 w-4 text-[#36d399]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#36d399] text-base">Project Created Successfully</h2>
            <p className="text-white/70 text-sm mt-0.5">
              <span className="font-mono font-semibold text-white/85">{projectCode}</span> — {projectName}
            </p>
            {repoOwner && repoName && (
              <p className="text-white/45 text-xs mt-1">
                GitHub: <span className="font-mono">{repoOwner}/{repoName}</span>
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {cloneCommands && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-white/50" />
            <h3 className="font-semibold text-white/80">Clone Commands</h3>
          </div>
          <CloneRow label="HTTPS" command={cloneCommands.https} accent="text-[#4f9cf9]" />
          <CloneRow label="SSH" command={cloneCommands.ssh} accent="text-[#fbbd23]" />
          <CloneRow label="GitHub CLI" command={cloneCommands.cli} accent="text-[#a78bfa]" />
          <p className="text-xs text-white/30 mt-3">
            GitHub CLI: ติดตั้งด้วย <code className="bg-white/[.06] px-1 py-0.5 rounded-xs">brew install gh</code> แล้ว <code className="bg-white/[.06] px-1 py-0.5 rounded-xs">gh auth login</code>
          </p>
        </GlassCard>
      )}

      <div className="flex gap-3">
        <GlassButton variant="primary" onClick={() => router.push(`/projects/${projectId}`)}>
          Go to Project →
        </GlassButton>
        <GlassButton variant="ghost" onClick={onCreateAnother}>Create Another</GlassButton>
      </div>
    </div>
  );
}

type GithubOption = "existing" | "create" | "skip";

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [goLiveDate, setGoLiveDate] = useState("");
  const [estimatedMd, setEstimatedMd] = useState("");
  const [githubOption, setGithubOption] = useState<GithubOption>("skip");
  const [existingUrl, setExistingUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoOwner, setNewRepoOwner] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [repoDescription, setRepoDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    projectCode: string; projectName: string; projectId: number;
    repoOwner?: string; repoName?: string; cloneCommands?: CloneCommands;
  } | null>(null);

  const parsedRepo = githubOption === "existing" ? parseGithubUrl(existingUrl) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) { setError("Project name is required"); return; }
    if (githubOption === "existing" && existingUrl && !parsedRepo) {
      setError("Invalid GitHub URL — use SSH or HTTPS"); return;
    }
    if (githubOption === "create" && !newRepoName.trim()) {
      setError("Repo name is required"); return;
    }

    setLoading(true);
    setError(null);
    try {
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

      if (githubOption === "existing" && parsedRepo) {
        await githubApi.updateSettings(project.id, { repoOwner: parsedRepo.owner, repoName: parsedRepo.repo });
        repoOwner = parsedRepo.owner; repoName = parsedRepo.repo;
        cloneCommands = buildCloneCommands(parsedRepo.owner, parsedRepo.repo);
      } else if (githubOption === "create") {
        const createRes = await githubApi.createRepo(project.id, {
          repoName: newRepoName.trim(),
          repoOwner: newRepoOwner.trim() || undefined,
          isPrivate, description: repoDescription.trim() || undefined,
        });
        if (!createRes.success) throw new Error(createRes.error ?? "Failed to create GitHub repo");
        repoOwner = createRes.data.repoOwner; repoName = createRes.data.repoName;
        cloneCommands = buildCloneCommands(createRes.data.repoOwner, createRes.data.repoName);
      }

      setSuccess({ projectCode: project.projectCode, projectName: project.projectName, projectId: project.id, repoOwner, repoName, cloneCommands });
    } catch (e: any) {
      setError(e.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccess(null); setProjectName(""); setCustomerName(""); setStartDate("");
    setGoLiveDate(""); setEstimatedMd(""); setGithubOption("skip"); setExistingUrl("");
    setNewRepoName(""); setNewRepoOwner(""); setIsPrivate(false); setRepoDescription(""); setError(null);
  };

  const handleProjectNameChange = (v: string) => {
    setProjectName(v);
    if (!newRepoName) setNewRepoName(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title="New Project" breadcrumb={["Projects", "New"]} />
        <SuccessScreen {...success} onCreateAnother={resetForm} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New Project"
        subtitle="สร้าง project พร้อม GitHub repository"
        breadcrumb={["Projects", "New"]}
        actions={<Link href="/projects"><GlassButton variant="ghost" size="sm">Cancel</GlassButton></Link>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Info */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-white/70 mb-4">Project Info</h2>
          <div className="space-y-4">
            <GlassInput
              label="Project Name *"
              value={projectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              placeholder="e.g. Finance Dashboard"
            />
            <div className="grid grid-cols-2 gap-4">
              <GlassInput label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. ACME Corp" />
              <GlassInput label="Estimated MD" type="number" value={estimatedMd} onChange={(e) => setEstimatedMd(e.target.value)} placeholder="30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <GlassInput label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <GlassInput label="Go Live Date" type="date" value={goLiveDate} onChange={(e) => setGoLiveDate(e.target.value)} />
            </div>
          </div>
        </GlassCard>

        {/* GitHub */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Github className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">GitHub Repository</h2>
          </div>
          <div className="space-y-3">
            {/* Existing */}
            <label className={`flex items-start gap-3 rounded-xs border p-4 cursor-pointer transition-colors ${githubOption === "existing" ? "border-[#4f9cf9]/50 bg-[#4f9cf9]/[.06]" : "border-white/[.08] hover:bg-white/[.04]"}`}>
              <input type="radio" name="ghOption" value="existing" checked={githubOption === "existing"} onChange={() => setGithubOption("existing")} className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-white/80">มี repo อยู่แล้ว</p>
                  <p className="text-xs text-white/40">วาง SSH หรือ HTTPS URL ของ repository</p>
                </div>
                {githubOption === "existing" && (
                  <div className="space-y-2">
                    <GlassInput
                      value={existingUrl}
                      onChange={(e) => setExistingUrl(e.target.value)}
                      placeholder="git@github.com:owner/repo.git  หรือ  https://github.com/owner/repo"
                      autoFocus
                    />
                    {existingUrl && parsedRepo && (
                      <div className="flex items-center gap-2 text-xs text-[#36d399]">
                        <Check className="h-3.5 w-3.5" />
                        <span>Parsed: <span className="font-mono">{parsedRepo.owner}/{parsedRepo.repo}</span></span>
                      </div>
                    )}
                    {existingUrl && !parsedRepo && (
                      <p className="text-xs text-[#f87272]">รูปแบบ URL ไม่ถูกต้อง — ใช้ SSH หรือ HTTPS</p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Create */}
            <label className={`flex items-start gap-3 rounded-xs border p-4 cursor-pointer transition-colors ${githubOption === "create" ? "border-[#4f9cf9]/50 bg-[#4f9cf9]/[.06]" : "border-white/[.08] hover:bg-white/[.04]"}`}>
              <input type="radio" name="ghOption" value="create" checked={githubOption === "create"} onChange={() => setGithubOption("create")} className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-white/80">สร้าง repo ใหม่บน GitHub</p>
                  <p className="text-xs text-white/40">ต้องมี system token หรือ project token</p>
                </div>
                {githubOption === "create" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <GlassInput label="Repo Name *" value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)} placeholder="my-project" autoFocus />
                      <GlassInput label="Owner / Org" value={newRepoOwner} onChange={(e) => setNewRepoOwner(e.target.value)} placeholder="e.g. my-org" />
                    </div>
                    <GlassInput label="Description" value={repoDescription} onChange={(e) => setRepoDescription(e.target.value)} placeholder="Brief description" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
                      <span className="text-sm text-white/70">Private repository</span>
                    </label>
                    {newRepoName && (
                      <p className="text-xs text-white/35">
                        จะสร้าง: <span className="font-mono text-white/60">{newRepoOwner ? `${newRepoOwner}/${newRepoName}` : newRepoName}</span>
                        {isPrivate ? " 🔒" : " 🌐"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Skip */}
            <label className={`flex items-center gap-3 rounded-xs border p-4 cursor-pointer transition-colors ${githubOption === "skip" ? "border-white/20 bg-white/[.04]" : "border-white/[.08] hover:bg-white/[.04]"}`}>
              <input type="radio" name="ghOption" value="skip" checked={githubOption === "skip"} onChange={() => setGithubOption("skip")} />
              <SkipForward className="h-4 w-4 text-white/35" />
              <div>
                <p className="text-sm font-medium text-white/70">ข้ามก่อน</p>
                <p className="text-xs text-white/35">เพิ่ม GitHub repo ทีหลังในหน้า Project → tab GitHub</p>
              </div>
            </label>
          </div>
        </GlassCard>

        {error && (
          <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-3">
            <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
            <p className="text-sm text-[#f87272]">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <GlassButton type="submit" variant="primary" size="lg" loading={loading} disabled={!projectName.trim()}>
            Create Project
          </GlassButton>
          <Link href="/projects">
            <GlassButton variant="ghost" size="lg">Cancel</GlassButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
