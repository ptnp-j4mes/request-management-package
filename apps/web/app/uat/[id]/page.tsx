"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uatApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { Bug, MessageCircle, TestTube2 } from "lucide-react";

const resultColors: Record<string, string> = {
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  blocked: "bg-yellow-100 text-yellow-700",
  not_executed: "bg-slate-100 text-slate-600",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border border-red-200",
  high:     "bg-orange-100 text-orange-700 border border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low:      "bg-slate-100 text-slate-600 border border-slate-200",
};

const defectStatusColors: Record<string, string> = {
  open:        "bg-red-50 text-red-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved:    "bg-green-50 text-green-700",
  closed:      "bg-slate-100 text-slate-500",
};

type UATTab = "results" | "defects" | "comments";

export default function UatCycleDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UATTab>("results");

  // Cycle data
  const { data, isLoading } = useQuery({
    queryKey: ["uat-cycle", params.id],
    queryFn: () => uatApi.cycle(Number(params.id)),
  });
  const cycle = data?.data;

  // Comments + defects
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ["uat-comments", params.id],
    queryFn: () => uatApi.listComments(Number(params.id)),
    enabled: activeTab === "defects" || activeTab === "comments",
  });
  const allComments: any[] = commentsData?.data ?? [];
  const defects  = allComments.filter((c) => c.commentType === "defect");
  const comments = allComments.filter((c) => c.commentType !== "defect");

  // Add comment mutation
  const addMutation = useMutation({
    mutationFn: (body: any) => uatApi.addComment(Number(params.id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uat-comments", params.id] });
      setCommentText("");
    },
  });
  const resolveMutation = useMutation({
    mutationFn: ({ commentId, status }: { commentId: number; status: string }) =>
      uatApi.updateComment(Number(params.id), commentId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uat-comments", params.id] }),
  });

  // Comment form state
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<"comment" | "defect">("comment");
  const [severity, setSeverity]       = useState("medium");

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!cycle) return <div className="p-6 text-red-500">UAT Cycle not found</div>;

  const passed = cycle.testResults?.filter((r: any) => r.resultStatus === "pass").length ?? 0;
  const failed = cycle.testResults?.filter((r: any) => r.resultStatus === "fail").length ?? 0;
  const openDefects = defects.filter((d) => d.status === "open" || d.status === "in_progress").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/uat" className="hover:underline">UAT</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{cycle.cycleName}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">{cycle.cycleName}</h1>
        <div className="flex gap-6 text-sm text-slate-600 flex-wrap">
          <span>Period: <b>{cycle.startDate ?? "—"} – {cycle.endDate ?? "—"}</b></span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
            cycle.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
          }`}>{cycle.status}</span>
        </div>
        <div className="flex gap-6 text-sm flex-wrap">
          <span className="text-green-700 font-medium">✓ Pass: {passed}</span>
          <span className="text-red-700 font-medium">✗ Fail: {failed}</span>
          <span className="text-slate-500">Total: {cycle.testResults?.length ?? 0}</span>
          {openDefects > 0 && (
            <span className="text-orange-600 font-medium">🐛 Open Defects: {openDefects}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <TabButton active={activeTab === "results"}  onClick={() => setActiveTab("results")}>
            <TestTube2 className="h-4 w-4 shrink-0" />
            Test Results ({cycle.testResults?.length ?? 0})
          </TabButton>
          <TabButton active={activeTab === "defects"}  onClick={() => setActiveTab("defects")}>
            <Bug className="h-4 w-4 shrink-0" />
            Defects {openDefects > 0 && `(${openDefects} open)`}
          </TabButton>
          <TabButton active={activeTab === "comments"} onClick={() => setActiveTab("comments")}>
            <MessageCircle className="h-4 w-4 shrink-0" />
            Comments ({comments.length})
          </TabButton>
        </nav>
      </div>

      {/* Test Results Tab */}
      {activeTab === "results" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Test Case</th>
                <th className="px-5 py-3 text-left">Result</th>
                <th className="px-5 py-3 text-left">Actual Result</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(cycle.testResults ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs">{r.testCaseId}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${resultColors[r.resultStatus] ?? ""}`}>
                      {r.resultStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{r.actualResult ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {r.testDate ? new Date(r.testDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {r.resultStatus === "fail" && (
                      <button
                        onClick={() => {
                          setActiveTab("defects");
                          setCommentType("defect");
                          setCommentText(`[TC-${r.testCaseId}] `);
                        }}
                        className="text-xs text-orange-600 hover:underline"
                        title="Report as defect"
                      >
                        🐛 Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(cycle.testResults ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No test results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Defects Tab */}
      {activeTab === "defects" && (
        <div className="space-y-4">
          {commentsLoading && <p className="text-slate-400 text-sm">Loading…</p>}

          {/* Defect list */}
          {defects.length > 0 && (
            <div className="space-y-2">
              {defects.map((d) => (
                <div key={d.id} className="bg-white rounded-lg border shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {d.severity && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${severityColors[d.severity] ?? "bg-slate-100 text-slate-600"}`}>
                            {d.severity}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${defectStatusColors[d.status] ?? ""}`}>
                          {d.status?.replace("_", " ")}
                        </span>
                        {d.testCaseId && (
                          <span className="text-xs text-slate-400">TC-{d.testCaseId}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 mt-1">{d.commentText}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {d.createdByName ?? "Unknown"} · {new Date(d.createdAt).toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {d.status === "open" && (
                        <button
                          onClick={() => resolveMutation.mutate({ commentId: d.id, status: "in_progress" })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          In Progress
                        </button>
                      )}
                      {(d.status === "open" || d.status === "in_progress") && (
                        <button
                          onClick={() => resolveMutation.mutate({ commentId: d.id, status: "resolved" })}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Resolve
                        </button>
                      )}
                      {d.status === "resolved" && (
                        <button
                          onClick={() => resolveMutation.mutate({ commentId: d.id, status: "closed" })}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!commentsLoading && defects.length === 0 && (
            <p className="text-slate-400 text-sm">ยังไม่มี defect</p>
          )}

          {/* Add Defect Form */}
          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">รายงาน Defect</h3>
            <div className="flex gap-3">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="อธิบาย defect ที่พบ…"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => {
                if (!commentText.trim()) return;
                addMutation.mutate({ commentText, commentType: "defect", severity });
              }}
              disabled={!commentText.trim() || addMutation.isPending}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {addMutation.isPending ? "กำลังบันทึก…" : "🐛 รายงาน Defect"}
            </button>
            {addMutation.isError && (
              <p className="text-xs text-red-600">{(addMutation.error as any)?.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {commentsLoading && <p className="text-slate-400 text-sm">Loading…</p>}

          {/* Comments list */}
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{c.createdByName ?? "Unknown"}</span>
                  <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString("th-TH")}</span>
                </div>
                {c.commentType !== "comment" && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize mr-2">
                    {c.commentType}
                  </span>
                )}
                <p className="text-sm text-slate-700 mt-1">{c.commentText}</p>
              </div>
            ))}
            {!commentsLoading && comments.length === 0 && (
              <p className="text-slate-400 text-sm">ยังไม่มี comment</p>
            )}
          </div>

          {/* Add Comment Form */}
          <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <div className="flex gap-2">
              {(["comment", "question", "note"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCommentType(t as any)}
                  className={`px-3 py-1 text-xs rounded-full border capitalize ${
                    commentType === t
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="เพิ่ม comment…"
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={() => {
                if (!commentText.trim()) return;
                addMutation.mutate({ commentText, commentType: commentType as any });
              }}
              disabled={!commentText.trim() || addMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {addMutation.isPending ? "กำลังส่ง…" : "ส่ง"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
