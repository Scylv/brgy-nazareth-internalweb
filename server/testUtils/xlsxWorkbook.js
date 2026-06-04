const encoder = new TextEncoder();

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCellDescriptor(value) {
  if (
    value &&
    typeof value === "object" &&
    !Buffer.isBuffer(value) &&
    Object.hasOwn(value, "value")
  ) {
    return value;
  }

  return {
    value
  };
}

function buildCellXml(value, reference) {
  const cell = getCellDescriptor(value);

  if (cell.value === undefined || cell.value === null) {
    return "";
  }

  const styleAttribute =
    cell.styleId === undefined || cell.styleId === null ? "" : ` s="${cell.styleId}"`;
  const cellType = cell.type ?? (typeof cell.value === "number" ? "number" : "inlineStr");

  if (cellType === "blank") {
    return `<c r="${reference}"${styleAttribute}/>`;
  }

  if (cellType === "number") {
    return `<c r="${reference}"${styleAttribute}><v>${escapeXml(cell.value)}</v></c>`;
  }

  if (cellType === "date") {
    return `<c r="${reference}"${styleAttribute} t="d"><v>${escapeXml(cell.value)}</v></c>`;
  }

  if (cellType === "inlineNoType") {
    return `<c r="${reference}"${styleAttribute}><is><t>${escapeXml(cell.value)}</t></is></c>`;
  }

  if (cellType === "strInline") {
    return `<c r="${reference}"${styleAttribute} t="str"><is><t>${escapeXml(
      cell.value
    )}</t></is></c>`;
  }

  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t>${escapeXml(
    cell.value
  )}</t></is></c>`;
}

function columnName(index) {
  let current = index + 1;
  let name = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function buildSheetXml(rows) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
          return buildCellXml(value, reference);
        })
        .join("");

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function buildStylesXml(styles) {
  const customNumberFormats = styles.map((style, index) => ({
    id: 164 + index,
    code: style.numFmtCode
  }));
  const numberFormatXml = customNumberFormats
    .map(
      (format) =>
        `<numFmt numFmtId="${format.id}" formatCode="${escapeXml(format.code)}"/>`
    )
    .join("");
  const cellFormatXml = customNumberFormats
    .map(
      (format) =>
        `<xf numFmtId="${format.id}" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="${customNumberFormats.length}">${numberFormatXml}</numFmts>
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${customNumberFormats.length + 1}">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    ${cellFormatXml}
  </cellXfs>
</styleSheet>`;
}

function buildWorkbookXml(sheets) {
  const sheetXml = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
}

function buildWorkbookRelsXml(sheets) {
  const relationships = sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
</Relationships>`;
}

function buildContentTypesXml(sheets, styles) {
  const sheetOverrides = sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${
    styles.length > 0
      ? '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      : ""
  }
  ${sheetOverrides}
</Types>`;
}

const crcTable = Array.from({ length: 256 }, (_value, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const dataBuffer = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(encoder.encode(entry.data));
    const checksum = crc32(dataBuffer);
    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(dataBuffer.length),
      uint32(dataBuffer.length),
      uint16(nameBuffer.length),
      uint16(0),
      nameBuffer
    ]);

    localParts.push(localHeader, dataBuffer);

    centralParts.push(
      Buffer.concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(checksum),
        uint32(dataBuffer.length),
        uint32(dataBuffer.length),
        uint16(nameBuffer.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        nameBuffer
      ])
    );

    offset += localHeader.length + dataBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endDirectory = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);

  return Buffer.concat([...localParts, centralDirectory, endDirectory]);
}

export function createXlsxWorkbook({ sheets, styles = [] }) {
  const entries = [
    {
      name: "[Content_Types].xml",
      data: buildContentTypesXml(sheets, styles)
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      data: buildWorkbookXml(sheets)
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: buildWorkbookRelsXml(sheets)
    },
    ...(styles.length > 0
      ? [
          {
            name: "xl/styles.xml",
            data: buildStylesXml(styles)
          }
        ]
      : []),
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: buildSheetXml(sheet.rows)
    }))
  ];

  return createZip(entries);
}

export function buildPhase1Rows(dataRows) {
  return [
    [
      "",
      "ADDRESS",
      "PRECINCT NO.",
      "",
      "",
      "",
      "BIRTHDAY",
      "CIVIL STATUS",
      "EMPLOYMENT",
      "EXACT ADDRESS",
      "CONTACT NUMBER",
      "FACEBOOK NAME",
      "SITIO",
      "TAG",
      "REMARKS",
      "",
      "Assistance Requested",
      "Date",
      "Assistance Requested",
      "Date"
    ],
    ...dataRows
  ];
}
