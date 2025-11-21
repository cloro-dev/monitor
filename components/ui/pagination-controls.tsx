import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  // Helper to handle click and prevent default anchor behavior
  const handleClick = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const items = [];
    const maxVisiblePages = 5; // Total numbers to show including first/last/current/neighbors

    if (totalPages <= maxVisiblePages + 2) {
      // If total pages are small, show all
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              onClick={(e) => handleClick(e, i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      // Complex logic for ellipsis
      const showStart = currentPage > 3;
      const showEnd = currentPage < totalPages - 2;

      if (!showStart && showEnd) {
        // Start case: 1 2 3 4 ... 18
        for (let i = 1; i <= 4; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => handleClick(e, i)}
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>,
        );
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              isActive={currentPage === totalPages}
              onClick={(e) => handleClick(e, totalPages)}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      } else if (showStart && !showEnd) {
        // End case: 1 ... 15 16 17 18
        items.push(
          <PaginationItem key={1}>
            <PaginationLink
              href="#"
              isActive={currentPage === 1}
              onClick={(e) => handleClick(e, 1)}
            >
              1
            </PaginationLink>
          </PaginationItem>,
        );
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>,
        );
        for (let i = totalPages - 3; i <= totalPages; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => handleClick(e, i)}
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }
      } else {
        // Middle case: 1 ... 8 9 10 ... 18
        items.push(
          <PaginationItem key={1}>
            <PaginationLink
              href="#"
              isActive={currentPage === 1}
              onClick={(e) => handleClick(e, 1)}
            >
              1
            </PaginationLink>
          </PaginationItem>,
        );
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>,
        );

        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          items.push(
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i}
                onClick={(e) => handleClick(e, i)}
              >
                {i}
              </PaginationLink>
            </PaginationItem>,
          );
        }

        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>,
        );
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              isActive={currentPage === totalPages}
              onClick={(e) => handleClick(e, totalPages)}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    }

    return items;
  };

  return (
    <div className="py-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => handleClick(e, currentPage - 1)}
              className={
                currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
              }
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => handleClick(e, currentPage + 1)}
              className={
                currentPage >= totalPages
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
