import type { MapBounds } from "./useMapCamera";

export type MapImage = HTMLImageElement | HTMLCanvasElement;
export interface MapSpriteSource {
  image: MapImage;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}
export interface TerrainSources {
  sprites: MapSpriteSource[];
  ocean: { image: MapImage; w: number; h: number };
  dispose(): void;
}
interface Size {
  width: number;
  height: number;
}
interface TextureBank extends Size {
  images: number[];
  levels: number;
}
const MEMORY_LIMIT = 512 * 1024 * 1024;
function imageSize(image: MapImage): Size {
  return image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : image;
}

/** Array layers cannot bleed into each other at small zoom levels. Size buckets
 * avoid paying terrain-sized texture storage for every small production badge. */
export function planMapTextures(
  images: Size[],
  limits: { size: number; layers: number; banks: number; bytes?: number },
) {
  const banks: TextureBank[] = [];
  const buckets = new Map<string, TextureBank>();
  let bytes = 0;
  const placements = images.map(({ width, height }, index) => {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1
    )
      throw Error("Invalid map image dimensions");
    const w = Math.ceil(width / 32) * 32,
      h = Math.ceil(height / 32) * 32;
    if (w > limits.size || h > limits.size)
      throw Error("Map texture too large");
    const key = `${w}/${h}`;
    let bank = buckets.get(key);
    if (!bank || bank.images.length >= limits.layers) {
      bank = {
        width: w,
        height: h,
        images: [],
        levels: Math.floor(Math.log2(Math.max(w, h))) + 1,
      };
      buckets.set(key, bank);
      banks.push(bank);
      if (banks.length > limits.banks)
        throw Error("Too many map texture banks");
    }
    const layer = bank.images.length;
    bank.images.push(index);
    for (let level = 0; level < bank.levels; level++)
      bytes += Math.max(1, w >> level) * Math.max(1, h >> level) * 4;
    if (bytes > (limits.bytes ?? MEMORY_LIMIT))
      throw Error("Map texture memory budget exceeded");
    return { bank: banks.indexOf(bank), layer };
  });
  return { banks, placements, bytes };
}

export interface MapGpuDrawing {
  draw(view: MapBounds, width: number, height: number, dpr: number): void;
  dispose(): void;
  update(sources: TerrainSources, signal: AbortSignal): Promise<boolean>;
  readonly bytes: number;
}

/** Purely decorative, ordered sprite pass. Gameplay and accessible hit targets
 * stay in the SVG above this canvas. A rejected allocation uses the SVG fallback. */
export async function prepareMapGpu(
  canvas: HTMLCanvasElement,
  sources: TerrainSources,
  signal: AbortSignal,
): Promise<MapGpuDrawing> {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl || gl.isContextLost()) throw Error("Map GPU unavailable");
  const textures: WebGLTexture[] = [],
    buffers: WebGLBuffer[] = [],
    shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null,
    vao: WebGLVertexArrayObject | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    textures.forEach((t) => gl.deleteTexture(t));
    buffers.forEach((b) => gl.deleteBuffer(b));
    shaders.forEach((s) => gl.deleteShader(s));
    gl.deleteProgram(program);
    gl.deleteVertexArray(vao);
  };
  try {
    signal.throwIfAborted();
    let images = [
      ...new Set([sources.ocean.image, ...sources.sprites.map((s) => s.image)]),
    ];
    let indices = new Map(images.map((image, index) => [image, index]));
    let sizes = images.map(imageSize);
    const plan = planMapTextures(sizes, {
      size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      layers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS),
      banks: Math.min(16, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)),
    });
    const shader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw Error("Map shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader) || "Map shader failed");
      return shader;
    };
    program = gl.createProgram();
    if (!program) throw Error("Map program unavailable");
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        `#version 300 es
      in vec2 corner; in vec4 rectangle; in vec4 source; in float bank;
      uniform vec2 factor; uniform vec2 origin; uniform bool ocean;
      uniform vec4 oceanRect; uniform vec4 oceanSource; uniform float oceanBank;
      out vec3 uv; out float opacity; flat out int picture;
      out vec2 world;
      void main() {
        vec4 rect = ocean ? oceanRect : rectangle;
        vec4 src = ocean ? oceanSource : source;
        vec2 position = rect.xy + corner * rect.zw;
        gl_Position = vec4(position * factor + origin, 0., 1.);
        uv = vec3(corner * src.xy, src.z); opacity = src.w;
        picture = int(ocean ? oceanBank : bank); world = position;
      }`,
      ),
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
      precision highp float; precision highp sampler2DArray;
      ${plan.banks.map((_, i) => `uniform sampler2DArray pictures${i};`).join("\n")}
      uniform bool ocean; uniform vec2 waveSize; uniform vec2 waveUV;
      in vec3 uv; in float opacity; flat in int picture; in vec2 world;
      out vec4 color;
      void main() {
        vec2 coords = ocean ? fract(world / waveSize) * waveUV : uv.xy;
        vec2 dx = dFdx(ocean ? world / waveSize * waveUV : uv.xy);
        vec2 dy = dFdy(ocean ? world / waveSize * waveUV : uv.xy);
        ${plan.banks.map((_, i) => `${i ? "else " : ""}if (picture == ${i}) color = textureGrad(pictures${i}, vec3(coords, uv.z), dx, dy) * opacity;`).join("\n")}
        else color = vec4(0.);
      }`,
      ),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || "Map program link failed");
    gl.useProgram(program);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    let slice = performance.now();
    for (const [index, bank] of plan.banks.entries()) {
      signal.throwIfAborted();
      const texture = gl.createTexture();
      if (!texture) throw Error("Map texture unavailable");
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texStorage3D(
        gl.TEXTURE_2D_ARRAY,
        bank.levels,
        gl.RGBA8,
        bank.width,
        bank.height,
        bank.images.length,
      );
      if (gl.getError() !== gl.NO_ERROR)
        throw Error("Map texture allocation failed");
      for (const [layer, id] of bank.images.entries()) {
        gl.texSubImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          0,
          0,
          layer,
          sizes[id].width,
          sizes[id].height,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          images[id],
        );
        if (performance.now() - slice > 4) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          signal.throwIfAborted();
          if (gl.isContextLost()) throw Error("Map GPU context lost");
          slice = performance.now();
        }
      }
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(
        gl.TEXTURE_2D_ARRAY,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
        gl.TEXTURE_2D_ARRAY,
        gl.TEXTURE_WRAP_S,
        gl.CLAMP_TO_EDGE,
      );
      gl.texParameteri(
        gl.TEXTURE_2D_ARRAY,
        gl.TEXTURE_WRAP_T,
        gl.CLAMP_TO_EDGE,
      );
      gl.uniform1i(gl.getUniformLocation(program, `pictures${index}`), index);
      if (gl.getError() !== gl.NO_ERROR)
        throw Error("Map texture upload failed");
    }
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = (
      name: string,
      values: Float32Array,
      count: number,
      divisor: number,
    ) => {
      const buffer = gl.createBuffer();
      if (!buffer) throw Error("Map buffer unavailable");
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      const at = gl.getAttribLocation(program!, name);
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, count, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(at, divisor);
    };
    const coords = new Float32Array(sources.sprites.length * 4),
      sourceData = new Float32Array(sources.sprites.length * 4),
      bankData = new Float32Array(sources.sprites.length);
    for (const [i, sprite] of sources.sprites.entries()) {
      const id = indices.get(sprite.image)!;
      const placement = plan.placements[id],
        bank = plan.banks[placement.bank];
      coords.set([sprite.x, sprite.y, sprite.w, sprite.h], i * 4);
      sourceData.set(
        [
          sizes[id].width / bank.width,
          sizes[id].height / bank.height,
          placement.layer,
          sprite.opacity,
        ],
        i * 4,
      );
      bankData[i] = placement.bank;
    }
    buffer(
      "corner",
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      2,
      0,
    );
    buffer("rectangle", coords, 4, 1);
    buffer("source", sourceData, 4, 1);
    buffer("bank", bankData, 1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program!, name);
    const factor = uniform("factor"),
      origin = uniform("origin"),
      ocean = uniform("ocean"),
      oceanRect = uniform("oceanRect");
    const wave = plan.placements[0],
      waveBank = plan.banks[wave.bank];
    gl.uniform4f(uniform("oceanSource"), 1, 1, wave.layer, 1);
    gl.uniform1f(uniform("oceanBank"), wave.bank);
    gl.uniform2f(uniform("waveSize"), sources.ocean.w, sources.ocean.h);
    gl.uniform2f(
      uniform("waveUV"),
      sizes[0].width / waveBank.width,
      sizes[0].height / waveBank.height,
    );
    if (gl.getError() !== gl.NO_ERROR) throw Error("Map GPU setup failed");
    let count = sources.sprites.length;
    return {
      bytes: plan.bytes,
      dispose,
      async update(next, signal) {
        if (disposed || gl.isContextLost()) return false;
        signal.throwIfAborted();
        const needed = [
          ...new Set([next.ocean.image, ...next.sprites.map((s) => s.image)]),
        ];
        const keep = new Set(needed);
        const available = images.flatMap((image, index) =>
          keep.has(image) ? [] : [index],
        );
        const replacement = new Map<MapImage, number>();
        for (const image of needed) {
          if (indices.has(image)) continue;
          const { width, height } = imageSize(image);
          const at = available.findIndex((id) => {
            const bank = plan.banks[plan.placements[id].bank];
            return bank.width >= width && bank.height >= height;
          });
          if (at < 0) return false;
          replacement.set(image, available.splice(at, 1)[0]);
        }
        // Unchanged terrain, badges and ocean remain resident. Only changed
        // images are uploaded, in the slots vacated by obsolete artwork.
        const changed = new Set<number>();
        let slice = performance.now();
        for (const [image, id] of replacement) {
          const size = imageSize(image),
            placement = plan.placements[id],
            bank = plan.banks[placement.bank];
          gl.activeTexture(gl.TEXTURE0 + placement.bank);
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, textures[placement.bank]);
          // Clear the complete layer so a smaller replacement cannot sample
          // an old image's edge when mipmaps are regenerated. Pixel unpack
          // conversion is valid for DOM images, not the typed-array clear.
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texSubImage3D(
            gl.TEXTURE_2D_ARRAY,
            0,
            0,
            0,
            placement.layer,
            bank.width,
            bank.height,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array(bank.width * bank.height * 4),
          );
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texSubImage3D(
            gl.TEXTURE_2D_ARRAY,
            0,
            0,
            0,
            placement.layer,
            size.width,
            size.height,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image,
          );
          indices.delete(images[id]);
          indices.set(image, id);
          images[id] = image;
          sizes[id] = size;
          changed.add(placement.bank);
          if (performance.now() - slice > 4) {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            signal.throwIfAborted();
            slice = performance.now();
          }
        }
        for (const bank of changed) {
          gl.activeTexture(gl.TEXTURE0 + bank);
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, textures[bank]);
          gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
        }
        signal.throwIfAborted();
        const rectangle = new Float32Array(next.sprites.length * 4),
          source = new Float32Array(next.sprites.length * 4),
          bank = new Float32Array(next.sprites.length);
        for (const [i, sprite] of next.sprites.entries()) {
          const id = indices.get(sprite.image)!,
            place = plan.placements[id],
            texture = plan.banks[place.bank];
          rectangle.set([sprite.x, sprite.y, sprite.w, sprite.h], i * 4);
          source.set(
            [
              sizes[id].width / texture.width,
              sizes[id].height / texture.height,
              place.layer,
              sprite.opacity,
            ],
            i * 4,
          );
          bank[i] = place.bank;
        }
        for (const [index, data] of [rectangle, source, bank].entries()) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers[index + 1]);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        }
        const waveId = indices.get(next.ocean.image)!,
          wave = plan.placements[waveId],
          waveBank = plan.banks[wave.bank];
        gl.uniform4f(uniform("oceanSource"), 1, 1, wave.layer, 1);
        gl.uniform1f(uniform("oceanBank"), wave.bank);
        gl.uniform2f(uniform("waveSize"), next.ocean.w, next.ocean.h);
        gl.uniform2f(
          uniform("waveUV"),
          sizes[waveId].width / waveBank.width,
          sizes[waveId].height / waveBank.height,
        );
        if (gl.getError() !== gl.NO_ERROR || gl.isContextLost())
          throw Error("Map GPU update failed");
        count = next.sprites.length;
        return true;
      },
      draw(view, width, height, dpr) {
        if (disposed || gl.isContextLost()) throw Error("Map GPU unavailable");
        const w = Math.round(width * dpr),
          h = Math.round(height * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const scale = Math.min(width / view.w, height / view.h),
          mx = (width - view.w * scale) / 2,
          my = (height - view.h * scale) / 2;
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(factor, (2 * scale) / width, (-2 * scale) / height);
        gl.uniform2f(
          origin,
          (2 * (mx - view.x * scale)) / width - 1,
          1 - (2 * (my - view.y * scale)) / height,
        );
        gl.uniform1i(ocean, 1);
        gl.uniform4f(
          oceanRect,
          view.x - mx / scale,
          view.y - my / scale,
          width / scale,
          height / scale,
        );
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1);
        gl.uniform1i(ocean, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
