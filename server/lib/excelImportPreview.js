import path from "node:path";
import { inflateRawSync } from "node:zlib";

export const MAIN_RESIDENT_SHEET_NAME = "Brgy Nazareth Inhabitatns";

const PREVIEW_ROW_LIMIT = 25;
const FIRST_ASSISTANCE_COLUMN_INDEX = 16;
const EXCEL_EPOCH_OFFSET = Date.UTC(1899, 11, 30);
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

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

const decoder = new TextDecoder("utf-8");

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

function readCellValue(attributes, body, sharedStrings) {
  if (attributes.t === "inlineStr") {
    return readTextRuns(body);
  }

  const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? xmlDecode(valueMatch[1]) : "";

  if (attributes.t === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  return rawValue;
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

function readWorksheetRows(worksheetXml, sharedStrings) {
  const rows = new Map();
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch = rowPattern.exec(worksheetXml);

  while (rowMatch) {
    const rowAttributes = getAttributes(rowMatch[1]);
    const explicitRowNumber = Number(rowAttributes.r);
    const row = {};
    const cellPattern = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch = cellPattern.exec(rowMatch[2]);

    while (cellMatch) {
      const cellAttributes = getAttributes(cellMatch[1]);
      const reference = parseCellReference(cellAttributes.r);

      if (reference) {
        row[reference.column] = readCellValue(cellAttributes, cellMatch[2] ?? "", sharedStrings);
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
  return String(value ?? "").trim();
}

function rowHasValue(row) {
  return Object.values(row).some((value) => text(value) !== "");
}

function parseDateValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return {
      value: value.toISOString().slice(0, 10),
      valid: true
    };
  }

  const raw = text(value);

  if (!raw) {
    return {
      value: "",
      valid: true
    };
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return {
        value: date.toISOString().slice(0, 10),
        valid: true
      };
    }
  }

  const slashDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw);

  if (slashDateMatch) {
    const month = Number(slashDateMatch[1]);
    const day = Number(slashDateMatch[2]);
    const parsedYear = Number(slashDateMatch[3]);
    const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return {
        value: date.toISOString().slice(0, 10),
        valid: true
      };
    }
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);

    if (serial > 0) {
      const date = new Date(EXCEL_EPOCH_OFFSET + Math.floor(serial) * DAY_IN_MILLISECONDS);

      return {
        value: date.toISOString().slice(0, 10),
        valid: true
      };
    }
  }

  return {
    value: raw,
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

function normalizeHeader(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function getCell(row, column) {
  return text(row[column]);
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

function buildPreviewRow(rowNumber, row, documentRequestPairs) {
  const birthDate = parseDateValue(getCell(row, "G"));
  const previewRow = {
    rowNumber,
    fullName: getCell(row, "A"),
    address: getCell(row, "B"),
    precinctNo: getCell(row, "C"),
    birthDate: birthDate.value,
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

    const parsedDate = parseDateValue(rawDate);

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
    errors
  };
}

function indexExistingResidents(existingResidents) {
  const nameBirthDate = new Map();
  const nameAddress = new Map();

  for (const resident of existingResidents) {
    const fullName = resident.full_name ?? resident.fullName;
    const birthDate = resident.birth_date ?? resident.birthDate;
    const address = resident.address ?? resident.exactAddress;
    const normalizedName = normalizeTextForMatch(fullName);
    const normalizedBirthDate = normalizeDateForMatch(birthDate);
    const normalizedAddress = normalizeTextForMatch(address);

    if (normalizedName && normalizedBirthDate) {
      nameBirthDate.set(`${normalizedName}|${normalizedBirthDate}`, "existingResident");
    }

    if (normalizedName && normalizedAddress) {
      nameAddress.set(`${normalizedName}|${normalizedAddress}`, "existingResident");
    }
  }

  return {
    nameBirthDate,
    nameAddress
  };
}

function collectDuplicateWarnings(previewRows, existingResidents) {
  const warnings = [];
  const duplicateIndex = indexExistingResidents(existingResidents);

  for (const row of previewRows) {
    const normalizedName = normalizeTextForMatch(row.fullName);
    const normalizedBirthDate = normalizeDateForMatch(row.birthDate);
    const effectiveAddress = row.exactAddress || row.address;
    const normalizedAddress = normalizeTextForMatch(effectiveAddress);

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

    if (normalizedName && normalizedAddress) {
      const key = `${normalizedName}|${normalizedAddress}`;
      const matchSource = duplicateIndex.nameAddress.get(key);

      if (matchSource) {
        warnings.push(
          makeDuplicateWarning(
            row.rowNumber,
            "address",
            "possibleDuplicateNameAddress",
            matchSource
          )
        );
      } else {
        duplicateIndex.nameAddress.set(key, "previewRow");
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
  { existingResidents = [], previewRowLimit = PREVIEW_ROW_LIMIT } = {}
) {
  const entries = readZipEntries(workbookBuffer);
  const worksheetXml = getMainWorksheet(entries);
  const sharedStrings = readSharedStrings(entries);
  const rows = readWorksheetRows(worksheetXml, sharedStrings);
  const headerRow = rows.get(1) ?? {};
  const highestColumnIndex = getHighestColumnIndex(rows);
  const documentRequestPairsDetected = detectDocumentRequestPairs(headerRow, highestColumnIndex);
  const allPreviewRows = [];
  const errors = [];
  const dataRowNumbers = [...rows.keys()]
    .filter((rowNumber) => rowNumber > 1 && rowHasValue(rows.get(rowNumber)))
    .sort((left, right) => left - right);

  for (const rowNumber of dataRowNumbers) {
    const { previewRow, errors: rowErrors } = buildPreviewRow(
      rowNumber,
      rows.get(rowNumber),
      documentRequestPairsDetected
    );

    allPreviewRows.push(previewRow);
    errors.push(...rowErrors);
  }

  return {
    sheetName: MAIN_RESIDENT_SHEET_NAME,
    totalRowsDetected: dataRowNumbers.length,
    previewRows: allPreviewRows.slice(0, previewRowLimit),
    warnings: collectDuplicateWarnings(allPreviewRows, existingResidents),
    errors,
    detectedColumns: buildDetectedColumns(headerRow),
    ignoredColumns: buildIgnoredColumns(),
    documentRequestPairsDetected
  };
}
