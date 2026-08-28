import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage, totalPages, onPageChange,
}: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button className="btn-secondary !px-3" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-ink-700 px-2">Page {currentPage} of {totalPages}</span>
      <button className="btn-secondary !px-3" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
