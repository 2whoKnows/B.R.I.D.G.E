const MIME_TYPE_LABELS = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/csv": "CSV",
};

export function fileTypeLabel(fileType, fallback = "PDF") {
  if (!fileType) return fallback;
  const normalized = String(fileType).trim().toLowerCase();
  if (MIME_TYPE_LABELS[normalized]) return MIME_TYPE_LABELS[normalized];
  const extension = normalized.includes("/")
    ? normalized.split("/").pop()
    : normalized.replace(/^\./, "");
  return extension ? extension.toUpperCase() : fallback;
}
