import path from "node:path";
import { inflateRawSync } from "node:zlib";

export const MAIN_RESIDENT_SHEET_NAME = "Brgy Nazareth Inhabitatns";

const PREVIEW_ROW_LIMIT = 25;
const FIRST_ASSISTANCE_COLUMN_INDEX = 16;
const EXCEL_EPOCH_OFFSET = Date.UTC(1899, 11, 30);
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const BUILT_IN_NUMBER_FORMATS = new Map([
  [14, "m/d/yy"],
  [15, "d-mmm-yy"],
  [16, "d-mmm"],
  [17, "mmm-yy"],
  [22, "m/d/yy h:mm"]
]);
const MONTH_INDEXES = new Map(
  [
    ["january", 1],
    ["jan", 1],
    ["february", 2],
    ["feb", 2],
    ["march", 3],
    ["mar", 3],
    ["april", 4],
    ["apr", 4],
    ["may", 5],
    ["june", 6],
    ["jun", 6],
    ["july", 7],
    ["jul", 7],
    ["august", 8],
    ["aug", 8],
    ["september", 9],
    ["sep", 9],
    ["sept", 9],
    ["october", 10],
    ["oct", 10],
    ["november", 11],
    ["nov", 11],
    ["december", 12],
    ["dec", 12]
  ]
);
const LONG_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const FIELD_COLUMNS = [
  { column: "A", header: "", field: "fullName" },
  { column: "B", header: "ADDRESS", field: "address" },
  { column: "C", header: "PRECINCT NO.", field: "precinctNo" },
  { column: "G", header: "BIRTHDAY", field: "birthDate" },
  { column: "H", header: "CIVIL STATUS", field: "civilStatus" },
  { column: "I", header: "EMPLOYMENT", field: "employment" },
  { column: "J", header: "EXACT ADDRESS", field: "exactAddress" },
  { column: "K", header: "CONTACT NUMBER", field: "contactNumber" },
  { column: "L", header: "FACEBOOK NAME", field: "facebookName" },
  { column: "M", header: "SITIO", field: "sitio" },
  { column: "N", header: "TAG", field: "tag" },
  { column: "O", header: "REMARKS", field: "remarks" }
];

const IGNORED_NEEDS_CLARIFICATION_COLUMNS = ["D", "E", "F"];
const CELL_PATTERN = /<c\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/c>)/g;

const decoder = new TextDecoder("utf-8");

function isCellValue(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    Object.hasOwn(value, "value")
  );
}

function makeCellValue({
  value,
  rawValue = value,
  displayValue = value,
  type = "",
  formatCode = ""
}) {
  return {
    value: value ?? "",
    rawValue: rawValue ?? value ?? "",
    displayValue: displayValue ?? value ?? "",
    type,
    formatCode
  };
}

function xmlDecode(value) {
  return String(value ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)));
}

function getAttributes(source) {
  const attributes = {};
  const attributePattern = /([\w:.-]+)="([^"]*)"/g;
  let match = attributePattern.exec(source);

  while (match) {
    attributes[match[1]] = xmlDecode(match[2]);
    match = attributePattern.exec(source);
  }

  return attributes;
}

function readTextEntry(buffer) {
  return decoder.decode(buffer);
}

function readZipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("An .xlsx file buffer is required.");
  }

  const searchStart = Math.max(0, buffer.length - 65557);
  let endDirectoryOffset = -1;

  for (let index = buffer.length - 22; index >= searchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      endDirectoryOffset = index;
      break;
    }
  }

  if (endDirectoryOffset < 0) {
    throw new Error("The uploaded file is not a readable .xlsx workbook.");
  }

  const entryCount = buffer.readUInt16LE(endDirectoryOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endDirectoryOffset + 16);
  const entries = new Map();
  let offset = centralDirectoryOffset;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("The uploaded .xlsx workbook has an invalid ZIP directory.");
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const name = buffer
      .subarray(nameStart, nameStart + fileNameLength)
      .toString("utf8")
      .replace(/\\/g, "/");

    if ((flags & 1) === 1) {
      throw new Error("Encrypted .xlsx workbooks are not supported.");
    }

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error("The uploaded .xlsx workbook has an invalid ZIP entry.");
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      entries.set(name, compressedData);
    } else if (method === 8) {
      entries.set(name, inflateRawSync(compressedData));
    } else {
      throw new Error("The uploaded .xlsx workbook uses an unsupported ZIP compression method.");
    }

    offset = nameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readWorkbookSheets(workbookXml) {
  const sheets = [];
  const sheetPattern = /<sheet\b([^>]*)\/?>/g;
  let match = sheetPattern.exec(workbookXml);

  while (match) {
    const attributes = getAttributes(match[1]);

    sheets.push({
      name: attributes.name ?? "",
      relationshipId: attributes["r:id"] ?? ""
    });

    match = sheetPattern.exec(workbookXml);
  }

  return sheets;
}

function readRelationships(relationshipsXml) {
  const relationships = new Map();
  const relationshipPattern = /<Relationship\b([^>]*)\/?>/g;
  let match = relationshipPattern.exec(relationshipsXml);

  while (match) {
    const attributes = getAttributes(match[1]);

    if (attributes.Id && attributes.Target) {
      relationships.set(attributes.Id, attributes.Target);
    }

    match = relationshipPattern.exec(relationshipsXml);
  }

  return relationships;
}

function resolveWorkbookRelationshipTarget(target) {
  if (target.startsWith("/")) {
    return path.posix.normalize(target.replace(/^\/+/, ""));
  }

  return path.posix.normalize(path.posix.join("xl", target));
}

function readSharedStrings(entries) {
  const sharedStringsXml = entries.get("xl/sharedStrings.xml");

  if (!sharedStringsXml) {
    return [];
  }

  const sharedStrings = [];
  const xml = readTextEntry(sharedStringsXml);
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match = itemPattern.exec(xml);

  while (match) {
    sharedStrings.push(readTextRuns(match[1]));
    match = itemPattern.exec(xml);
  }

  return sharedStrings;
}

function readStyles(entries) {
  const stylesXml = entries.get("xl/styles.xml");

  if (!stylesXml) {
    return {
      cellFormats: []
    };
  }

  const xml = readTextEntry(stylesXml);
  const numberFormats = new Map(BUILT_IN_NUMBER_FORMATS);
  const numFmtPattern = /<numFmt\b([^>]*)\/?>/g;
  let numFmtMatch = numFmtPattern.exec(xml);

  while (numFmtMatch) {
    const attributes = getAttributes(numFmtMatch[1]);
    const id = Number(attributes.numFmtId);

    if (Number.isFinite(id) && attributes.formatCode) {
      numberFormats.set(id, attributes.formatCode);
    }

    numFmtMatch = numFmtPattern.exec(xml);
  }

  const cellFormats = [];
  const cellXfsMatch = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  const xfPattern = /<xf\b([^>]*)\/?>/g;
  let xfMatch = cellXfsMatch ? xfPattern.exec(cellXfsMatch[1]) : null;

  while (xfMatch) {
    const attributes = getAttributes(xfMatch[1]);
    const numFmtId = Number(attributes.numFmtId ?? 0);

    cellFormats.push({
      numFmtId,
      formatCode: numberFormats.get(numFmtId) ?? ""
    });

    xfMatch = xfPattern.exec(cellXfsMatch[1]);
  }

  return {
    cellFormats
  };
}

function readTextRuns(xml) {
  const values = [];
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match = textPattern.exec(xml);

  while (match) {
    values.push(xmlDecode(match[1]));
    match = textPattern.exec(xml);
  }

  return values.join("");
}

function expandScientificNotation(value) {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(value);

  if (!match) {
    return value;
  }

  const [, sign, integerPart, fractionalPart = "", exponentText] = match;
  const exponent = Number(exponentText);
  const digits = `${integerPart}${fractionalPart}`;
  const decimalPosition = integerPart.length + exponent;

  if (decimalPosition <= 0) {
    return `${sign}0.${"0".repeat(Math.abs(decimalPosition))}${digits}`;
  }

  if (decimalPosition >= digits.length) {
    return `${sign}${digits}${"0".repeat(decimalPosition - digits.length)}`;
  }

  const left = digits.slice(0, decimalPosition);
  const right = digits.slice(decimalPosition).replace(/0+$/, "");

  return right ? `${sign}${left}.${right}` : `${sign}${left}`;
}

function expandNumericText(value) {
  const raw = text(value);

  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(raw)) {
    return raw;
  }

  const expanded = /e/i.test(raw) ? expandScientificNotation(raw) : raw;

  return expanded.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function applyZeroNumberFormat(value, formatCode) {
  const normalizedFormatCode = text(formatCode);

  if (!/^0+$/.test(normalizedFormatCode)) {
    return value;
  }

  const sign = value.startsWith("-") ? "-" : "";
  const unsignedValue = value.replace(/^[-+]/, "");

  if (!/^\d+$/.test(unsignedValue)) {
    return value;
  }

  return `${sign}${unsignedValue.padStart(normalizedFormatCode.length, "0")}`;
}

function getCellNumberFormat(attributes, styles) {
  const styleId = Number(attributes.s);

  if (!Number.isFinite(styleId)) {
    return "";
  }

  return styles.cellFormats[styleId]?.formatCode ?? "";
}

function readCellValue(attributes, body, sharedStrings, styles) {
  const formatCode = getCellNumberFormat(attributes, styles);
  const cellType = attributes.t ?? "";

  if (attributes.t === "inlineStr") {
    const value = readTextRuns(body);

    return makeCellValue({
      value,
      type: cellType,
      formatCode
    });
  }

  const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? xmlDecode(valueMatch[1]) : "";

  if (attributes.t === "s") {
    return makeCellValue({
      value: sharedStrings[Number(rawValue)] ?? "",
      rawValue,
      type: cellType,
      formatCode
    });
  }

  if (!valueMatch) {
    const inlineValue = readTextRuns(body);

    return makeCellValue({
      value: inlineValue,
      rawValue: inlineValue,
      type: cellType,
      formatCode
    });
  }

  const expandedValue = expandNumericText(rawValue);
  const formattedValue = applyZeroNumberFormat(expandedValue, formatCode);
  const dateDisplay = isDateNumberFormat(formatCode)
    ? getFormattedDateDisplay(expandedValue, formatCode)
    : "";

  return makeCellValue({
    value: formattedValue,
    rawValue,
    displayValue: dateDisplay || formattedValue,
    type: cellType,
    formatCode
  });
}

function readWorksheetCells(worksheetXml, sharedStrings, styles) {
  const cells = new Map();
  const cellPattern = new RegExp(CELL_PATTERN);
  let cellMatch = cellPattern.exec(worksheetXml);

  while (cellMatch) {
    const cellAttributes = getAttributes(cellMatch[1]);
    const reference = parseCellReference(cellAttributes.r);

    if (reference) {
      cells.set(
        `${reference.column}${reference.rowNumber}`,
        readCellValue(cellAttributes, cellMatch[2] ?? "", sharedStrings, styles)
      );
    }

    cellMatch = cellPattern.exec(worksheetXml);
  }

  return cells;
}

function parseCellReference(reference) {
  const match = /^([A-Z]+)(\d+)$/.exec(reference ?? "");

  if (!match) {
    return null;
  }

  return {
    column: match[1],
    rowNumber: Number(match[2])
  };
}

function readWorksheetRows(worksheetXml, sharedStrings, styles) {
  const rows = new Map();
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch = rowPattern.exec(worksheetXml);

  while (rowMatch) {
    const rowAttributes = getAttributes(rowMatch[1]);
    const explicitRowNumber = Number(rowAttributes.r);
    const row = {};
    const cellPattern = new RegExp(CELL_PATTERN);
    let cellMatch = cellPattern.exec(rowMatch[2]);

    while (cellMatch) {
      const cellAttributes = getAttributes(cellMatch[1]);
      const reference = parseCellReference(cellAttributes.r);

      if (reference) {
        row[reference.column] = readCellValue(
          cellAttributes,
          cellMatch[2] ?? "",
          sharedStrings,
          styles
        );
      }

      cellMatch = cellPattern.exec(rowMatch[2]);
    }

    const rowNumber =
      Number.isFinite(explicitRowNumber) && explicitRowNumber > 0
        ? explicitRowNumber
        : rows.size + 1;

    rows.set(rowNumber, row);
    rowMatch = rowPattern.exec(worksheetXml);
  }

  return rows;
}

function columnToIndex(column) {
  return String(column)
    .split("")
    .reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
}

function indexToColumn(index) {
  let current = index + 1;
  let column = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }

  return column;
}

function getHighestColumnIndex(rows) {
  let highest = 0;

  for (const row of rows.values()) {
    for (const column of Object.keys(row)) {
      highest = Math.max(highest, columnToIndex(column));
    }
  }

  return highest;
}

function text(value) {
  if (isCellValue(value)) {
    return text(value.value);
  }

  return String(value ?? "").trim();
}

function rowHasValue(row) {
  return Object.values(row).some((value) => text(value) !== "");
}

function formatDateDisplay(date, formatCode, fallbackDisplayValue) {
  const normalizedFormatCode = normalizeNumberFormatCode(formatCode);

  if (normalizedFormatCode.includes("mmmm")) {
    return `${LONG_MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  }

  return fallbackDisplayValue || date.toISOString().slice(0, 10);
}

function normalizeNumberFormatCode(formatCode) {
  return text(formatCode).toLowerCase().replace(/\\/g, "");
}

function isDateNumberFormat(formatCode) {
  const normalizedFormatCode = normalizeNumberFormatCode(formatCode);

  return /[dy]/.test(normalizedFormatCode) && /[my]/.test(normalizedFormatCode);
}

function dateResult(date, displayValue, formatCode = "") {
  return {
    value: date.toISOString().slice(0, 10),
    displayValue: formatDateDisplay(date, formatCode, displayValue),
    valid: true
  };
}

function parseDateParts({ year, month, day, displayValue, formatCode = "" }) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  ) {
    return dateResult(date, displayValue, formatCode);
  }

  return null;
}

function getDateInput(value) {
  if (isCellValue(value)) {
    return value;
  }

  return makeCellValue({
    value,
    rawValue: value
  });
}

function uniqueDateCandidates(...values) {
  return [...new Set(values.map((value) => text(value)).filter(Boolean))];
}

function parseIsoLikeDateTime(raw, formatCode = "") {
  const match =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ t](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:z|[+-]\d{2}:?\d{2})?$/i.exec(
      raw
    );

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return parseDateParts({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    displayValue: raw,
    formatCode
  });
}

function parseMonthNameDateTime(raw, formatCode = "") {
  const match =
    /^(?:[a-z]{3}\s+)?([a-z]+)\s+(\d{1,2})\s+(\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s+gmt[+-]\d{4}.*)?)?$/i.exec(
      raw
    );

  if (!match) {
    return null;
  }

  const month = MONTH_INDEXES.get(match[1].toLowerCase());

  if (!month) {
    return null;
  }

  return parseDateParts({
    year: Number(match[3]),
    month,
    day: Number(match[2]),
    displayValue: raw,
    formatCode
  });
}

function parseExcelSerialDate(raw, formatCode = "") {
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return null;
  }

  const serial = Number(raw);

  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  const date = new Date(EXCEL_EPOCH_OFFSET + Math.floor(serial) * DAY_IN_MILLISECONDS);

  return dateResult(date, date.toISOString().slice(0, 10), formatCode);
}

function getFormattedDateDisplay(raw, formatCode = "") {
  return (
    parseExcelSerialDate(raw, formatCode)?.displayValue ??
    parseIsoLikeDateTime(raw, formatCode)?.displayValue ??
    parseMonthNameDateTime(raw, formatCode)?.displayValue ??
    ""
  );
}

function parseDateValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return dateResult(value, value.toISOString().slice(0, 10));
  }

  const input = getDateInput(value);

  if (input.value instanceof Date && Number.isFinite(input.value.getTime())) {
    return dateResult(input.value, input.value.toISOString().slice(0, 10), input.formatCode);
  }

  if (input.rawValue instanceof Date && Number.isFinite(input.rawValue.getTime())) {
    return dateResult(
      input.rawValue,
      input.rawValue.toISOString().slice(0, 10),
      input.formatCode
    );
  }

  const raw = text(input.rawValue);
  const formattedValue = text(input.value);
  const displayValue = text(input.displayValue);
  const candidates = uniqueDateCandidates(input.rawValue, input.value, input.displayValue);

  if (candidates.length === 0) {
    return {
      value: "",
      displayValue: "",
      valid: true
    };
  }

  if (input.type === "d") {
    for (const candidate of candidates) {
      const parsedDate = parseIsoLikeDateTime(candidate, input.formatCode);

      if (parsedDate) {
        return parsedDate;
      }
    }
  }

  for (const candidate of candidates) {
    const parsedDate = parseExcelSerialDate(candidate, input.formatCode);

    if (parsedDate) {
      return parsedDate;
    }
  }

  for (const candidate of candidates) {
    const parsedDate = parseIsoLikeDateTime(candidate, input.formatCode);

    if (parsedDate) {
      return parsedDate;
    }
  }

  const textCandidates = uniqueDateCandidates(displayValue, formattedValue, raw);

  for (const candidate of textCandidates) {
    const slashDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(candidate);

    if (slashDateMatch) {
      const month = Number(slashDateMatch[1]);
      const day = Number(slashDateMatch[2]);
      const parsedYear = Number(slashDateMatch[3]);
      const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
      const parsedDate = parseDateParts({
        year,
        month,
        day,
        displayValue: candidate,
        formatCode: input.formatCode
      });

      if (parsedDate) {
        return parsedDate;
      }
    }
  }

  for (const candidate of textCandidates) {
    const monthDateMatch =
      /^([a-z]+)\.?\s+(\d{1,2})(?:,)?\s+(\d{4})$/i.exec(candidate);

    if (monthDateMatch) {
      const month = MONTH_INDEXES.get(monthDateMatch[1].toLowerCase());
      const day = Number(monthDateMatch[2]);
      const year = Number(monthDateMatch[3]);
      const parsedDate = month
        ? parseDateParts({
            year,
            month,
            day,
            displayValue: candidate,
            formatCode: input.formatCode
          })
        : null;

      if (parsedDate) {
        return parsedDate;
      }
    }
  }

  for (const candidate of textCandidates) {
    const parsedDate = parseMonthNameDateTime(candidate, input.formatCode);

    if (parsedDate) {
      return parsedDate;
    }
  }

  return {
    value: formattedValue || raw,
    displayValue: formattedValue || raw,
    valid: false
  };
}

function normalizeTextForMatch(value) {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateForMatch(value) {
  const parsed = parseDateValue(value);

  return parsed.valid ? parsed.value : "";
}

function normalizeContactForMatch(value) {
  return normalizeTextForMatch(value);
}

function normalizeHeader(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function getCell(row, column) {
  return text(row[column]);
}

function getRawCell(row, column) {
  return row[column] ?? "";
}

function buildDetectedColumns(headerRow) {
  return FIELD_COLUMNS.map(({ column, field, header }) => ({
    column,
    header: getCell(headerRow, column) || header,
    field
  }));
}

function detectDocumentRequestPairs(headerRow, highestColumnIndex) {
  const pairs = [];

  for (
    let columnIndex = FIRST_ASSISTANCE_COLUMN_INDEX;
    columnIndex < highestColumnIndex;
    columnIndex += 2
  ) {
    const assistanceColumn = indexToColumn(columnIndex);
    const dateColumn = indexToColumn(columnIndex + 1);
    const assistanceHeader = getCell(headerRow, assistanceColumn);
    const dateHeader = getCell(headerRow, dateColumn);

    if (
      normalizeHeader(assistanceHeader) === "assistance requested" &&
      normalizeHeader(dateHeader) === "date"
    ) {
      pairs.push({
        assistanceColumn,
        dateColumn,
        assistanceHeader,
        dateHeader
      });
    }
  }

  return pairs;
}

function buildIgnoredColumns() {
  return IGNORED_NEEDS_CLARIFICATION_COLUMNS.map((column) => ({
    column,
    reason: "needsClarification"
  }));
}

function makeValidationError(rowNumber, field, code, message) {
  return {
    rowNumber,
    field,
    code,
    message
  };
}

function makeDuplicateWarning(rowNumber, field, code, matchSource) {
  return {
    rowNumber,
    field,
    code,
    matchSource,
    message: "Possible duplicate detected. Review before importing this row."
  };
}

function getValueType(value) {
  if (value instanceof Date) {
    return "date";
  }

  if (isCellValue(value)) {
    return "cell";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function safeDebugValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).slice(0, 120);
}

function buildDateDebug(rowNumber, cell, birthDate, directCellExists) {
  const cellValue = isCellValue(cell) ? cell : makeCellValue({ value: cell, rawValue: cell });

  return {
    rowNumber,
    cellAddress: `G${rowNumber}`,
    directCellExists,
    directCellVType: getValueType(cellValue.rawValue),
    directCellW: safeDebugValue(cellValue.displayValue),
    directCellT: safeDebugValue(cellValue.type),
    directCellZ: safeDebugValue(cellValue.formatCode),
    parsedBirthDate: birthDate.value,
    parsedBirthDateDisplay: birthDate.displayValue
  };
}

function buildPreviewRow(
  rowNumber,
  row,
  documentRequestPairs,
  {
    directCells,
    includeDateDebug = false
  } = {}
) {
  const directBirthDateCell = directCells?.get(`G${rowNumber}`);
  const birthDateCell = directBirthDateCell ?? getRawCell(row, "G");
  const birthDate = parseDateValue(birthDateCell);
  const previewRow = {
    rowNumber,
    fullName: getCell(row, "A"),
    address: getCell(row, "B"),
    precinctNo: getCell(row, "C"),
    birthDate: birthDate.value,
    birthDateDisplay: birthDate.displayValue,
    civilStatus: getCell(row, "H"),
    employment: getCell(row, "I"),
    exactAddress: getCell(row, "J"),
    contactNumber: getCell(row, "K"),
    facebookName: getCell(row, "L"),
    sitio: getCell(row, "M"),
    tag: getCell(row, "N"),
    remarks: getCell(row, "O"),
    ignoredNeedsClarification: [...IGNORED_NEEDS_CLARIFICATION_COLUMNS],
    documentRequestHistoryPreview: []
  };
  const errors = [];

  if (!previewRow.fullName) {
    errors.push(
      makeValidationError(rowNumber, "fullName", "fullNameRequired", "Full name is required.")
    );
  }

  if (!previewRow.address && !previewRow.exactAddress) {
    errors.push(
      makeValidationError(
        rowNumber,
        "address",
        "addressRequired",
        "At least one address field is required."
      )
    );
  }

  if (!birthDate.valid) {
    errors.push(
      makeValidationError(
        rowNumber,
        "birthDate",
        "invalidBirthDate",
        "Birthday must be a valid date or blank."
      )
    );
  }

  for (const pair of documentRequestPairs) {
    const assistanceRequested = getCell(row, pair.assistanceColumn);
    const rawDate = getCell(row, pair.dateColumn);

    if (!assistanceRequested && !rawDate) {
      continue;
    }

    const parsedDate = parseDateValue(getRawCell(row, pair.dateColumn));

    previewRow.documentRequestHistoryPreview.push({
      assistanceRequested,
      date: parsedDate.value,
      sourceColumns: {
        assistance: pair.assistanceColumn,
        date: pair.dateColumn
      }
    });

    if (assistanceRequested && !rawDate) {
      errors.push(
        makeValidationError(
          rowNumber,
          "documentRequestHistoryPreview",
          "assistanceDateRequired",
          "Assistance history needs a date before import."
        )
      );
    }

    if (!assistanceRequested && rawDate) {
      errors.push(
        makeValidationError(
          rowNumber,
          "documentRequestHistoryPreview",
          "assistanceRequestedRequired",
          "Assistance history needs a request label before import."
        )
      );
    }

    if (rawDate && !parsedDate.valid) {
      errors.push(
        makeValidationError(
          rowNumber,
          "documentRequestHistoryPreview",
          "invalidAssistanceDate",
          "Assistance history date must be a valid date."
        )
      );
    }
  }

  return {
    previewRow,
    errors,
    dateDebug: includeDateDebug
      ? buildDateDebug(rowNumber, birthDateCell, birthDate, Boolean(directBirthDateCell))
      : null
  };
}

function indexExistingResidents(existingResidents) {
  const nameBirthDate = new Map();
  const nameExactAddress = new Map();
  const nameContactNumber = new Map();

  for (const resident of existingResidents) {
    const fullName = resident.full_name ?? resident.fullName;
    const birthDate = resident.birth_date ?? resident.birthDate;
    const address = resident.address ?? resident.exactAddress;
    const contactNumber = resident.contact_number ?? resident.contactNumber;
    const normalizedName = normalizeTextForMatch(fullName);
    const normalizedBirthDate = normalizeDateForMatch(birthDate);
    const normalizedExactAddress = normalizeTextForMatch(address);
    const normalizedContactNumber = normalizeContactForMatch(contactNumber);

    if (normalizedName && normalizedBirthDate) {
      nameBirthDate.set(`${normalizedName}|${normalizedBirthDate}`, "existingResident");
    }

    if (normalizedName && normalizedExactAddress) {
      nameExactAddress.set(`${normalizedName}|${normalizedExactAddress}`, "existingResident");
    }

    if (normalizedName && normalizedContactNumber) {
      nameContactNumber.set(`${normalizedName}|${normalizedContactNumber}`, "existingResident");
    }
  }

  return {
    nameBirthDate,
    nameExactAddress,
    nameContactNumber
  };
}

function collectDuplicateWarnings(previewRows, existingResidents) {
  const warnings = [];
  const duplicateIndex = indexExistingResidents(existingResidents);

  for (const row of previewRows) {
    const normalizedName = normalizeTextForMatch(row.fullName);
    const normalizedBirthDate = normalizeDateForMatch(row.birthDate);
    const normalizedExactAddress = normalizeTextForMatch(row.exactAddress);
    const normalizedContactNumber = normalizeContactForMatch(row.contactNumber);

    if (normalizedName && normalizedBirthDate) {
      const key = `${normalizedName}|${normalizedBirthDate}`;
      const matchSource = duplicateIndex.nameBirthDate.get(key);

      if (matchSource) {
        warnings.push(
          makeDuplicateWarning(
            row.rowNumber,
            "birthDate",
            "possibleDuplicateNameBirthDate",
            matchSource
          )
        );
      } else {
        duplicateIndex.nameBirthDate.set(key, "previewRow");
      }
    }

    if (normalizedName && normalizedExactAddress) {
      const key = `${normalizedName}|${normalizedExactAddress}`;
      const matchSource = duplicateIndex.nameExactAddress.get(key);

      if (matchSource) {
        warnings.push(
          makeDuplicateWarning(
            row.rowNumber,
            "exactAddress",
            "possibleDuplicateNameExactAddress",
            matchSource
          )
        );
      } else {
        duplicateIndex.nameExactAddress.set(key, "previewRow");
      }
    }

    if (normalizedName && normalizedContactNumber) {
      const key = `${normalizedName}|${normalizedContactNumber}`;
      const matchSource = duplicateIndex.nameContactNumber.get(key);

      if (matchSource) {
        warnings.push(
          makeDuplicateWarning(
            row.rowNumber,
            "contactNumber",
            "possibleDuplicateNameContactNumber",
            matchSource
          )
        );
      } else {
        duplicateIndex.nameContactNumber.set(key, "previewRow");
      }
    }
  }

  return warnings;
}

function getMainWorksheet(entries) {
  const workbookXmlBuffer = entries.get("xl/workbook.xml");
  const relationshipsXmlBuffer = entries.get("xl/_rels/workbook.xml.rels");

  if (!workbookXmlBuffer || !relationshipsXmlBuffer) {
    throw new Error("The uploaded .xlsx workbook is missing required workbook metadata.");
  }

  const workbookXml = readTextEntry(workbookXmlBuffer);
  const relationshipsXml = readTextEntry(relationshipsXmlBuffer);
  const sheets = readWorkbookSheets(workbookXml);
  const relationships = readRelationships(relationshipsXml);
  const mainSheet = sheets.find((sheet) => sheet.name === MAIN_RESIDENT_SHEET_NAME);

  if (!mainSheet) {
    throw new Error(`Sheet "${MAIN_RESIDENT_SHEET_NAME}" was not found.`);
  }

  const target = relationships.get(mainSheet.relationshipId);

  if (!target) {
    throw new Error(`Sheet "${MAIN_RESIDENT_SHEET_NAME}" does not have a worksheet target.`);
  }

  const worksheetPath = resolveWorkbookRelationshipTarget(target);
  const worksheetXmlBuffer = entries.get(worksheetPath);

  if (!worksheetXmlBuffer) {
    throw new Error(`Sheet "${MAIN_RESIDENT_SHEET_NAME}" worksheet data was not found.`);
  }

  return readTextEntry(worksheetXmlBuffer);
}

export function parseExcelImportPreview(
  workbookBuffer,
  {
    existingResidents = [],
    previewRowLimit = PREVIEW_ROW_LIMIT,
    includeDateDebug = false
  } = {}
) {
  const entries = readZipEntries(workbookBuffer);
  const worksheetXml = getMainWorksheet(entries);
  const sharedStrings = readSharedStrings(entries);
  const styles = readStyles(entries);
  const directCells = readWorksheetCells(worksheetXml, sharedStrings, styles);
  const rows = readWorksheetRows(worksheetXml, sharedStrings, styles);
  const headerRow = rows.get(1) ?? {};
  const highestColumnIndex = getHighestColumnIndex(rows);
  const documentRequestPairsDetected = detectDocumentRequestPairs(headerRow, highestColumnIndex);
  const allPreviewRows = [];
  const errors = [];
  const dateDebug = [];
  const dataRowNumbers = [...rows.keys()]
    .filter((rowNumber) => rowNumber > 1 && rowHasValue(rows.get(rowNumber)))
    .sort((left, right) => left - right);

  for (const rowNumber of dataRowNumbers) {
    const { previewRow, errors: rowErrors, dateDebug: rowDateDebug } = buildPreviewRow(
      rowNumber,
      rows.get(rowNumber),
      documentRequestPairsDetected,
      { directCells, includeDateDebug }
    );

    allPreviewRows.push(previewRow);
    errors.push(...rowErrors);

    if (rowDateDebug) {
      dateDebug.push(rowDateDebug);
    }
  }

  const preview = {
    sheetName: MAIN_RESIDENT_SHEET_NAME,
    totalRowsDetected: dataRowNumbers.length,
    previewRows: allPreviewRows.slice(0, previewRowLimit),
    warnings: collectDuplicateWarnings(allPreviewRows, existingResidents),
    errors,
    detectedColumns: buildDetectedColumns(headerRow),
    ignoredColumns: buildIgnoredColumns(),
    documentRequestPairsDetected
  };

  if (includeDateDebug) {
    preview.dateDebug = dateDebug.slice(0, previewRowLimit);
  }

  return preview;
}
