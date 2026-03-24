import { uploadFilesWithProgress } from "@huggingface/hub";
import { Config } from "../types";

export interface ProgressUpdate {
  uploadedBytes: number;
  progress: number;
  speed: number;
  eta: number;
  downloadUrl?: string;
}

export async function performUpload(
  config: Config,
  file: File,
  onProgress: (update: ProgressUpdate) => void
) {
  const startTime = Date.now();
  let lastUpdateTime = startTime;
  let lastUploadedBytes = 0;

  try {
    const iterator = uploadFilesWithProgress({
      repo: config.repo,
      credentials: { accessToken: config.token },
      files: [
        {
          path: file.name,
          content: file,
        },
      ],
    });

    for await (const event of iterator) {
      if (event.event === "fileProgress") {
        const now = Date.now();
        const durationSinceLastUpdate = (now - lastUpdateTime) / 1000; // seconds

        // uploadFilesWithProgress provides progress from 0 to 1
        const progressValue = event.progress;
        const uploadedBytes = Math.floor(progressValue * file.size);
        const totalBytes = file.size;

        if (durationSinceLastUpdate >= 0.5 || progressValue === 1) {
          const deltaBytes = uploadedBytes - lastUploadedBytes;
          const speed = durationSinceLastUpdate > 0 ? deltaBytes / durationSinceLastUpdate : 0;
          const progress = progressValue * 100;
          const remainingBytes = totalBytes - uploadedBytes;
          const eta = speed > 0 ? remainingBytes / speed : 0;

          onProgress({
            uploadedBytes,
            progress,
            speed,
            eta,
          });

          lastUpdateTime = now;
          lastUploadedBytes = uploadedBytes;
        }
      }
    }

    // Final URL generation (Hugging Face resolve URL)
    const downloadUrl = `https://huggingface.co/datasets/${config.repo}/resolve/main/${encodeURIComponent(file.name)}`;
    onProgress({
      uploadedBytes: file.size,
      progress: 100,
      speed: 0,
      eta: 0,
      downloadUrl
    });

  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}
