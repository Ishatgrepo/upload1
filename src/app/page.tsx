"use client";

import { useState, useEffect } from "react";
import { UploadFile, Config } from "@/types";
import { Dropzone } from "@/components/Dropzone";
import { UploadMetrics } from "@/components/UploadMetrics";
import { performUpload } from "@/lib/hf-upload";
import { Shield, Sparkles, Zap } from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // These should ideally be set in environment variables on Vercel
  // For the purpose of this implementation, we can use placeholders
  // that the user would set in their deployment settings.
  const [config, setConfig] = useState<Config>({
    token: process.env.NEXT_PUBLIC_HF_TOKEN || "",
    repo: process.env.NEXT_PUBLIC_HF_REPO || ""
  });

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles: UploadFile[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "idle",
      speed: 0,
      eta: 0,
      uploadedBytes: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  useEffect(() => {
    const startUploads = async () => {
      const pendingFiles = files.filter(f => f.status === "idle");
      if (pendingFiles.length === 0 || isUploading || !config.token || !config.repo) return;

      setIsUploading(true);

      for (const fileObj of pendingFiles) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "uploading" } : f));

        try {
          await performUpload(config, fileObj.file, (update) => {
            setFiles(prev => prev.map(f =>
              f.id === fileObj.id
                ? {
                    ...f,
                    progress: update.progress,
                    speed: update.speed,
                    eta: update.eta,
                    uploadedBytes: update.uploadedBytes,
                    status: update.progress === 100 ? "completed" : "uploading",
                    downloadUrl: update.downloadUrl || f.downloadUrl
                  }
                : f
            ));
          });
        } catch (error) {
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "error", error: "Upload failed" } : f));
        }
      }

      setIsUploading(false);
    };

    startUploads();
  }, [files, isUploading, config]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <header className="flex flex-col items-center text-center space-y-6 mb-16">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded-full shadow-sm">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Secure Cloud Storage</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-zinc-900">
              Direct <span className="text-blue-600">Upload</span>.
            </h1>
            <p className="text-xl text-zinc-500 font-medium max-w-xl mx-auto leading-relaxed">
              Fast, anonymous, and high-performance file sharing.
              Upload large files directly to our secure infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-8 pt-4 grayscale opacity-40">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tighter">ULTRA FAST</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tighter">ENCRYPTED</span>
            </div>
          </div>
        </header>

        <section className="bg-white p-2 rounded-[2.5rem] shadow-xl border border-zinc-100">
          <Dropzone onFilesSelected={handleFilesSelected} disabled={isUploading} />
        </section>

        {!config.token && (
          <div className="mt-12 p-6 bg-amber-50 border border-amber-100 rounded-3xl text-center">
            <p className="text-sm font-bold text-amber-800 uppercase tracking-tight">
              ⚠️ Deployment Configuration Required
            </p>
            <p className="text-xs text-amber-700 mt-1 font-medium">
              Please set NEXT_PUBLIC_HF_TOKEN and NEXT_PUBLIC_HF_REPO in your environment variables.
            </p>
          </div>
        )}

        <footer className="mt-32 pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-60">
          <p className="text-sm font-bold tracking-tight text-zinc-400">
            &copy; {new Date().getFullYear()} Anonymous Uploader
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold uppercase tracking-widest">Privacy First</span>
            <span className="text-xs font-bold uppercase tracking-widest">No Tracking</span>
            <span className="text-xs font-bold uppercase tracking-widest">High Speed</span>
          </div>
        </footer>
      </div>

      <UploadMetrics files={files} />
    </main>
  );
}
