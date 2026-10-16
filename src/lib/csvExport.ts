/**
 * Safely escape CSV fields
 */
function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Downloads data as a CSV file with UTF-8 BOM for Microsoft Excel compatibility
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const headerRow = headers.map(escapeCsvValue).join(',');
  const dataRows = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
  
  // \uFEFF is the UTF-8 Byte Order Mark for Excel
  const csvContent = '\uFEFF' + headerRow + '\r\n' + dataRows;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
