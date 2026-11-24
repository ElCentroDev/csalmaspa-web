import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function addWireframeEdges(mesh, lineMaterial) {
  const edges = new THREE.EdgesGeometry(mesh.geometry)
  const line = new THREE.LineSegments(edges, lineMaterial)
  mesh.add(line)
}

function HeroArchitectureScene({ triggerRef, onFallback }) {
  const mountRef = useRef(null)
  const [failed, setFailed] = useState(() => !isWebGLAvailable())

  useEffect(() => {
    if (failed) {
      if (onFallback) onFallback()
      return
    }
    const container = mountRef.current
    if (!container) return

    const isMobile = window.innerWidth < 768
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      setFailed(true)
      if (onFallback) onFallback()
      return
    }

    const maxDpr = isMobile ? 1.5 : 2
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    let compactViewport = window.innerWidth < 900
    const camera = new THREE.PerspectiveCamera(
      compactViewport ? 42 : 36,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    )

    // Iluminación cinematográfica Industrial Hybrid
    const ambientLight = new THREE.AmbientLight(0xd8dde2, 0.55)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffe4b5, 2.2)
    keyLight.position.set(7, 11, 6)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x747b7d, 1.1)
    rimLight.position.set(-8, 5, -6)
    scene.add(rimLight)

    const bronzeAccentLight = new THREE.PointLight(0xd6a34a, 2.4, 14)
    bronzeAccentLight.position.set(1.2, 2.4, 1.8)
    scene.add(bronzeAccentLight)

    // Grupo maestro con encuadre adaptativo (derecha en desktop, centrado en móvil)
    const worldGroup = new THREE.Group()
    const applyLayoutFraming = (width) => {
      compactViewport = width < 900
      camera.fov = compactViewport ? 42 : 36
      if (compactViewport) {
        worldGroup.position.set(0, -0.3, 0)
      } else {
        worldGroup.position.set(2.55, -0.42, -1.1)
      }
      camera.updateProjectionMatrix()
    }
    applyLayoutFraming(window.innerWidth)
    worldGroup.rotation.y = Math.PI / 16
    scene.add(worldGroup)

    // Materiales compartidos para optimizar draw calls y limpieza
    const matConcrete = new THREE.MeshStandardMaterial({
      color: 0x292d2f,
      roughness: 0.78,
      metalness: 0.12,
    })
    const matSteel = new THREE.MeshStandardMaterial({
      color: 0x4b5154,
      roughness: 0.3,
      metalness: 0.78,
    })
    const matBronze = new THREE.MeshStandardMaterial({
      color: 0xd6a34a,
      roughness: 0.28,
      metalness: 0.85,
    })
    const matSlab = new THREE.MeshStandardMaterial({
      color: 0x232729,
      roughness: 0.55,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92,
    })
    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0x747b7d,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.16,
    })
    const lineBronze = new THREE.LineBasicMaterial({
      color: 0xd6a34a,
      transparent: true,
      opacity: 0.48,
    })
    const lineSteel = new THREE.LineBasicMaterial({
      color: 0x747b7d,
      transparent: true,
      opacity: 0.28,
    })

    // ---------------------------------------------------------
    // ETAPA 1: Terreno y Fundaciones
    // ---------------------------------------------------------
    const foundationGroup = new THREE.Group()
    worldGroup.add(foundationGroup)

    const gridHelper = new THREE.GridHelper(9.5, 16, 0xd6a34a, 0x3a3f42)
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.22
    foundationGroup.add(gridHelper)

    const plinthGeo = new THREE.BoxGeometry(4.4, 0.22, 3.6)
    const plinth = new THREE.Mesh(plinthGeo, matConcrete)
    plinth.position.y = 0.11
    addWireframeEdges(plinth, lineBronze)
    foundationGroup.add(plinth)

    const footingGeo = new THREE.BoxGeometry(0.46, 0.26, 0.46)
    const colPositions = [
      [-1.7, -1.3], [0, -1.3], [1.7, -1.3],
      [-1.7, 0],    [0, 0],    [1.7, 0],
      [-1.7, 1.3],  [0, 1.3],  [1.7, 1.3],
    ]
    colPositions.forEach(([x, z]) => {
      const footing = new THREE.Mesh(footingGeo, matConcrete)
      footing.position.set(x, 0.28, z)
      addWireframeEdges(footing, lineSteel)
      foundationGroup.add(footing)
    })

    // ---------------------------------------------------------
    // ETAPA 2: Estructura Principal (Pilares simétricos 3x3 hasta cubierta)
    // ---------------------------------------------------------
    const structureGroup = new THREE.Group()
    worldGroup.add(structureGroup)

    const pillarGeo = new THREE.BoxGeometry(0.18, 3.68, 0.18)
    colPositions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeo, matSteel)
      pillar.position.set(x, 2.12, z)
      addWireframeEdges(pillar, lineSteel)
      structureGroup.add(pillar)
    })

    // Núcleo estructural vertical simétrico (apoyado desde base hasta cubierta)
    const coreGeo = new THREE.BoxGeometry(1.05, 3.68, 0.85)
    const core = new THREE.Mesh(coreGeo, matConcrete)
    core.position.set(0, 2.12, 0)
    addWireframeEdges(core, lineBronze)
    structureGroup.add(core)

    // ---------------------------------------------------------
    // ETAPA 3: Desarrollo Constructivo (3 Losas simétricas sujetas a pilares)
    // ---------------------------------------------------------
    const slabsGroup = new THREE.Group()
    worldGroup.add(slabsGroup)

    const levels = [
      { y: 1.32, w: 3.9, d: 3.1 },
      { y: 2.38, w: 3.9, d: 3.1 },
      { y: 3.44, w: 3.9, d: 3.1 },
    ]
    levels.forEach((lvl) => {
      const slabGeo = new THREE.BoxGeometry(lvl.w, 0.14, lvl.d)
      const slab = new THREE.Mesh(slabGeo, matSlab)
      slab.position.set(0, lvl.y, 0)
      addWireframeEdges(slab, lineBronze)
      slabsGroup.add(slab)
    })

    // ---------------------------------------------------------
    // ETAPA 4: Terminaciones (Celosías simétricas, Emblema CSALMA y Cubierta apoyada)
    // ---------------------------------------------------------
    const envelopeGroup = new THREE.Group()
    worldGroup.add(envelopeGroup)

    const facadeGlassGeo = new THREE.BoxGeometry(3.6, 2.12, 2.8)
    const facadeGlass = new THREE.Mesh(facadeGlassGeo, matGlass)
    facadeGlass.position.set(0, 2.38, 0)
    envelopeGroup.add(facadeGlass)

    // Celosías arquitectónicas verticales en bronce (ancladas entre losa 1 y losa 3)
    const finGeo = new THREE.BoxGeometry(0.05, 2.12, 0.12)
    for (let i = -3; i <= 3; i += 1) {
      if (i >= -1 && i <= 1) continue
      const fin = new THREE.Mesh(finGeo, matBronze)
      fin.position.set(i * 0.48, 2.38, 1.56)
      envelopeGroup.add(fin)
    }

    // Emblema 3D corporativo CSALMA centrado en la fachada frontal
    const logoGroup = new THREE.Group()
    logoGroup.position.set(0, 2.38, 1.59)
    envelopeGroup.add(logoGroup)

    const plaqueGeo = new THREE.BoxGeometry(1.06, 1.06, 0.05)
    const plaque = new THREE.Mesh(plaqueGeo, matConcrete)
    addWireframeEdges(plaque, lineBronze)
    logoGroup.add(plaque)

    const matLogoCopper = new THREE.MeshStandardMaterial({
      color: 0xd17a36,
      roughness: 0.32,
      metalness: 0.62,
      emissive: 0x3b1b05,
      emissiveIntensity: 0.35,
    })
    const matLogoNavy = new THREE.MeshStandardMaterial({
      color: 0x183961,
      roughness: 0.34,
      metalness: 0.55,
      emissive: 0x081629,
      emissiveIntensity: 0.45,
    })

    const extrudeSettings = {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
    }

    // Brazo superior cobre: estrictamente en y >= 0.03 (cero cruce / cero z-fighting)
    const topShape = new THREE.Shape()
    topShape.moveTo(-0.28, 0.16)
    topShape.lineTo(0.24, 0.38)
    topShape.lineTo(0.30, 0.25)
    topShape.lineTo(-0.04, 0.11)
    topShape.lineTo(0.22, 0.03)
    topShape.lineTo(-0.28, 0.03)
    topShape.closePath()

    const topGeo = new THREE.ExtrudeGeometry(topShape, extrudeSettings)
    const topMesh = new THREE.Mesh(topGeo, matLogoCopper)
    topMesh.position.z = 0.026
    logoGroup.add(topMesh)

    // Brazo inferior azul marino: espejo simétrico exacto en y <= -0.03
    const bottomShape = new THREE.Shape()
    bottomShape.moveTo(0.28, -0.16)
    bottomShape.lineTo(-0.24, -0.38)
    bottomShape.lineTo(-0.30, -0.25)
    bottomShape.lineTo(0.04, -0.11)
    bottomShape.lineTo(-0.22, -0.03)
    bottomShape.lineTo(0.28, -0.03)
    bottomShape.closePath()

    const bottomGeo = new THREE.ExtrudeGeometry(bottomShape, extrudeSettings)
    const bottomMesh = new THREE.Mesh(bottomGeo, matLogoNavy)
    bottomMesh.position.z = 0.026
    logoGroup.add(bottomMesh)

    // Cubierta superior técnica apoyada exactamente sobre pilares y núcleo (y = 4.02)
    const roofGeo = new THREE.BoxGeometry(3.98, 0.14, 3.18)
    const roof = new THREE.Mesh(roofGeo, matSteel)
    roof.position.set(0, 4.02, 0)
    addWireframeEdges(roof, lineBronze)
    envelopeGroup.add(roof)

    // ---------------------------------------------------------
    // ETAPA 5: Overlay CAD de Precisión
    // ---------------------------------------------------------
    const cadGroup = new THREE.Group()
    worldGroup.add(cadGroup)

    const outerFrameGeo = new THREE.BoxGeometry(4.6, 4.3, 3.8)
    const outerEdges = new THREE.EdgesGeometry(outerFrameGeo)
    const outerFrame = new THREE.LineSegments(outerEdges, lineSteel)
    outerFrame.position.set(0, 2.15, 0)
    cadGroup.add(outerFrame)

    // Nodos de cota en bronce
    const nodeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08)
    const nodeCoords = [
      [-2.3, 4.3, 1.9], [2.3, 4.3, 1.9],
      [-2.3, 0.05, 1.9], [2.3, 0.05, -1.9],
    ]
    nodeCoords.forEach(([x, y, z]) => {
      const node = new THREE.Mesh(nodeGeo, matBronze)
      node.position.set(x, y, z)
      cadGroup.add(node)
    })

    // ---------------------------------------------------------
    // Animación inicial y ScrollTrigger con GSAP
    // ---------------------------------------------------------
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      intro
        .from(foundationGroup.position, { y: -0.6, duration: 0.8 }, 0)
        .from(structureGroup.scale, { y: 0.01, duration: 0.9 }, 0.25)
        .from(slabsGroup.position, { y: 0.8, duration: 0.85 }, 0.45)
        .from(envelopeGroup.scale, { x: 0.88, y: 0.88, z: 0.88, duration: 0.85 }, 0.65)
        .from(cadGroup.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.9 }, 0.7)

      if (triggerRef?.current) {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        })
        scrollTl
          .to(worldGroup.rotation, { y: Math.PI / 5, x: 0.04, ease: 'none' }, 0)
      }
    })

    // Seguimiento sutil del puntero (solo desktop)
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
    const handlePointerMove = (e) => {
      if (isMobile) return
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // ResizeObserver limpio con reencuadre responsivo
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          applyLayoutFraming(window.innerWidth)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }
      }
    })
    resizeObserver.observe(container)

    // Pausar loop cuando el hero no está visible en pantalla
    let isVisible = true
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.05 }
    )
    intersectionObserver.observe(container)

    const handleContextLost = (e) => {
      e.preventDefault()
      setFailed(true)
      if (onFallback) onFallback()
    }
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost)

    let animId = 0
    const clock = new THREE.Clock()
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop)
      if (!isVisible) return

      const t = clock.getElapsedTime()
      pointer.x += (pointer.targetX - pointer.x) * 0.05
      pointer.y += (pointer.targetY - pointer.y) * 0.05

      // Respiración arquitectónica sutil + cursor + cámara adaptativa
      const baseY = compactViewport ? -0.3 : -0.42
      worldGroup.position.y = baseY + Math.sin(t * 0.7) * 0.06
      const camBaseX = compactViewport ? 3.2 : 5.0
      const camBaseY = compactViewport ? 3.8 : 4.3
      const camBaseZ = compactViewport ? 11.4 : 9.8
      const lookY = compactViewport ? 1.8 : 1.65

      camera.position.x = camBaseX + (compactViewport ? 0 : pointer.x * 0.55)
      camera.position.y = camBaseY - (compactViewport ? 0 : pointer.y * 0.35)
      camera.position.z = camBaseZ
      camera.lookAt(0, lookY, 0)

      renderer.render(scene, camera)
    }
    renderLoop()

    return () => {
      cancelAnimationFrame(animId)
      ctx.revert()
      window.removeEventListener('pointermove', handlePointerMove)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost)

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
      })
      ;[
        matConcrete, matSteel, matBronze, matSlab, matGlass, matLogoCopper, matLogoNavy,
        lineBronze, lineSteel, gridHelper.material,
      ].forEach((m) => m.dispose())
      renderer.dispose()

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [failed, triggerRef, onFallback])

  if (failed) return null

  return (
    <div
      ref={mountRef}
      className="hero-webgl-canvas"
      aria-hidden="true"
    />
  )
}

export default HeroArchitectureScene
