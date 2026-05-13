/** Rows per page on the Users table. */
export const USERS_TABLE_PAGE_SIZE = 10;

/** `TableHead` (`h-10`) + bottom border. */
const HEADER_BLOCK = "2.5625rem";
/** One body row (cells + borders). */
const BODY_ROW_BLOCK = "4.0625rem";

/** CSS `max-height` for the scrollable table wrapper. */
export function usersTableScrollMaxHeight(): string {
   return `min(calc(${HEADER_BLOCK} + ${USERS_TABLE_PAGE_SIZE} * ${BODY_ROW_BLOCK} + 2px), 85svh)`;
}
