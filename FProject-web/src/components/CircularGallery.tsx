import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef, useState } from 'react';

type GL = Renderer['gl'];

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: number;
  return function (this: any, ...args: Parameters<T>) {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: any): void {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(
  gl: GL,
  text: string,
  font: string = 'bold 30px monospace',
  color: string = 'black'
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context');

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.2);

  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;

  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

interface TitleProps {
  gl: GL;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor?: string;
  font?: string;
}

class Title {
  gl: GL;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }: TitleProps) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeightScaled = this.plane.scale.y * 0.15;
    const textWidthScaled = textHeightScaled * aspect;
    this.mesh.scale.set(textWidthScaled, textHeightScaled, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeightScaled * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

interface ScreenSize {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface MediaProps {
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius?: number;
  font?: string;
}

class Media {
  extra: number = 0;
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font?: string;
  program!: Program;
  plane!: Mesh;
  title!: Title;
  scale!: number;
  // Base size state for hover scaling.
  baseScaleX: number = 0;
  baseScaleY: number = 0;
  scaleFactor: number = 1;
  targetScale: number = 1;
  padding!: number;
  width!: number;
  widthTotal!: number;
  x!: number;
  speed: number = 0;
  isBefore: boolean = false;
  isAfter: boolean = false;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font
  }: MediaProps) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: true
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }

  // Set target scale based on hover state.
  setHover(isHover: boolean) {
    this.targetScale = isHover ? 1.12 : 1;
  }

  // Ease scale toward target for smooth zoom.
  applyScale() {
    this.scaleFactor = lerp(this.scaleFactor, this.targetScale, 0.09);
    this.plane.scale.x = this.baseScaleX * this.scaleFactor;
    this.plane.scale.y = this.baseScaleY * this.scaleFactor;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
  }

  // Hit-test against the plane in world space.
  isPointInside(x: number, y: number) {
    const halfW = this.plane.scale.x / 2;
    const halfH = this.plane.scale.y / 2;
    return Math.abs(x - this.plane.position.x) <= halfW && Math.abs(y - this.plane.position.y) <= halfH;
  }

  // Tight hit-test to separate image vs background clicks.
  isPointInsideTight(x: number, y: number, scale: number = 0.85) {
    const halfW = (this.plane.scale.x / 2) * scale;
    const halfH = (this.plane.scale.y / 2) * scale;
    return Math.abs(x - this.plane.position.x) <= halfW && Math.abs(y - this.plane.position.y) <= halfH;
  }

  update(scroll: { current: number; last: number }, direction: 'right' | 'left') {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    // Use base width for loop checks regardless of hover scale.
    const planeOffset = this.baseScaleX / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      const uniforms = this.plane?.program?.uniforms as Record<string, { value: unknown }> | undefined;
      if (uniforms?.uViewportSizes) {
        uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    this.scale = this.screen.height / 1500;
    // Cache base size so hover scale can be applied on top.
    this.baseScaleY = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.baseScaleX = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.plane.scale.y = this.baseScaleY;
    this.plane.scale.x = this.baseScaleX;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    // Use base width for spacing calculations.
    this.width = this.baseScaleX + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

interface AppConfig {
  items?: { image: string; text: string }[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  // Pass selected item data to the caller.
  onSelect?: (item: { image: string; text: string }) => void;
}

class App {
  // Pause auto-scroll while hovered.
  isPaused = false;
  // Auto-scroll direction (-1 left, 1 right, 0 stop).
  autoScrollDirection: -1 | 0 | 1 = -1;
  // Last direction to restore after overlay closes.
  lastAutoScrollDirection: -1 | 1 = -1;
  container: HTMLElement;
  scrollSpeed: number;
  scroll: {
    ease: number;
    current: number;
    target: number;
    last: number;
    position?: number;
  };
  onCheckDebounce: (...args: any[]) => void;
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  mediasImages: { image: string; text: string }[] = [];
  screen!: { width: number; height: number };
  viewport!: { width: number; height: number };
  raf: number = 0;
  // Pass selected item data to the caller.
  onSelect?: (item: { image: string; text: string }) => void;

  boundOnResize!: () => void;
  boundOnWheel!: (e: Event) => void;
  boundOnTouchDown!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchMove!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchUp!: () => void;
  // Pointer hover listener.
  boundOnPointerMove!: (e: PointerEvent) => void;
  boundOnPointerLeave!: () => void;
  // Click selection listener.
  boundOnClick!: (e: MouseEvent) => void;
  // Hover enter/leave listeners.
  boundOnMouseEnter!: () => void;
  boundOnMouseLeave!: () => void;

  isDown: boolean = false;
  start: number = 0;
  // Pointer state in container space.
  pointer = { x: 0, y: 0, active: false };
  // Distance to ignore clicks after dragging.
  dragDistance: number = 0;
  lastDragX: number = 0;

  constructor(
    container: HTMLElement,
    {
      items,
      bend = 1,
      textColor = '#ffffff',
      borderRadius = 0,
      font = 'bold 30px Figtree',
      scrollSpeed = 2,
      scrollEase = 0.05,
      onSelect
    }: AppConfig
  ) {
    document.documentElement.classList.remove('no-js');
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
    // Store selection callback.
    this.onSelect = onSelect;
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.renderer.gl.canvas as HTMLCanvasElement);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  }

  createMedias(
    items: { image: string; text: string }[] | undefined,
    bend: number = 1,
    textColor: string,
    borderRadius: number,
    font: string
  ) {
    const defaultItems = [
      {
        image: `https://picsum.photos/seed/1/800/600?grayscale`,
        text: 'Bridge'
      },
      {
        image: `https://picsum.photos/seed/2/800/600?grayscale`,
        text: 'Desk Setup'
      },
      {
        image: `https://picsum.photos/seed/3/800/600?grayscale`,
        text: 'Waterfall'
      },
      {
        image: `https://picsum.photos/seed/4/800/600?grayscale`,
        text: 'Strawberries'
      },
      {
        image: `https://picsum.photos/seed/5/800/600?grayscale`,
        text: 'Deep Diving'
      },
      {
        image: `https://picsum.photos/seed/16/800/600?grayscale`,
        text: 'Train Track'
      },
      {
        image: `https://picsum.photos/seed/17/800/600?grayscale`,
        text: 'Santorini'
      },
      {
        image: `https://picsum.photos/seed/8/800/600?grayscale`,
        text: 'Blurry Lights'
      },
      {
        image: `https://picsum.photos/seed/9/800/600?grayscale`,
        text: 'New York'
      },
      {
        image: `https://picsum.photos/seed/10/800/600?grayscale`,
        text: 'Good Boy'
      },
      {
        image: `https://picsum.photos/seed/21/800/600?grayscale`,
        text: 'Coastline'
      },
      {
        image: `https://picsum.photos/seed/12/800/600?grayscale`,
        text: 'Palm Trees'
      }
    ];
    // 빈 배열이 전달되면 빈 배열 사용, undefined나 null이면 기본 이미지 사용
    const galleryItems = (items !== undefined && items.length === 0) ? [] : (items && items.length ? items : defaultItems);
    // 무한 스크롤을 위해 배열을 복제 (최소 6개 이상일 때만)
    this.mediasImages = galleryItems.length >= 6 ? galleryItems.concat(galleryItems) : galleryItems;
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font
      });
    });
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = 'touches' in e ? e.touches[0].clientX : e.clientX;
    // Reset drag distance on press.
    this.dragDistance = 0;
    this.lastDragX = this.start;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position ?? 0) + distance;
    // Accumulate drag distance while moving.
    this.dragDistance += Math.abs(x - this.lastDragX);
    this.lastDragX = x;
  }

  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }

  onWheel(e: Event) {
    const wheelEvent = e as WheelEvent;
    const delta = wheelEvent.deltaY || (wheelEvent as any).wheelDelta || (wheelEvent as any).detail;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  // Track pointer position relative to the container.
  onPointerMove(e: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    this.pointer.active = true;
  }

  // Clear hover when leaving the container.
  onPointerLeave() {
    this.pointer.active = false;
  }

  // Convert container coords to world space for hit tests.
  getPointerWorld() {
    if (!this.pointer.active) return null;
    const x = (this.pointer.x / this.screen.width - 0.5) * this.viewport.width;
    const y = (0.5 - this.pointer.y / this.screen.height) * this.viewport.height;
    return { x, y };
  }

  // Convert click coords to world space even without move.
  getPointerWorldFromClient(clientX: number, clientY: number) {
    const rect = this.container.getBoundingClientRect();
    const x = ((clientX - rect.left) / this.screen.width - 0.5) * this.viewport.width;
    const y = (0.5 - (clientY - rect.top) / this.screen.height) * this.viewport.height;
    return { x, y };
  }

  // Pick the closest media under the pointer.
  pickMediaAt(x: number, y: number): Media | null {
    if (!this.medias || this.medias.length === 0) return null;
    let picked: Media | null = null;
    let best = Number.POSITIVE_INFINITY;
    this.medias.forEach(media => {
      // Tight hit-test to separate image vs background clicks.
      if (!media.isPointInsideTight(x, y)) return;
      const distance = Math.abs(x - media.plane.position.x);
      if (distance < best) {
        best = distance;
        picked = media;
      }
    });
    return picked;
  }

  // Handle click selection for overlay.
  onClick(e: MouseEvent) {
    if (this.dragDistance > 8) return;
    // Convert click coords to world space even without move.
    const pointerWorld = this.getPointerWorldFromClient(e.clientX, e.clientY);
    // Pick the closest media under the pointer.
    const picked = this.pickMediaAt(pointerWorld.x, pointerWorld.y);
    if (picked && this.onSelect) {
      this.autoScrollDirection = 0;
      this.onSelect({ image: picked.image, text: picked.text });
      return;
    }
  }

  // Restore auto-scroll after overlay closes.
  resumeAutoScroll() {
    this.autoScrollDirection = this.lastAutoScrollDirection;
    // Pause auto-scroll while hovered.
    this.isPaused = false;
  }

  // Set auto-scroll direction from buttons.
  setAutoScrollDirection(direction: -1 | 1) {
    this.autoScrollDirection = direction;
    this.lastAutoScrollDirection = direction;
  }

  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    // Convert container coords to world space for hit tests.
    const pointerWorld = this.getPointerWorld();
    // Only auto-scroll when not paused.
    if (!this.isPaused) {
      if (this.autoScrollDirection !== 0) {
        this.scroll.target += 0.08 * -this.autoScrollDirection;  // 0.02 → 0.01 (느리게)
      }
    }
    if (this.medias) {
      this.medias.forEach(media => {
        media.update(this.scroll, direction);
        // Hit-test against the plane in world space.
        const isHover = pointerWorld ? media.isPointInside(pointerWorld.x, pointerWorld.y) : false;
        // Set target scale based on hover state.
        media.setHover(isHover);
        // Ease scale toward target for smooth zoom.
        media.applyScale();
      });
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }

  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerLeave = this.onPointerLeave.bind(this);
    this.boundOnClick = this.onClick.bind(this);
    this.boundOnMouseEnter = () => {
      this.isPaused = true;
    };
    this.boundOnMouseLeave = () => {
      // Pause auto-scroll while hovered.
      this.isPaused = false;
    };
    window.addEventListener('resize', this.boundOnResize);
    this.container.addEventListener('mousewheel', this.boundOnWheel);
    this.container.addEventListener('wheel', this.boundOnWheel);
    this.container.addEventListener('mousedown', this.boundOnTouchDown);
    this.container.addEventListener('mousemove', this.boundOnTouchMove);
    this.container.addEventListener('mouseup', this.boundOnTouchUp);
    this.container.addEventListener('touchstart', this.boundOnTouchDown);
    this.container.addEventListener('touchmove', this.boundOnTouchMove);
    this.container.addEventListener('touchend', this.boundOnTouchUp);
    // Pointer events are scoped to the container.
    this.container.addEventListener('pointermove', this.boundOnPointerMove);
    this.container.addEventListener('pointerleave', this.boundOnPointerLeave);
    // Click to open overlay.
    this.container.addEventListener('click', this.boundOnClick);
    // Pause/resume auto-scroll on hover.
    this.container.addEventListener('mouseenter', this.boundOnMouseEnter);
    this.container.addEventListener('mouseleave', this.boundOnMouseLeave);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundOnResize);
    this.container.removeEventListener('mousewheel', this.boundOnWheel);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    this.container.removeEventListener('mousedown', this.boundOnTouchDown);
    this.container.removeEventListener('mousemove', this.boundOnTouchMove);
    this.container.removeEventListener('mouseup', this.boundOnTouchUp);
    this.container.removeEventListener('touchstart', this.boundOnTouchDown);
    this.container.removeEventListener('touchmove', this.boundOnTouchMove);
    this.container.removeEventListener('touchend', this.boundOnTouchUp);
    this.container.removeEventListener('pointermove', this.boundOnPointerMove);
    this.container.removeEventListener('pointerleave', this.boundOnPointerLeave);
    this.container.removeEventListener('click', this.boundOnClick);
    this.container.removeEventListener('mouseenter', this.boundOnMouseEnter);
    this.container.removeEventListener('mouseleave', this.boundOnMouseLeave);
    if (this.renderer && this.renderer.gl) {
      // Cast canvas to avoid OffscreenCanvas typing issues.
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }
}

interface CircularGalleryProps {
  items?: { image: string; text: string }[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}

export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  font = 'bold 30px Figtree',
  scrollSpeed = 2,
  scrollEase = 0.05
}: CircularGalleryProps) {
  // Container for OGL canvas.
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep App instance to control auto-scroll.
  const appRef = useRef<App | null>(null);
  // Selected image shown in overlay.
  const [selected, setSelected] = useState<{ image: string; text: string } | null>(null);
  // Overlay open/close animation state.
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new App(containerRef.current, {
      items,
      bend,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
      onSelect: item => setSelected(item)
    });
    appRef.current = app;
    return () => {
      appRef.current = null;
      app.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);

  useEffect(() => {
    if (!selected) {
      setIsOverlayOpen(false);
      return;
    }
    // Defer open to trigger CSS transition.
    const id = window.requestAnimationFrame(() => setIsOverlayOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, [selected]);

  // Close overlay and resume auto-scroll.
  const closeOverlay = () => {
    setIsOverlayOpen(false);
    setSelected(null);
    // Restore auto-scroll after overlay closes.
    appRef.current?.resumeAutoScroll();
  };

  return (
    <div className="relative h-full w-full">
      {/* 왼쪽 방향 버튼 */}
      <div className="absolute left-4 top-4 z-20">
        <button
          type="button"
          className="h-12 w-12"
          // Set auto-scroll direction from buttons.
          onClick={() => appRef.current?.setAutoScrollDirection(-1)}
          aria-label="Scroll left"
        >
          <img src="/left.png" alt="Left" className="h-full w-full" />
        </button>
      </div>
      {/* 오른쪽 방향 버튼 */}
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          className="h-12 w-12"
          // Set auto-scroll direction from buttons.
          onClick={() => appRef.current?.setAutoScrollDirection(1)}
          aria-label="Scroll right"
        >
          <img src="/right.png" alt="Right" className="h-full w-full" />
        </button>
      </div>
      <div className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing" ref={containerRef} />
      {selected && (
        <>
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 transition-opacity duration-500 ease-out ${
              isOverlayOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={closeOverlay}
          >
            <div
              className={`relative max-h-[85vh] w-full max-w-4xl origin-center overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl transition-transform duration-500 ease-out transform-gpu ${
                isOverlayOpen ? 'scale-100' : 'scale-90'
              }`}
              onClick={event => event.stopPropagation()}
            >
              <img src={selected.image} alt={selected.text} className="h-full w-full object-cover" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}