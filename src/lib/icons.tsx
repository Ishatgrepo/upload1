import {
  FileIcon,
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  FileArchive,
  FileCode,
  Globe
} from "lucide-react";

export function getFileIcon(mimeType: string) {
  if (!mimeType) return <FileIcon className="w-8 h-8 text-gray-400" />;

  if (mimeType.startsWith("image/")) return <FileImage className="w-8 h-8 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="w-8 h-8 text-pink-500" />;
  if (mimeType.startsWith("text/")) return <FileText className="w-8 h-8 text-orange-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("7z"))
    return <FileArchive className="w-8 h-8 text-yellow-600" />;
  if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html") || mimeType.includes("css"))
    return <FileCode className="w-8 h-8 text-green-500" />;

  return <FileIcon className="w-8 h-8 text-gray-400" />;
}
