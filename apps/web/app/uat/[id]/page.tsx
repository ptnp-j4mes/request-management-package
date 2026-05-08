"use client";
import { useQuery } from "@tanstack/react-query";
import { uatApi } from "../../../lib/api";
import Link from "next/link";

const resultColors: Record<string, string> = {
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  blocked: "bg-yellow-100 text-yellow-700",
  not_executed: "bg-slate-100 text-slate-600",
};

export default function UatCycleDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["uat-cycle", params.id],
    queryFn: () => uatApi.cycle(Number(params.id)),
  });
  const cycle = data?.data;

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!cycle) return <div className="p-6 text-red-500">UAT Cycle not found</div>;

  const passed = cycle.testResults?.filter((r: any) => r.resultStatus === "pass").length ?? 0;
  const failed = cycle.testResults?.filter((r: any) => r.resultStatus === "fail").length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/uat" className="hover:underline">UAT</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{cycle.cycleName}</span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">{cycle.cycleName}</h1>
        <div className="flex gap-6 text-sm text-slate-600">
          <span>Period: <b>{cycle.startDate ?? "—"} – {cycle.endDate ?? "—"}</b></span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cycle.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{cycle.status}</span>
        </div>
        <div className="flex gap-6 text-sm">
          <span className="text-green-700 font-medium">✓ Pass: {passed}</span>
          <span className="text-red-700 font-medium">✗ Fail: {failed}</span>
          <span className="text-slate-500">Total: {cycle.testResults?.length ?? 0}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-semibold text-slate-800">Test Results</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Test Case</th>
              <th className="px-5 py-3 text-left">Result</th>
              <th className="px-5 py-3 text-left">Actual Result</th>
              <th className="px-5 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(cycle.testResults ?? []).map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs">{r.testCaseId}</td>
                <td className="px-5 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${resultColors[r.resultStatus] ?? ""}`}>{r.resultStatus}</span>
                </td>
                <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{r.actualResult ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{r.testDate ? new Date(r.testDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {(cycle.testResults ?? []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No test results</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
