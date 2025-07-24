"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Toggle from "@/components/toggle"

interface BusinessData {
  name: string | null;
  phone: string | null;
  principal_contact: string | null;
  url: string | null;
  address: string | null;
  accreditation_status: boolean | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<BusinessData[] | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"LLM" | "Explicit">("LLM");

  // Listens to database in realtime and fetches business data.
  useEffect(() => {
    const fetchInitial = async () => {
      const { data: initial, error } = await supabase.from('businesses').select('*');
      if (initial) setData(initial);
      if (error) setError(error.message);
    };
  
    const channel = supabase
      .channel('realtime:businesses')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'businesses' },
        (payload: { new: BusinessData; }) => {
          setData(prev => {
            if (!prev) return [payload.new as BusinessData];
            const exists = prev.find(b => b.url === payload.new.url);
            return exists ? prev : [...prev, payload.new as BusinessData];
          });
        }
      )
      .subscribe();
      
    fetchInitial();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data]);

  // Calls API to extract business data from search URL
  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setCsv(null);

    // Basic URL validation
    if (!url.startsWith("https://www.bbb.org/search")) {
      setError("Invalid URL. Must start with https://www.bbb.org/search");
      setLoading(false);
      return;
    }

    try {
      let LLM = false
      if (mode === 'LLM') {LLM = true}
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, LLM }),
      });

      if (!res.ok) throw new Error("Scraping failed");

    } catch (err) {
      setError((err as Error).message);
    }

    setLoading(false);
  };

  // Realtime updates of CSV formatted data
  useEffect(() => {
    if (!data || data.length === 0) {
      setCsv(null);
      return;
    }
  
    const headers = Object.keys(data[0] ?? {}).join(",");
    const rows = data.map(item =>
      Object.values(item).map(v => `"${v ?? ""}"`).join(",")
    );
    const csvString = [headers, ...rows].join("\n");
  
    setCsv(csvString);
  }, [data]);

  // Delete data from database
  const handleDelete = async () => {
    try {
      const res = await fetch("/api/delete", { method: "POST" });
      if (!res.ok) throw new Error("Failed to delete data");
      setData(null);
      setCsv(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
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
        <Toggle setMode={setMode} disabled={loading} />
      </div>

      <button
        onClick={handleExtract}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={!url || loading}
      >
        {loading ? "Extracting..." : "Extract Info"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {data && data.length > 0 && (
        <div>
          <div className="mb-2 flex justify-end">
            <button
              onClick={handleDelete}
              className="px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Data
            </button>
          </div>
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