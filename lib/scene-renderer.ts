export const maximumSceneMasks = 8;

export type SceneMaskState = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

export type SceneRendererMode = "webgl2" | "webgl1";

export interface SceneRenderer {
  readonly mode: SceneRendererMode;
  resize(width: number, height: number, dpr: number): void;
  setMaskState(masks: readonly SceneMaskState[]): void;
  setSources(sharpSource: string, blurredSource: string): void;
  render(): void;
  dispose(): void;
}

type RendererCallbacks = {
  onReady: () => void;
  onFallback: (reason: string) => void;
};

type LoadedTextureSource = ImageBitmap | HTMLImageElement;

const vertexShader100 = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader100 = `
precision mediump float;

varying vec2 vUv;
uniform sampler2D uSharp;
uniform sampler2D uBlurred;
uniform vec2 uCssSize;
uniform float uDpr;
uniform int uMaskCount;
uniform vec4 uRects[${maximumSceneMasks}];
uniform float uRadii[${maximumSceneMasks}];

float roundedRectDistance(vec2 point, vec4 rect, float radius) {
  vec2 halfSize = rect.zw * 0.5;
  vec2 center = rect.xy + halfSize;
  vec2 delta = abs(point - center) - (halfSize - vec2(radius));
  return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0) - radius;
}

void main() {
  vec2 point = vec2(vUv.x * uCssSize.x, (1.0 - vUv.y) * uCssSize.y);
  float mask = 0.0;
  float feather = 0.75 / max(uDpr, 1.0);
  for (int index = 0; index < ${maximumSceneMasks}; index++) {
    if (index >= uMaskCount) break;
    float distanceToMask = roundedRectDistance(point, uRects[index], uRadii[index]);
    mask = max(mask, 1.0 - smoothstep(-feather, feather, distanceToMask));
  }
  vec4 sharp = texture2D(uSharp, vUv);
  vec4 blurred = texture2D(uBlurred, vUv);
  gl_FragColor = mix(sharp, blurred, mask);
}
`;

const vertexShader300 = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader300 = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 outputColor;
uniform sampler2D uSharp;
uniform sampler2D uBlurred;
uniform vec2 uCssSize;
uniform float uDpr;
uniform int uMaskCount;
uniform vec4 uRects[${maximumSceneMasks}];
uniform float uRadii[${maximumSceneMasks}];

float roundedRectDistance(vec2 point, vec4 rect, float radius) {
  vec2 halfSize = rect.zw * 0.5;
  vec2 center = rect.xy + halfSize;
  vec2 delta = abs(point - center) - (halfSize - vec2(radius));
  return length(max(delta, 0.0)) + min(max(delta.x, delta.y), 0.0) - radius;
}

void main() {
  vec2 point = vec2(vUv.x * uCssSize.x, (1.0 - vUv.y) * uCssSize.y);
  float mask = 0.0;
  float feather = 0.75 / max(uDpr, 1.0);
  for (int index = 0; index < ${maximumSceneMasks}; index++) {
    if (index >= uMaskCount) break;
    float distanceToMask = roundedRectDistance(point, uRects[index], uRadii[index]);
    mask = max(mask, 1.0 - smoothstep(-feather, feather, distanceToMask));
  }
  vec4 sharp = texture(uSharp, vUv);
  vec4 blurred = texture(uBlurred, vUv);
  outputColor = mix(sharp, blurred, mask);
}
`;

function compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create a WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext, webgl2: boolean) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, webgl2 ? vertexShader300 : vertexShader100);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, webgl2 ? fragmentShader300 : fragmentShader100);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create a WebGL program.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown WebGL link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

async function loadTextureSource(source: string, signal: AbortSignal): Promise<LoadedTextureSource> {
  if ("createImageBitmap" in window) {
    const response = await fetch(source, { signal, cache: "force-cache" });
    if (!response.ok) throw new Error(`Unable to load scene texture: ${response.status}`);
    return window.createImageBitmap(await response.blob(), {
      imageOrientation: "flipY",
      premultiplyAlpha: "premultiply",
      colorSpaceConversion: "default",
    });
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const abort = () => reject(new DOMException("Texture load aborted.", "AbortError"));
    image.decoding = "async";
    image.onload = () => {
      signal.removeEventListener("abort", abort);
      resolve(image);
    };
    image.onerror = () => {
      signal.removeEventListener("abort", abort);
      reject(new Error("Unable to decode a scene texture."));
    };
    signal.addEventListener("abort", abort, { once: true });
    image.src = source;
  });
}

function closeTextureSource(source: LoadedTextureSource) {
  if ("close" in source) source.close();
}

class WebGLSceneRenderer implements SceneRenderer {
  readonly mode: SceneRendererMode;
  private readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly callbacks: RendererCallbacks;
  private readonly canvas: HTMLCanvasElement;
  private readonly positionBuffer: WebGLBuffer;
  private readonly sharpTexture: WebGLTexture;
  private readonly blurredTexture: WebGLTexture;
  private readonly locations: {
    position: number;
    sharp: WebGLUniformLocation;
    blurred: WebGLUniformLocation;
    cssSize: WebGLUniformLocation;
    dpr: WebGLUniformLocation;
    maskCount: WebGLUniformLocation;
    rects: WebGLUniformLocation;
    radii: WebGLUniformLocation;
  };
  private masks: readonly SceneMaskState[] = [];
  private cssWidth = 1;
  private cssHeight = 1;
  private dpr = 1;
  private ready = false;
  private disposed = false;
  private loadVersion = 0;
  private loadController: AbortController | null = null;
  private sourceKey = "";

  constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext | WebGL2RenderingContext, mode: SceneRendererMode, callbacks: RendererCallbacks) {
    this.canvas = canvas;
    this.gl = gl;
    this.mode = mode;
    this.callbacks = callbacks;
    this.program = createProgram(gl, mode === "webgl2");

    const positionBuffer = gl.createBuffer();
    const sharpTexture = gl.createTexture();
    const blurredTexture = gl.createTexture();
    if (!positionBuffer || !sharpTexture || !blurredTexture) throw new Error("Unable to allocate WebGL scene resources.");
    this.positionBuffer = positionBuffer;
    this.sharpTexture = sharpTexture;
    this.blurredTexture = blurredTexture;

    const uniform = (name: string) => {
      const location = gl.getUniformLocation(this.program, name);
      if (!location) throw new Error(`Missing WebGL uniform: ${name}`);
      return location;
    };
    this.locations = {
      position: gl.getAttribLocation(this.program, "aPosition"),
      sharp: uniform("uSharp"),
      blurred: uniform("uBlurred"),
      cssSize: uniform("uCssSize"),
      dpr: uniform("uDpr"),
      maskCount: uniform("uMaskCount"),
      rects: uniform("uRects[0]"),
      radii: uniform("uRadii[0]"),
    };

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(this.locations.sharp, 0);
    gl.uniform1i(this.locations.blurred, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
  }

  private onContextLost = (event: Event) => {
    event.preventDefault();
    if (this.disposed) return;
    this.ready = false;
    this.callbacks.onFallback("context-lost");
  };

  private uploadTexture(texture: WebGLTexture, unit: number, source: LoadedTextureSource) {
    const gl = this.gl;
    const bitmap = typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, bitmap ? 0 : 1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, bitmap ? 0 : 1);
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  resize(width: number, height: number, dpr: number) {
    if (this.disposed) return;
    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
    this.dpr = Math.max(1, dpr);
    const pixelWidth = Math.max(1, Math.round(this.cssWidth * this.dpr));
    const pixelHeight = Math.max(1, Math.round(this.cssHeight * this.dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.render();
  }

  setMaskState(masks: readonly SceneMaskState[]) {
    this.masks = masks.slice(0, maximumSceneMasks);
  }

  setSources(sharpSource: string, blurredSource: string) {
    const sourceKey = `${sharpSource}\n${blurredSource}`;
    if (this.disposed || this.sourceKey === sourceKey) return;
    this.sourceKey = sourceKey;
    this.ready = false;
    const version = ++this.loadVersion;
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;

    void Promise.all([
      loadTextureSource(sharpSource, controller.signal),
      loadTextureSource(blurredSource, controller.signal),
    ]).then(([sharp, blurred]) => {
      if (this.disposed || controller.signal.aborted || version !== this.loadVersion) {
        closeTextureSource(sharp);
        closeTextureSource(blurred);
        return;
      }
      try {
        this.uploadTexture(this.sharpTexture, this.gl.TEXTURE0, sharp);
        this.uploadTexture(this.blurredTexture, this.gl.TEXTURE1, blurred);
        this.ready = true;
        this.render();
        this.callbacks.onReady();
      } finally {
        closeTextureSource(sharp);
        closeTextureSource(blurred);
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted || this.disposed) return;
      console.warn("WebGL scene texture loading failed; using the SVG renderer.", error);
      this.callbacks.onFallback("texture-load-failed");
    });
  }

  render() {
    if (this.disposed || !this.ready || this.gl.isContextLost()) return;
    const gl = this.gl;
    const rectangles = new Float32Array(maximumSceneMasks * 4);
    const radii = new Float32Array(maximumSceneMasks);
    this.masks.forEach((mask, index) => {
      rectangles.set([mask.x, mask.y, mask.width, mask.height], index * 4);
      radii[index] = mask.radius;
    });

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.locations.cssSize, this.cssWidth, this.cssHeight);
    gl.uniform1f(this.locations.dpr, this.dpr);
    gl.uniform1i(this.locations.maskCount, this.masks.length);
    gl.uniform4fv(this.locations.rects, rectangles);
    gl.uniform1fv(this.locations.radii, radii);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sharpTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.blurredTexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadController?.abort();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    if (!this.gl.isContextLost()) {
      this.gl.deleteTexture(this.sharpTexture);
      this.gl.deleteTexture(this.blurredTexture);
      this.gl.deleteBuffer(this.positionBuffer);
      this.gl.deleteProgram(this.program);
    }
  }
}

export function createSceneRenderer(canvas: HTMLCanvasElement, callbacks: RendererCallbacks): SceneRenderer | null {
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
  };

  try {
    const webgl2 = canvas.getContext("webgl2", attributes);
    if (webgl2) return new WebGLSceneRenderer(canvas, webgl2, "webgl2", callbacks);
    const webgl1 = canvas.getContext("webgl", attributes);
    if (webgl1) return new WebGLSceneRenderer(canvas, webgl1, "webgl1", callbacks);
  } catch (error) {
    console.warn("WebGL scene renderer initialization failed; using the SVG renderer.", error);
  }
  return null;
}
