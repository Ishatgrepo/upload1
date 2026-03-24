"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Zap,
  Clock,
  Layers
} from "lucide-react";
import { UploadFile } from "../types";
import { formatSize, formatSpeed, formatETA, cn } from "../lib/utils";

interface UploadMetricsProps {
  files: UploadFile[];
}

export function UploadMetrics({ files }: UploadMetricsProps) {
  if (files.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[400px] z-50">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-zinc-800 uppercase tracking-tight text-sm">
              Upload Status
            </h3>
          </div>
          <span className="text-xs font-bold text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded-full">
            {files.length}
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200">
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-b border-zinc-50 last:border-0"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-zinc-100 rounded-lg shrink-0">
                      <FileText className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate pr-4">
                        {file.name}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {formatSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {file.status === "completed" && <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-50" />}
                    {file.status === "error" && <XCircle className="w-5 h-5 text-red-500 fill-red-50" />}
                    {file.status === "uploading" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  </div>
                </div>

                {file.status === "uploading" && (
                  <div className="space-y-3">
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-zinc-600">
                          {formatSpeed(file.speed)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-zinc-600">
                          ETA: {formatETA(file.eta)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {file.status === "completed" && file.downloadUrl && (
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-2 px-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-xs font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Link Available
                  </a>
                )}

                {file.status === "error" && (
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                    {file.error || "Upload Interrupted"}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
