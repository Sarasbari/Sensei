/**
 * Sensei Dashboard — Main Application Logic
 *
 * Handles:
 *   - Navigation between dashboard sections
 *   - API calls to backend
 *   - Rendering review metrics, DNA map, escalations, scanner findings
 */

const API_BASE = "http://localhost:8000/api/v1";

// --- Navigation ---

function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".dashboard-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sections.forEach((s) => s.classList.add("hidden"));
      document.getElementById(targetId)?.classList.remove("hidden");
    });
  });
}

// --- API Client ---

async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    return null;
  }
}

// --- Reviews Section ---

async function loadReviewStats() {
  // TODO: Fetch and render review statistics
  // const stats = await fetchAPI("/reviews/stats");
}

async function loadReviewList() {
  // TODO: Fetch and render recent reviews
  // const reviews = await fetchAPI("/reviews?limit=20");
}

// --- DNA Map Section ---

async function loadDNAMap() {
  // TODO: Fetch DNA map data and render visualization
  // const mapData = await fetchAPI("/dna/map");
}

// --- Escalations Section ---

async function loadEscalations() {
  // TODO: Fetch and render escalation log
  // const escalations = await fetchAPI("/escalations");
}

// --- Scanner Section ---

async function loadScanFindings() {
  // TODO: Fetch and render scan findings
  // const findings = await fetchAPI("/scanner/findings");
}

// --- Health Check ---

async function checkHealth() {
  const health = await fetchAPI("/health");
  if (health) {
    console.log("Sensei Backend Status:", health.status);
  }
}

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  checkHealth();
  loadReviewStats();
  loadReviewList();
});
