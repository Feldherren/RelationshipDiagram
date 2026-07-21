/** Shared path / polygon helpers for Konva chips and SVG picker icons. */

/** Heart path fitted around the origin, roughly unit-sized (±1). */
export const HEART_PATH =
  "M 0 -0.35 C -0.25 -0.7 -0.95 -0.55 -0.95 -0.05 C -0.95 0.4 -0.35 0.75 0 1 C 0.35 0.75 0.95 0.4 0.95 -0.05 C 0.95 -0.55 0.25 -0.7 0 -0.35 Z";

/** Crescent moon as a closed path around the origin (±1). */
export const MOON_PATH =
  "M 0.35 -0.85 A 0.95 0.95 0 1 0 0.35 0.85 A 0.7 0.7 0 1 1 0.35 -0.85 Z";

/** Musical note (native ~24×24 icon coords, not unit space). */
export const MUSIC_NOTE_PATH =
  "M10.0909 11.9629L19.3636 8.63087V14.1707C18.8126 13.8538 18.1574 13.67 17.4545 13.67C15.4964 13.67 13.9091 15.096 13.9091 16.855C13.9091 18.614 15.4964 20.04 17.4545 20.04C19.4126 20.04 21 18.614 21 16.855C21 16.855 21 16.8551 21 16.855L21 7.49236C21 6.37238 21 5.4331 20.9123 4.68472C20.8999 4.57895 20.8852 4.4738 20.869 4.37569C20.7845 3.86441 20.6352 3.38745 20.347 2.98917C20.2028 2.79002 20.024 2.61055 19.8012 2.45628C19.7594 2.42736 19.716 2.39932 19.6711 2.3722L19.6621 2.36679C18.8906 1.90553 18.0233 1.93852 17.1298 2.14305C16.2657 2.34086 15.1944 2.74368 13.8808 3.23763L11.5963 4.09656C10.9806 4.32806 10.4589 4.52419 10.0494 4.72734C9.61376 4.94348 9.23849 5.1984 8.95707 5.57828C8.67564 5.95817 8.55876 6.36756 8.50501 6.81203C8.4545 7.22978 8.45452 7.7378 8.45455 8.33743V16.1307C7.90347 15.8138 7.24835 15.63 6.54545 15.63C4.58735 15.63 3 17.056 3 18.815C3 20.574 4.58735 22 6.54545 22C8.50355 22 10.0909 20.574 10.0909 18.815C10.0909 18.815 10.0909 18.8151 10.0909 18.815L10.0909 11.9629Z";

/** Map music-note native coords into chip unit space (±~0.75). */
export const MUSIC_NOTE_LAYOUT = {
  centerX: 12,
  centerY: 12,
  unitScale: 0.065,
} as const;

/** Sword icon (native ~24×24 icon coords, not unit space). */
export const SWORD_PATH =
  "M9.646 14.096a1 1 0 1 1-1.414 1.414l-1.414-1.414-2.828 2.829a1 1 0 0 1-1.415 1.414l-1.414-1.414a1 1 0 0 1 1.414-1.415l2.829-2.828-1.414-1.414a1 1 0 0 1 1.414-1.414l4.242 4.242zm.708-.707L6.11 9.146 14.596.661l3.536.707.707 3.536-8.485 8.485z";

/** Map sword native coords into chip unit space (±~0.75). */
export const SWORD_LAYOUT = {
  centerX: 9.5,
  centerY: 8.5,
  unitScale: 0.085,
} as const;
/** Flame plume (native ~28×30 icon coords, not unit space). */
export const FLAME_PATH =
  "M10.375 7.562c0 5.625 5.625 6.563 5.625 11.25 0 1.875-1.875 4.687-4.687 4.687s-4.687-2.813-2.813-7.5c-2.813 1.875-3.75 3.75-3.75 5.625 0 4.688 4.687 9.375 11.25 9.375s11.25-2.812 11.25-8.438c0.042-8.32-9.587-11.1-12.188-15-1.875-2.813-0.937-4.688 0.937-6.563-3.75 0.938-5.625 3.563-5.625 6.563v0z";

/** Map flame native coords into chip unit space (±~0.75). */
export const FLAME_LAYOUT = {
  centerX: 16,
  centerY: 16,
  unitScale: 0.05,
} as const;

/** Teardrop / water droplet (native ~6×8 icon coords, not unit space). */
export const DROPLET_PATH =
  "M3 0l-.34.34c-.11.11-2.66 2.69-2.66 4.88 0 1.65 1.35 3 3 3s3-1.35 3-3c0-2.18-2.55-4.77-2.66-4.88l-.34-.34zm-1.5 4.72c.28 0 .5.22.5.5 0 .55.45 1 1 1 .28 0 .5.22.5.5s-.22.5-.5.5c-1.1 0-2-.9-2-2 0-.28.22-.5.5-.5z";

/** Map droplet native coords into chip unit space (±~0.75). */
export const DROPLET_LAYOUT = {
  centerX: 3,
  centerY: 4.1,
  /** Multiplier on chip glyph scale. */
  unitScale: 0.18,
} as const;

/** Wind / breeze icon (native ~24×24 icon coords, not unit space). */
export const BREEZE_PATH =
  "m8.417 19.246c0-.555.45-1.005 1.005-1.005s1.005.45 1.005 1.005c.002 1.515 1.23 2.743 2.745 2.745 1.817-.002 3.29-1.475 3.292-3.292-.003-2.163-1.756-3.916-3.919-3.917h-11.54c-.555 0-1.005-.45-1.005-1.005s.45-1.005 1.005-1.005h11.54c3.272.004 5.924 2.656 5.928 5.928-.005 2.926-2.375 5.296-5.3 5.301-2.625-.003-4.752-2.129-4.756-4.754zm5.702-8.015c-.555 0-1.005-.45-1.005-1.005s.45-1.005 1.005-1.005h6.156c2.164-.003 3.917-1.756 3.918-3.92-.002-1.817-1.475-3.29-3.292-3.292-1.515.002-2.743 1.23-2.745 2.745 0 .555-.45 1.005-1.005 1.005s-1.005-.45-1.005-1.005c.004-2.625 2.131-4.751 4.755-4.754 2.926.005 5.296 2.375 5.301 5.3-.004 3.273-2.656 5.925-5.928 5.929zm-13.114 0c-.555 0-1.005-.45-1.005-1.005s.45-1.005 1.005-1.005h6.158c2.163-.003 3.916-1.756 3.917-3.92-.004-1.817-1.476-3.288-3.292-3.29-1.515.002-2.743 1.23-2.745 2.745 0 .555-.45 1.005-1.005 1.005s-1.005-.45-1.005-1.005c.003-2.625 2.13-4.753 4.755-4.756 2.926.005 5.296 2.375 5.301 5.3-.004 3.274-2.658 5.927-5.932 5.929z";

/** Map breeze native coords into chip unit space (±~0.75). */
export const BREEZE_LAYOUT = {
  centerX: 12,
  centerY: 12,
  unitScale: 0.065,
} as const;

/** Rock / boulder icon (native ~512×512 icon coords, not unit space). */
export const ROCK_PATH =
  "M209.875 44.156l-182 106.47 119.625 54.31 148.344 11.72 41.97-24.312 17.342 11.562L309 230.656V379.53l53.563-14.624-64.625 51.97-110.875-59.626-2.157-1.53-71.28 6.56 75.936-31.967 100.75 52.125v-147.5l-145.906-11.5-1.625-.125-1.5-.688-121.093-55V391.47L44 423.186l82 20.97 21.875-21.282 11.156 29.72 131.282 33.592V434l4.25 2.28 5.47 2.94 4.812-3.908L309 431.97v52.155L491.375 377.78v-96.405L466.78 269.47l24.595-38.75V125l-90.25 52.28-1.094 34.095-88-58.688 84.97 5.375L476.5 112 291.562 64.937l1.625.563-64.406 5.78 5.345-20.936-24.25-6.188z";

/** Map rock native coords into chip unit space (±~0.75). */
export const ROCK_LAYOUT = {
  centerX: 267,
  centerY: 264,
  unitScale: 0.0034,
} as const;

/**
 * Three 4-pointed sparkles (native ~355×314 icon coords, not unit space).
 * Subpaths (edit independently):
 *  1) Large sparkle — center ~(197.46, 156.81)
 *  2) Medium sparkle — center ~(292, 68), scale 0.34× large
 *  3) Small sparkle — center ~(305, 228), scale 0.20× large
 */
export const SPARKLE_PATH = [
  // 1) Large
  "M247.355,106.9C222.705,82.241,205.833,39.18,197.46,0c-8.386,39.188-25.24,82.258-49.899,106.917c-24.65,24.642-67.724,41.514-106.896,49.904c39.188,8.373,82.254,25.235,106.904,49.895c24.65,24.65,41.522,67.72,49.908,106.9c8.373-39.188,25.24-82.258,49.886-106.917c24.65-24.65,67.724-41.514,106.896-49.904C315.08,148.422,272.014,131.551,247.355,106.9z",
  // 2) Medium (upper-right)
  "M308.964,51.031C300.583,42.647 294.847,28.006 292,14.685C289.149,28.009 283.418,42.652 275.034,51.036C266.653,59.415 252.008,65.151 238.69,68.004C252.014,70.851 266.656,76.584 275.037,84.968C283.418,93.349 289.155,107.993 292.006,121.314C294.853,107.99 300.587,93.346 308.967,84.962C317.348,76.581 331.993,70.848 345.312,67.995C331.991,65.148 317.348,59.412 308.964,51.031Z",
  // 3) Small (lower-right)
  "M314.979,218.018C310.049,213.086 306.675,204.474 305,196.638C303.323,204.476 299.952,213.09 295.02,218.021C290.09,222.95 281.475,226.324 273.641,228.002C281.479,229.677 290.092,233.049 295.022,237.981C299.952,242.911 303.326,251.525 305.003,259.361C306.678,251.524 310.051,242.91 314.981,237.978C319.911,233.048 328.525,229.675 336.36,227.997C328.524,226.322 319.911,222.948 314.979,218.018Z",
].join(" ");

/** Map sparkle native coords into chip unit space (±~0.75). */
export const SPARKLE_LAYOUT = {
  centerX: 197.46,
  centerY: 156.81,
  unitScale: 0.0052,
} as const;

/**
 * Skull (native ~24×24 icon coords, not unit space).
 * Subpaths use evenodd fill — eyes and nose are holes:
 *  1) Cranium + jaw outline
 *  2) Left eye
 *  3) Right eye
 *  4) Nose
 */
export const SKULL_PATH = 
  "M19 21C19 21.5523 18.5523 22 18 22H14H10H6C5.44771 22 5 21.5523 5 21V18.75C5 17.7835 4.2165 17 3.25 17C2.55964 17 2 16.4404 2 15.75V11C2 5.47715 6.47715 1 12 1C17.5228 1 22 5.47715 22 11V15.75C22 16.4404 21.4404 17 20.75 17C19.7835 17 19 17.7835 19 18.75V21ZM17 20V18.75C17 16.9358 18.2883 15.4225 20 15.075V11C20 6.58172 16.4183 3 12 3C7.58172 3 4 6.58172 4 11V15.075C5.71168 15.4225 7 16.9358 7 18.75V20H9V18C9 17.4477 9.44771 17 10 17C10.5523 17 11 17.4477 11 18V20H13V18C13 17.4477 13.4477 17 14 17C14.5523 17 15 17.4477 15 18V20H17ZM11 12.5C11 13.8807 8.63228 15 7.25248 15C5.98469 15 5.99206 14.055 6.00161 12.8306V12.8305C6.00245 12.7224 6.00331 12.6121 6.00331 12.5C6.00331 11.1193 7.12186 10 8.50166 10C9.88145 10 11 11.1193 11 12.5ZM17.9984 12.8306C17.9975 12.7224 17.9967 12.6121 17.9967 12.5C17.9967 11.1193 16.8781 10 15.4983 10C14.1185 10 13 11.1193 13 12.5C13 13.8807 15.3677 15 16.7475 15C18.0153 15 18.0079 14.055 17.9984 12.8306Z";

/** Map skull native coords into chip unit space (±~0.75). */
export const SKULL_LAYOUT = {
  centerX: 12,
  centerY: 12.2,
  unitScale: 0.068,
} as const;

/**
 * Question-mark hook in unit space (±1), stroke-only.
 * Pair with a filled dot at (QUESTION_MARK_OFFSET_X, QUESTION_MARK_DOT_Y).
 * Offset pulls the right-weighted bowl toward chip centre.
 */
export const QUESTION_MARK_PATH =
  "M -0.32 -0.42 C -0.32 -0.95 0.55 -1 0.55 -0.42 C 0.55 -0.08 0.06 0.02 0 0.3 L 0 0.42";

/** Horizontal nudge (unit space) so the glyph reads centred on the chip. */
export const QUESTION_MARK_OFFSET_X = -0.12;

/** Vertical centre of the question-mark terminal dot (unit space). */
export const QUESTION_MARK_DOT_Y = 0.78;

/** Scale every number in an SVG path (unit space → chip/glyph space). */
export function scaleSvgPath(data: string, scale: number): string {
  return data.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (match) => {
    const scaled = Number(match) * scale;
    return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(3);
  });
}

/** Flat list of x,y pairs for a regular polygon (vertex at top). */
export function regularPolygonPoints(
  sides: number,
  radius: number,
): number[] {
  const points: number[] = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < sides; i++) {
    const angle = start + (i * 2 * Math.PI) / sides;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return points;
}

/** Flat list of x,y pairs for a star polygon. */
export function starPolygonPoints(
  outerRadius: number,
  innerRadius: number,
  numPoints: number,
): number[] {
  const points: number[] = [];
  const start = -Math.PI / 2;
  const step = Math.PI / numPoints;
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = start + i * step;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return points;
}
