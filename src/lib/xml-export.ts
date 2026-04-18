// XML export to Sportscode format
import {
  Match,
  Phase,
  getPhaseExportCode,
  getPhaseStartTimeSeconds,
  getPhaseEndTimeSeconds,
} from "./types";

export function exportToSportscodeXML(match: Match): string {
  const { phases } = match;
  
  const instances = phases
    .filter((phase) => phase.phaseCode !== null)
    .map((phase) => generateInstance(phase))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<file>
  <ALL_INSTANCES>
${instances}
  </ALL_INSTANCES>
</file>`;
}

function generateInstance(phase: Phase): string {
  const code = getPhaseExportCode(phase);
  const startTime = formatTime(getPhaseStartTimeSeconds(phase));
  const endTime = formatTime(getPhaseEndTimeSeconds(phase));
  const label = phase.phaseLabel || "Unknown";

  return `    <instance>
      <ID>${phase.id}</ID>
      <start>${startTime}</start>
      <end>${endTime}</end>
      <code>${escapeXml(code)}</code>
      <label>${escapeXml(label)}</label>
    </instance>`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(3, "0")}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
