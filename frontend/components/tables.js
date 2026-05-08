/**
 * tables.js — Table Components
 *
 * Sortable, filterable data tables for:
 *   - PR review history
 *   - Escalation logs
 *   - Scanner findings
 *   - Engineer DNA profiles
 */

/**
 * Render a sortable data table.
 * @param {HTMLElement} container - Target container element
 * @param {string[]} columns - Column headers
 * @param {Array<object>} rows - Row data objects
 * @param {object} options - Table configuration
 */
export function renderTable(container, columns, rows, options = {}) {
  const table = document.createElement("table");
  table.className = "data-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label || col;
    th.dataset.key = col.key || col;
    if (options.sortable) {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => sortTable(table, col.key || col));
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      const key = col.key || col;
      td.textContent = row[key] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);
}

function sortTable(table, key) {
  // TODO: Implement client-side column sorting
}

// TODO: Add pagination support
// TODO: Add search/filter functionality
