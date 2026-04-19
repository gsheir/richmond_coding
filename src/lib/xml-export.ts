// XML export to Sportscode format
import {
  Match,
  Phase,
  getPhaseStartTimeSeconds,
  getPhaseEndTimeSeconds,
  ButtonConfig,
} from "./types";

interface InstanceData {
  id: number;
  code: string;
  start: number;
  end: number;
  labels: Array<{ group: string; text: string }>;
}

export function exportToSportscodeXML(match: Match, buttonConfig: ButtonConfig[]): string {
  const { phases } = match;
  
  // Generate instances for both phases and termination events
  const allInstances: InstanceData[] = [];
  
  phases
    .filter((phase) => phase.phaseCode !== null && phase.endTimeMs !== null)
    .forEach((phase) => {
      // Add phase instance
      const phaseInstance = generatePhaseInstance(phase);
      allInstances.push(phaseInstance);
      
      // Add termination event instance if it exists
      if (phase.terminationEvent) {
        const terminationInstance = generateTerminationInstance(phase);
        allInstances.push(terminationInstance);
      }
    });
  
  // Sort by start time and assign sequential IDs
  allInstances.sort((a, b) => a.start - b.start);
  allInstances.forEach((instance, index) => {
    instance.id = index + 1;
  });
  
  // Generate XML for instances
  const instancesXml = allInstances
    .map((instance) => formatInstance(instance))
    .join("\n");
  
  // Generate ROWS section
  const rowsXml = generateRowsSection(buttonConfig);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<file>
  <ALL_INSTANCES>
${instancesXml}
  </ALL_INSTANCES>
  <ROWS>
${rowsXml}
  </ROWS>
</file>`;
}

function generatePhaseInstance(phase: Phase): InstanceData {
  const code = phase.phaseCode!;
  const start = getPhaseStartTimeSeconds(phase);
  const end = getPhaseEndTimeSeconds(phase);
  
  const labels: Array<{ group: string; text: string }> = [];
  
  // Add context labels
  phase.contextLabels.forEach((context) => {
    labels.push({ group: "Context", text: context });
  });
  
  // Add termination event label
  if (phase.terminationEvent) {
    labels.push({ group: "Termination", text: phase.terminationEvent });
  }
  
  return {
    id: 0, // Will be reassigned later
    code,
    start,
    end,
    labels,
  };
}

function generateTerminationInstance(phase: Phase): InstanceData {
  const code = phase.terminationEvent!;
  const start = phase.endTimeMs! / 1000.0;
  const end = (phase.endTimeMs! + phase.lagMs) / 1000.0;
  
  const labels: Array<{ group: string; text: string }> = [
    { group: "Terminated Phase", text: phase.phaseCode! },
  ];
  
  return {
    id: 0, // Will be reassigned later
    code,
    start,
    end,
    labels,
  };
}

function formatInstance(instance: InstanceData): string {
  const labelsXml = instance.labels.length > 0
    ? "\n" + instance.labels
        .map(
          (label) =>
            `      <label>
        <group>${escapeXml(label.group)}</group>
        <text>${escapeXml(label.text)}</text>
      </label>`
        )
        .join("\n")
    : "";
  
  return `    <instance>
      <ID>${instance.id}</ID>
      <code>${escapeXml(instance.code)}</code>
      <start>${formatTime(instance.start)}</start>
      <end>${formatTime(instance.end)}</end>${labelsXml}
    </instance>`;
}

function formatTime(seconds: number): string {
  // Return decimal seconds with 2 decimal places
  return seconds.toFixed(2);
}

function generateRowsSection(buttonConfig: ButtonConfig[]): string {
  // Get unique codes from button configuration
  const uniqueCodes = new Map<string, ButtonConfig>();
  
  buttonConfig.forEach((button) => {
    if (!uniqueCodes.has(button.code)) {
      uniqueCodes.set(button.code, button);
    }
  });
  
  // Generate row for each unique code
  const rows = Array.from(uniqueCodes.values()).map((button) => {
    const rgb = hexToRgb16bit(button.style.colour);
    
    return `    <row>
      <code>${escapeXml(button.code)}</code>
      <R>${rgb.r}</R>
      <G>${rgb.g}</G>
      <B>${rgb.b}</B>
    </row>`;
  });
  
  return rows.join("\n");
}

function hexToRgb16bit(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Parse RGB values (0-255)
  const r8bit = parseInt(cleanHex.substring(0, 2), 16);
  const g8bit = parseInt(cleanHex.substring(2, 4), 16);
  const b8bit = parseInt(cleanHex.substring(4, 6), 16);
  
  // Convert to 16-bit (0-65535) by multiplying by 257
  return {
    r: r8bit * 257,
    g: g8bit * 257,
    b: b8bit * 257,
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
