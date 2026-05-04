import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function VendorDetailPage() {
  const navigate = useNavigate();
  const [suspended, setSuspended] = useState(false);
  const [priority, setPriority] = useState("high");

  return (
    <div>
      <button onClick={() => navigate("/vendors")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition -ml-2">
        <ArrowLeft size={15} /> Back to Vendors
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black text-gray-900">PrintMaster Org</h1>
        <span className={`text-sm px-4 py-1.5 rounded-full font-bold ${suspended ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
          {suspended ? "Suspended" : "Active"}
        </span>
      </div>

      {/* 50-50 Cards */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Vendor Profile */}
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #eef2f7", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
          <h2 className="font-bold text-gray-900 text-base mb-4">Vendor Profile</h2>
          <div className="space-y-0">
            {[
              ["Org Name", "PrintMaster Org"],
              ["Stores", "3 active"],
              ["Total Orders", "284 (this month)"],
              ["Acceptance Rate", "94%"],
              ["SLA Compliance", "88%"],
              ["QC Failure Rate", "3%"],
              ["Rejection Count", "7 (this month)"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-bold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #eef2f7", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
          <h2 className="font-bold text-gray-900 text-base mb-4">Health Score</h2>
          <div className="text-center mb-6">
            <p className="text-6xl font-black text-green-600">94</p>
            <p className="text-sm text-gray-400 mt-1">/ 100 · Good Standing</p>
          </div>
          <div className="space-y-0">
            {[
              ["Acceptance Rate", "94%", "#16a34a"],
              ["SLA Compliance", "88%", "#16a34a"],
              ["QC Failure", "3%", "#16a34a"],
              ["Availability Abuse", "1 flag", "#f59e0b"],
            ].map(([k, v, c]) => (
              <div key={k} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-bold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Controls — full width */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #eef2f7", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
        <h2 className="font-bold text-gray-900 text-base mb-4">Admin Controls</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setSuspended(s => !s)}
            className={`px-5 py-2.5 font-bold rounded-xl text-sm transition ${suspended ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}`}
          >
            {suspended ? "Resume Vendor" : "Suspend Vendor"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Routing Priority:</span>
            {["low", "normal", "high"].map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold capitalize transition ${priority === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {suspended && (
          <div className="mt-4 flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-sm font-bold text-red-700">Vendor suspended — Immediate routing stop. No new jobs assigned.</p>
          </div>
        )}
      </div>
    </div>
  );
}
