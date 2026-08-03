"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Users, X } from "lucide-react";

interface VoterRow {
  identifier: string;
  fullName: string;
  email: string;
}

export function VoterImport({ electionId }: { electionId: string }) {
  const qc = useQueryClient();
  const [csvText, setCsvText] = useState("identifier,fullName,email\nVOT/2025001,Jane Doe,jane@org.edu");
  const [parsed, setParsed] = useState<VoterRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsv = (text: string): VoterRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    // skip header
    return lines.slice(1).map((line) => {
      const parts = line.split(",").map((s) => s?.trim() ?? "");
      return {
        identifier: parts[0] ?? "",
        fullName: parts[1] ?? "",
        email: parts[2] ?? "",
      };
    }).filter((v) => v.identifier && v.fullName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const rows = parseCsv(text);
      setParsed(rows);
      toast.success(`Parsed ${rows.length} voters from ${file.name}`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  };

  const parseMut = useMutation({
    mutationFn: async () => {
      const rows = parseCsv(csvText);
      setParsed(rows);
      return rows;
    },
  });

  const importMut = useMutation({
    mutationFn: async () => {
      const voters = parsed ?? parseCsv(csvText);
      const res = await fetch(`/api/dashboard/elections/${electionId}/voters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voters }),
      });
      return res.json();
    },
    onSuccess: (d) => {
      if (d.ok) {
        toast.success(`Imported ${d.data.imported} voters`);
        qc.invalidateQueries({ queryKey: ["election-manage", electionId] });
        qc.invalidateQueries({ queryKey: ["voters", electionId] });
        setParsed(null);
        setFileName(null);
      } else toast.error(d.error?.message ?? "Failed");
    },
  });

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="vw-display text-sm mb-2 flex items-center gap-2">
          <Users className="size-4" /> Import voters
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Upload a CSV file or paste data. Header: <code className="vw-mono">identifier,fullName,email</code>
        </p>

        {/* file upload dropzone */}
        <div
          className="mb-3 rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary"); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary");
            const file = e.dataTransfer.files[0];
            if (file) {
              setFileName(file.name);
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result as string;
                setCsvText(text);
                const rows = parseCsv(text);
                setParsed(rows);
                toast.success(`Parsed ${rows.length} voters`);
              };
              reader.readAsText(file);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          {fileName ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="size-5 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); setFileName(null); setCsvText(""); setParsed(null); }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="size-8 text-muted-foreground" />
              <div className="text-sm font-medium">Click to upload or drag &amp; drop</div>
              <div className="text-xs text-muted-foreground">CSV file with identifier, fullName, email columns</div>
            </div>
          )}
        </div>

        {/* manual textarea */}
        <div className="mb-3">
          <Textarea
            rows={5}
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setParsed(null); }}
            className="vw-mono text-xs"
            placeholder="identifier,fullName,email&#10;VOT/2025001,Jane Doe,jane@org.edu"
          />
        </div>

        {/* parsed preview */}
        {parsed && parsed.length > 0 && (
          <div className="mb-3 rounded-lg bg-info/5 border border-info/20 p-3">
            <div className="text-xs font-medium text-info mb-1">
              {parsed.length} voters ready to import
            </div>
            <div className="text-xs text-muted-foreground">
              Preview: {parsed.slice(0, 3).map((v) => `${v.fullName} (${v.identifier})`).join(", ")}
              {parsed.length > 3 && ` +${parsed.length - 3} more`}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => parseMut.mutate()}>
            <FileText className="size-3.5" /> Parse preview
          </Button>
          <Button size="sm" onClick={() => importMut.mutate()} disabled={importMut.isPending}>
            <Users className="size-3.5" /> {importMut.isPending ? "Importing…" : `Import ${parsed?.length ?? "voters"}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
