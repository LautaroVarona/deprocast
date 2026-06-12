declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  export interface WorkSheet {
    [cell: string]: unknown;
  }

  export const utils: {
    sheet_to_json<T>(
      worksheet: WorkSheet,
      options?: Record<string, unknown>,
    ): T[];
  };

  export function read(
    data: Buffer,
    options?: { type?: string; cellDates?: boolean },
  ): WorkBook;
}
