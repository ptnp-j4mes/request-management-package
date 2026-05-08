"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export default function AdminPage() {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
  });
  const users = data?.data ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin</h1>

      <div className="grid grid-cols-3 gap-4">
        {["Users & Roles", "Workflow Config", "Access Control"].map((section) => (
          <div key={section} className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-slate-700">{section}</h3>
            <p className="text-xs text-slate-400 mt-1">Coming soon</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-semibold text-slate-800">Users</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Username</th>
              <th className="px-5 py-3 text-left">Full Name</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-5 py-3 font-medium">{u.fullName}</td>
                <td className="px-5 py-3 text-slate-500">{u.email ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{u.roleName ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
