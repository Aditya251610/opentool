'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

/* ════════════════════════════════════════════════════════
   Cosmos Nebula — WebGL2 shader for hero section

   Swirling space nebula with domain-warped noise in
   cyan / violet / pink. Embedded starfield and mouse-
   reactive energy bloom. Zero Three.js deps.
   ════════════════════════════════════════════════════════ */

const VERT = `#version 300 es
precision highp float;
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 fragColor;

// ─── Noise utilities ───

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash(i + vec2(0, 0)), f - vec2(0, 0)),
        dot(hash(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
    mix(dot(hash(i + vec2(0, 1)), f - vec2(0, 1)),
        dot(hash(i + vec2(1, 1)), f - vec2(1, 1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

// ─── Starfield ───

float stars(vec2 uv, float density) {
  vec2 cell = floor(uv * density);
  vec2 sub  = fract(uv * density);
  float h = hash1(cell);
  vec2  center = vec2(h, fract(h * 127.1));
  float d = length(sub - center);
  float brightness = smoothstep(0.04, 0.0, d) * step(0.92, h);
  // twinkle
  brightness *= 0.6 + 0.4 * sin(u_time * (1.0 + h * 3.0) + h * 6.28);
  return brightness;
}

// ─── Main ───

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.045;

  // Domain warping — three layers for deep swirl
  vec2 q = vec2(
    fbm(p * 1.2 + t * 0.3),
    fbm(p * 1.2 + vec2(5.2, 1.3) + t * 0.25)
  );
  vec2 r = vec2(
    fbm(p + 3.5 * q + vec2(1.7, 9.2) + t * 0.12),
    fbm(p + 3.5 * q + vec2(8.3, 2.8) + t * 0.1)
  );
  vec2 s = vec2(
    fbm(p + 2.0 * r + vec2(3.1, 7.4) + t * 0.08),
    fbm(p + 2.0 * r + vec2(6.7, 4.2) + t * 0.06)
  );
  float f = fbm(p + 3.0 * s);

  // Mouse energy bloom
  vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float mouseD = length(p - m);
  f += 0.2 * exp(-mouseD * mouseD * 6.0);
  // Secondary ring bloom around cursor
  f += 0.06 * smoothstep(0.22, 0.18, mouseD) * smoothstep(0.12, 0.18, mouseD);

  // ─── Space palette — VIVID ───
  vec3 void_   = vec3(0.012, 0.0, 0.055);    // #030014 deep space
  vec3 nebula1 = vec3(0.25, 0.08, 0.50);     // richer violet
  vec3 nebula2 = vec3(0.0, 0.60, 0.75);      // brighter teal-cyan
  vec3 cyan    = vec3(0.0, 0.83, 1.0);       // #00d4ff brand
  vec3 violet  = vec3(0.545, 0.36, 0.965);   // #8b5cf6
  vec3 pink    = vec3(0.925, 0.286, 0.6);    // #ec4899

  // Build nebula color — bolder mix factors for visible nebula clouds
  vec3 color = mix(void_, nebula1, smoothstep(-0.3, 0.1, f));
  color = mix(color, nebula2, smoothstep(0.0, 0.35, f));
  color = mix(color, violet, smoothstep(0.2, 0.45, f) * 0.85);
  color = mix(color, cyan, smoothstep(0.4, 0.65, f) * 0.75);
  // Hot pink at peaks — more visible
  color = mix(color, pink, smoothstep(0.6, 0.85, f) * 0.55);

  // Chromatic wisps — boosted
  float wispR = fbm(p * 3.0 + t * 0.5 + vec2(0.0, 3.0)) * 0.5 + 0.5;
  float wispB = fbm(p * 3.0 + t * 0.4 + vec2(7.0, 0.0)) * 0.5 + 0.5;
  color += pink * wispR * smoothstep(0.2, 0.5, f) * 0.18;
  color += cyan * wispB * smoothstep(0.1, 0.4, f) * 0.15;

  // Energy filaments — brighter veins
  float filament = pow(abs(sin(fbm(p * 8.0 + t) * 6.28)), 16.0);
  filament *= smoothstep(0.2, 0.5, f) * 0.22;
  color += cyan * filament;

  // Starfield (multi-layer for depth)
  float st = 0.0;
  st += stars(uv + vec2(t * 0.01, 0.0), 80.0) * 0.6;
  st += stars(uv + vec2(t * 0.005, t * 0.003), 150.0) * 0.4;
  st += stars(uv + vec2(-t * 0.008, t * 0.002), 250.0) * 0.25;
  color += vec3(0.85, 0.9, 1.0) * st;

  // ─── Vignette — softer to show more nebula at edges ───
  vec2 vc = (uv - 0.5) * vec2(1.0, 1.2);
  float vig = smoothstep(0.0, 0.7, 1.0 - length(vc));

  float alpha = smoothstep(-0.3, 0.2, f) * vig;
  fragColor = vec4(color * vig, alpha * 0.9);
}
`

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(true) // default hidden for SSR-safe
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint)
    check()
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = () => check()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return mobile
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mql.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return reduced
}

function compileShader(gl: WebGL2RenderingContext, src: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseTargetRef = useRef({ x: 0.5, y: 0.5 })
  const mouseSmoothRef = useRef({ x: 0.5, y: 0.5 })
  const rafRef = useRef<number>(0)
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseTargetRef.current.x = e.clientX / window.innerWidth
    mouseTargetRef.current.y = 1.0 - e.clientY / window.innerHeight
  }, [])

  useEffect(() => {
    if (isMobile) return

    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      powerPreference: 'low-power',
    })
    if (!gl) return

    // Compile
    const vs = compileShader(gl, VERT, gl.VERTEX_SHADER)
    const fs = compileShader(gl, FRAG, gl.FRAGMENT_SHADER)
    if (!vs || !fs) return

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(program))
      return
    }

    gl.useProgram(program)

    // Fullscreen quad (triangle strip)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uRes = gl.getUniformLocation(program, 'u_resolution')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')

    // Blending
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Resize handler
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      canvas!.width = canvas!.clientWidth * dpr
      canvas!.height = canvas!.clientHeight * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)

    // Pause when off-screen
    let isVisible = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0 },
    )
    observer.observe(canvas)

    // Animation loop with smooth mouse lerp
    const frozenTime = 8.0
    const start = performance.now()
    const LERP = 0.04 // smooth follow speed

    function render() {
      rafRef.current = requestAnimationFrame(render)
      if (!isVisible) return

      // Smooth mouse interpolation
      mouseSmoothRef.current.x += (mouseTargetRef.current.x - mouseSmoothRef.current.x) * LERP
      mouseSmoothRef.current.y += (mouseTargetRef.current.y - mouseSmoothRef.current.y) * LERP

      const t = reducedMotion ? frozenTime : (performance.now() - start) / 1000
      gl!.uniform1f(uTime, t)
      gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.uniform2f(uMouse, mouseSmoothRef.current.x, mouseSmoothRef.current.y)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [isMobile, reducedMotion, handleMouseMove])

  // Mobile: render nothing (hero-glow CSS provides the base effect)
  if (isMobile) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
