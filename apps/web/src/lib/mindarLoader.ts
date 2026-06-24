const MIND_AR_VERSION = "1.2.5";
const CDN_BASE = `https://cdn.jsdelivr.net/npm/mind-ar@${MIND_AR_VERSION}/dist`;

interface MindARCompiler {
  compileImageTargets(
    images: HTMLImageElement[],
    progressCallback?: (progress: number) => void
  ): Promise<void>;
  exportData(): ArrayBuffer;
}

export interface MindARThreeOptions {
  container: HTMLElement;
  imageTargetSrc: string;
  maxTrack?: number;
  filterMinCF?: number;
  filterBeta?: number;
  warmupTolerance?: number;
  missTolerance?: number;
}

export interface MindARThreeInstance {
  renderer: import("three").WebGLRenderer;
  scene: import("three").Scene;
  camera: import("three").Camera;
  addAnchor(index: number): {
    group: import("three").Group;
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
  };
  start(): Promise<void>;
  stop(): void;
}

export async function loadMindARCompiler(): Promise<new () => MindARCompiler> {
  const mod = await import(
    /* @vite-ignore */
    `${CDN_BASE}/mindar-image.prod.js`
  );
  const Compiler = mod.Compiler ?? mod.default?.Compiler;
  if (!Compiler) throw new Error("MindAR Compiler failed to load");
  return Compiler;
}

export async function loadMindARThree(): Promise<
  new (options: MindARThreeOptions) => MindARThreeInstance
> {
  const mod = await import(
    /* @vite-ignore */
    `${CDN_BASE}/mindar-image-three.prod.js`
  );
  const MindARThree = mod.MindARThree ?? mod.default?.MindARThree;
  if (!MindARThree) throw new Error("MindAR Three failed to load");
  return MindARThree;
}
