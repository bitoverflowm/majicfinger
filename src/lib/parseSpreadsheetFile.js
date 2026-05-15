import * as XLSX from "xlsx";

function parseWorksheet(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true });
  const firstRow = rows[0];
  const dataTypes = {};
  if (firstRow && typeof firstRow === "object") {
    for (const key of Object.keys(firstRow)) {
      dataTypes[key] = typeof firstRow[key];
    }
  }
  return { rows, dataTypes };
}

/**
 * Parse a CSV or XLSX file into sheet map + active sheet + column types.
 * @param {File} file
 * @returns {Promise<{ sheets: Record<string, { name: string, data: unknown[] }>, activeSheetId: string, dataTypes: Record<string, string> }>}
 */
export function parseSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected"));
      return;
    }

    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (fileType !== "csv" && fileType !== "xlsx") {
      reject(new Error("Only .csv and .xlsx files are supported"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (fileType === "csv") {
          const workbook = XLSX.read(raw, { type: "binary" });
          const sheetName = workbook.SheetNames?.[0] || "Sheet 1";
          const sheet = workbook.Sheets[sheetName];
          const { rows, dataTypes } = parseWorksheet(sheet);
          resolve({
            sheets: {
              "sheet-1": { name: sheetName, data: rows },
            },
            activeSheetId: "sheet-1",
            dataTypes,
          });
          return;
        }

        const workbook = XLSX.read(raw, { type: "array" });
        const allSheetsDataTypes = {};
        const sheets = {};
        workbook.SheetNames.forEach((sheetName, idx) => {
          const worksheet = workbook.Sheets[sheetName];
          const { rows, dataTypes } = parseWorksheet(worksheet);
          const id = `sheet-${idx + 1}`;
          sheets[id] = { name: sheetName || `Sheet ${idx + 1}`, data: rows };
          allSheetsDataTypes[sheetName] = dataTypes;
        });
        const firstName = workbook.SheetNames?.[0];
        resolve({
          sheets,
          activeSheetId: "sheet-1",
          dataTypes: firstName ? allSheetsDataTypes[firstName] : {},
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse file"));
      }
    };

    if (fileType === "csv") {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}
