export const LEAD_COLUMN_STRIDE_PX = 260;

export function leadsBoardRowMinWidthPx(
  columnCount: number,
  stride = LEAD_COLUMN_STRIDE_PX,
) {
  return Math.max(1, columnCount) * stride;
}

export function forcedLeadsBoardRowWidthPx(input: {
  columnCount: number;
  clientWidth: number;
  scrollWidth: number;
  lastColumnRight: number;
}): number | null {
  const cssMin = leadsBoardRowMinWidthPx(input.columnCount);
  const lastFitsScroller =
    input.scrollWidth > input.clientWidth && input.lastColumnRight <= input.scrollWidth + 1;
  if (lastFitsScroller) return null;
  if (cssMin <= input.clientWidth && input.lastColumnRight <= input.clientWidth) return null;
  return Math.max(cssMin, input.lastColumnRight, input.clientWidth + 1);
}

function boardRow(board: HTMLElement) {
  return board.querySelector<HTMLElement>(".leads-board-row, .lead-board-row");
}

function boardColumns(board: HTMLElement) {
  return [...board.querySelectorAll<HTMLElement>(".leads-column, .lead-column")];
}

export function syncLeadsBoardScroller(board: HTMLElement) {
  const row = boardRow(board);
  if (!row) return;

  const columns = boardColumns(board);
  const count =
    columns.length ||
    Number(board.getAttribute("data-column-count")) ||
    Number.parseInt(board.style.getPropertyValue("--lead-col-count"), 10) ||
    16;

  board.style.setProperty("--lead-col-count", String(count));
  row.style.minWidth = "";

  const last = columns[columns.length - 1];
  const lastColumnRight = last
    ? last.offsetLeft + last.offsetWidth
    : leadsBoardRowMinWidthPx(count);

  const forced = forcedLeadsBoardRowWidthPx({
    columnCount: count,
    clientWidth: board.clientWidth,
    scrollWidth: board.scrollWidth,
    lastColumnRight,
  });
  if (forced != null) {
    row.style.minWidth = `${forced}px`;
  }
}

export function scrollLeadsBoardToColumn(board: HTMLElement, stage: string) {
  const row = boardRow(board);
  if (!row) return;

  const column = boardColumns(board).find((item) => item.dataset.stage === stage);
  if (!column) return;

  const left = column.getBoundingClientRect().left - row.getBoundingClientRect().left;
  board.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
}
