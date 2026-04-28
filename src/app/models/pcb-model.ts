export interface Point {
  x: number;
  y: number;
}

export interface Trace {
  points: Point[];
  length: number;
  segLengths: number[];
}

export interface Node {
  x: number;
  y: number;
  r: number;
}

export interface Chip {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface Electron {
  trace: Trace;
  t: number;
  speed: number;
  active: boolean;
  fireIn: number;
  trail: Point[];
  colorTheme: 'cyan' | 'purple' | 'gold';
}
