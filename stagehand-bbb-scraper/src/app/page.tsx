"use client";

import { useState } from "react";
import Toggle from "@/components/toggle"

interface BusinessData {
  name: string | null;
  phone: string | null;
  principal_contact: string | null;
  url: string | null;
  address: string | null;
  accreditation_status: boolean | null;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<BusinessData[] | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"LLM" | "Explicit">("Explicit");

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setCsv(null);

    try {
      let LLM = false
      if (mode === 'LLM') {LLM = true}
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, LLM }),
      });

      if (!res.ok) throw new Error("Scraping failed");
      const json = await res.json();

      if (!Array.isArray(json)) throw new Error("Invalid response format");

      setData(json);
      setCsv(convertToCSV(json));
    } catch (err) {
      setError((err as Error).message);
    }

    setLoading(false);
  };

  const convertToCSV = (items: BusinessData[]) => {
    const headers = Object.keys(items[0] ?? {}).join(",");
    const rows = items.map(item =>
      Object.values(item).map(v => `"${v ?? ""}"`).join(",")
    );
    return [headers, ...rows].join("\n");
  };

  return (
    <main className="p-10 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">BBB Business Extractor</h1>

      <input
        type="text"
        placeholder="Enter BBB profile URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
      />

      <div>
        <Toggle setMode={setMode} />
      </div>

      <button
        onClick={handleExtract}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={!url || loading}
      >
        {loading ? "Extracting..." : "Extract Info"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {data && (
        <div className="overflow-x-auto border border-gray-300 rounded">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-200 text-black">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Principal</th>
                <th className="px-4 py-2 text-left">URL</th>
                <th className="px-4 py-2 text-left">Address</th>
                <th className="px-4 py-2 text-left">Accredited</th>
              </tr>
            </thead>
            <tbody>
              {data.map((biz, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">{biz.name ?? "-"}</td>
                  <td className="px-4 py-2">{biz.phone ?? "-"}</td>
                  <td className="px-4 py-2">{biz.principal_contact ?? "-"}</td>
                  <td className="px-4 py-2">
                    {biz.url ? (
                      <a href={biz.url} className="text-blue-600 underline" target="_blank">
                        {biz.url}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2">{biz.address ?? "-"}</td>
                  <td className="px-4 py-2">
                    {biz.accreditation_status === true ? <span className="text-green-600">✓</span> : biz.accreditation_status === false ? <span className="text-red-500">✕</span> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {csv && (
        <details className="bg-gray-100 text-black p-4 rounded border mt-4">
          <summary className="cursor-pointer font-semibold">CSV Output</summary>
          <pre className="whitespace-pre-wrap break-words mt-2">{csv}</pre>
        </details>
      )}
    </main>
  );
}