import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import Papa from "papaparse";
import path from "path";

/**
 * Parse a file buffer and extract its text content.
 * Supports PDF, DOCX, CSV, TXT, and MD files.
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePdf(buffer);
    case ".docx":
      return parseDocx(buffer);
    case ".csv":
      return parseCsv(buffer);
    case ".txt":
    case ".md":
    case ".markdown":
      return buffer.toString("utf-8");
    default:
      throw new Error(
        `Unsupported file type: ${ext}. Supported types: .pdf, .docx, .csv, .txt, .md`
      );
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();
  return result.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function parseCsv(buffer: Buffer): string {
  const csvString = buffer.toString("utf-8");
  const parsed = Papa.parse<string[]>(csvString, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;
  if (rows.length === 0) return "";

  // If first row looks like headers, use them as labels for subsequent rows
  const firstRow = rows[0] as string[];
  const isHeader = firstRow.every(
    (cell) => typeof cell === "string" && cell.length > 0 && !/^\d+(\.\d+)?$/.test(cell)
  );

  if (isHeader && rows.length > 1) {
    const headers = firstRow;
    const dataRows = rows.slice(1) as string[][];
    return dataRows
      .map((row) =>
        headers
          .map((header, i) => `${header}: ${row[i] ?? ""}`)
          .join(", ")
      )
      .join("\n");
  }

  // No headers: just join cells with commas and rows with newlines
  return rows.map((row) => (row as string[]).join(", ")).join("\n");
}
