import { google, sheets_v4 } from "googleapis";
import { GoogleAuth } from "./auth.js";

export class Sheets {
  #auth: GoogleAuth;
  #spreadsheetId: string;
  #sheets: sheets_v4.Sheets;

  constructor(auth: GoogleAuth, spreadsheetId: string) {
    this.#auth = auth;
    this.#spreadsheetId = spreadsheetId;
    this.#sheets = google.sheets("v4");
  }

  async #getTableMap() {
    const res = await this.#getFromRange("A:A");
    const data = await this.#getFromRange(`A1:B${res.length}`);

    return Object.fromEntries(data) as Record<string, string>;
  }

  async #getTableCoords(tableName: string) {
    return (await this.#getTableMap())[tableName] as string;
  }

  async #getFromRange(range: string) {
    const res = await this.#sheets.spreadsheets.values.get({
      spreadsheetId: this.#spreadsheetId,
      auth: this.#auth,
      range,
    });
    return res.data.values;
  }

  #parseCoords(coords: string) {
    const regex = new RegExp(/(\w)(\d):(\w)(\d)/).exec(coords);
    const [, startCol, startRow, endCol, endRow] = regex;

    return {
      startCol,
      startRow: Number(startRow),
      endCol,
      endRow: Number(endRow),
    };
  }

  #getNextRow(coords: string) {
    const { startCol, startRow, endCol, endRow } = this.#parseCoords(coords);
    return `${startCol}${endRow + 1}:${endCol}${endRow + 1}`;
  }

  async #insert({ range, values }: { range: string; values: Array<unknown> }) {
    const res = await this.#sheets.spreadsheets.values.update({
      spreadsheetId: this.#spreadsheetId,
      auth: this.#auth,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });

    return res.data;
  }

  async #getHeaderMap(coords: string) {
    const { startRow, startCol, endCol } = this.#parseCoords(coords);
    const headerCoords = `${startCol}${startRow}:${endCol}${startRow}`;
    const [data] = await this.#getFromRange(headerCoords);

    return data.reduce((acc, column, index) => {
      acc[column] = `${this.#incrementLetterBy(startCol, index)}${startRow}`;

      return acc;
    }, {}) as Record<string, string>;
  }

  #incrementLetterBy(letter: string, by: number) {
    const charCode = letter.charCodeAt(0) + by;

    return String.fromCharCode(charCode);
  }

  async insertInto<T extends keyof TableNames>(
    tableName: T,
    values: Omit<TableNames[T], "ID">
  ) {
    const coords = await this.#getTableCoords(tableName);
    const nextRowCoords = this.#getNextRow(coords);
    const { endRow } = this.#parseCoords(coords);
    values = { ID: endRow, ...values };
    console.log(nextRowCoords, Object.values(values));
    this.#insert({
      range: nextRowCoords,
      values: Object.values(values),
    });
  }

  async deleteFrom<T extends keyof TableNames>(
    tableName: T,
    { where }: { where: Partial<Record<keyof TableNames[T], unknown>> }
  ) {
    const coords = await this.#getTableCoords(tableName);
    const tableCoords = this.#parseCoords(coords);
    const headerMap = await this.#getHeaderMap(coords);
    console.log(headerMap);
    // Get column of heading
    const whereColumn = headerMap[Object.keys(where)[0] as string];
    // Find row of record to delete
    const whereCoords = `${whereColumn}:${whereColumn}`;
    const { startCol } = this.#parseCoords(whereCoords);
    console.log(whereColumn, Object.keys(where));
    const location = `${startCol}:${startCol}`;
    const data = (await this.#getFromRange(location)).flat();
    // Get row number
    const [, ...tableData] = data;
    const row = tableData.findIndex(
      (value) => String(value) === String(Object.values(where)[0])
    );
    if (row === -1) {
      console.log("Record not found", { tableName, where, row, tableData });
      throw new Error("Record not found");
    }
    // Get row coords
    const rowCoords = `${tableCoords.startCol}${row + 2}:${tableCoords.endCol}${
      row + 2
    }`;
    console.log(rowCoords);
    const res = await this.#sheets.spreadsheets.values.batchClear({
      spreadsheetId: this.#spreadsheetId,
      auth: this.#auth,
      requestBody: {
        ranges: [rowCoords],
      },
    });

    return res.data;
  }
}

interface TableNames {
  Users: {
    ID: number;
    Name: string;
    Age: number;
  };
  Dogs: {
    ID: number;
    Name: string;
    Age: number;
  };
}
