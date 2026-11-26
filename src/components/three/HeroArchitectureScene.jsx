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

function addWireframeEdges(mesh, lineMaterial, sharedEdges) {
  const edges = sharedEdges || new THREE.EdgesGeometry(mesh.geometry)
  const line = new THREE.LineSegments(edges, lineMaterial)
  mesh.add(line)
  return edges
}

function HeroArchitectureScene({ triggerRef, onFallback }) {
  const mountRef = useRef(null)
  const onFallbackRef = useRef(onFallback)
  onFallbackRef.current = onFallback
  const [failed, setFailed] = useState(() => !isWebGLAvailable())

  useEffect(() => {
    if (failed) {
      if (onFallbackRef.current) onFallbackRef.current()
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
      if (onFallbackRef.current) onFallbackRef.current()
      return
    }

    const maxDpr = isMobile ? 1 : 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.22
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x17191a, 0.042)

    let compactViewport = window.innerWidth < 900
    const camera = new THREE.PerspectiveCamera(
      compactViewport ? 42 : 35,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    )

    // Iluminación arquitectónica de estudio
    const ambientLight = new THREE.AmbientLight(0xdce2e8, 0.62)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffe6bd, 2.35)
    keyLight.position.set(7, 12, 7)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x7c868a, 1.25)
    rimLight.position.set(-8, 6, -6)
    scene.add(rimLight)

    const bronzeAccentLight = new THREE.PointLight(0xd6a34a, 2.8, 15)
    bronzeAccentLight.position.set(1.4, 2.6, 2.8)
    scene.add(bronzeAccentLight)

    // Grupo maestro con encuadre adaptativo
    const worldGroup = new THREE.Group()
    const applyLayoutFraming = (width) => {
      compactViewport = width < 900
      camera.fov = compactViewport ? 42 : 35
      if (compactViewport) {
        worldGroup.position.set(0, -0.32, 0)
      } else {
        worldGroup.position.set(2.75, -0.15, -1.2)
      }
      camera.updateProjectionMatrix()
    }
    applyLayoutFraming(window.innerWidth)
    worldGroup.rotation.y = Math.PI / 15
    scene.add(worldGroup)

    // Materiales compartidos
    const matConcrete = new THREE.MeshStandardMaterial({
      color: 0x262a2c,
      roughness: 0.78,
      metalness: 0.14,
    })
    const matSteel = new THREE.MeshStandardMaterial({
      color: 0x4c5357,
      roughness: 0.28,
      metalness: 0.82,
    })
    const matBronze = new THREE.MeshStandardMaterial({
      color: 0xd6a34a,
      roughness: 0.25,
      metalness: 0.88,
    })
    const matSlab = new THREE.MeshStandardMaterial({
      color: 0x202426,
      roughness: 0.52,
      metalness: 0.38,
      transparent: true,
      opacity: 0.94,
    })
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x7c868a,
      roughness: 0.18,
      metalness: 0.28,
      transparent: true,
      opacity: 0.16,
    })
    const lineBronze = new THREE.LineBasicMaterial({
      color: 0xd6a34a,
      transparent: true,
      opacity: 0.52,
    })
    const lineSteel = new THREE.LineBasicMaterial({
      color: 0x828b8e,
      transparent: true,
      opacity: 0.3,
    })

    // ---------------------------------------------------------
    // ETAPA 1: Terreno topográfico y Fundaciones escalonadas
    // ---------------------------------------------------------
    const foundationGroup = new THREE.Group()
    worldGroup.add(foundationGroup)

    const gridHelper = new THREE.GridHelper(11, 14, 0xd6a34a, 0x383e42)
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.24
    foundationGroup.add(gridHelper)

    const subPlinthGeo = new THREE.BoxGeometry(4.65, 0.1, 3.85)
    const subPlinth = new THREE.Mesh(subPlinthGeo, matConcrete)
    subPlinth.position.y = 0.05
    addWireframeEdges(subPlinth, lineSteel)
    foundationGroup.add(subPlinth)

    const plinthGeo = new THREE.BoxGeometry(4.35, 0.2, 3.55)
    const plinth = new THREE.Mesh(plinthGeo, matConcrete)
    plinth.position.y = 0.2
    addWireframeEdges(plinth, lineBronze)
    foundationGroup.add(plinth)

    const footingGeo = new THREE.BoxGeometry(0.46, 0.22, 0.46)
    const colPositions = [
      [-1.7, -1.3], [0, -1.3], [1.7, -1.3],
      [-1.7, 0],    [0, 0],    [1.7, 0],
      [-1.7, 1.3],  [0, 1.3],  [1.7, 1.3],
    ]
    const footingEdges = new THREE.EdgesGeometry(footingGeo)
    colPositions.forEach(([x, z]) => {
      const footing = new THREE.Mesh(footingGeo, matConcrete)
      footing.position.set(x, 0.36, z)
      addWireframeEdges(footing, lineSteel, footingEdges)
      foundationGroup.add(footing)
    })

    // ---------------------------------------------------------
    // ETAPA 2: Estructura Principal (Pilares 3x3 + Vigas + Arriostramiento sísmico)
    // ---------------------------------------------------------
    const structureGroup = new THREE.Group()
    worldGroup.add(structureGroup)

    const pillarGeo = new THREE.BoxGeometry(0.18, 3.68, 0.18)
    const pillarEdges = new THREE.EdgesGeometry(pillarGeo)
    colPositions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeo, matSteel)
      pillar.position.set(x, 2.18, z)
      addWireframeEdges(pillar, lineSteel, pillarEdges)
      structureGroup.add(pillar)
    })

    // Núcleo estructural central
    const coreGeo = new THREE.BoxGeometry(1.05, 3.68, 0.85)
    const core = new THREE.Mesh(coreGeo, matConcrete)
    core.position.set(0, 2.18, 0)
    addWireframeEdges(core, lineBronze)
    structureGroup.add(core)

    // Arriostramientos diagonales sísmicos (cruz de San Andrés en acero sobre caras laterales)
    const bracePoints = [
      [new THREE.Vector3(1.7, 1.38, -1.3), new THREE.Vector3(1.7, 2.44, 0)],
      [new THREE.Vector3(1.7, 2.44, -1.3), new THREE.Vector3(1.7, 1.38, 0)],
      [new THREE.Vector3(1.7, 2.44, 0), new THREE.Vector3(1.7, 3.50, 1.3)],
      [new THREE.Vector3(1.7, 3.50, 0), new THREE.Vector3(1.7, 2.44, 1.3)],
    ]
    bracePoints.forEach(([p1, p2]) => {
      const braceGeo = new THREE.BufferGeometry().setFromPoints([p1, p2])
      const braceLine = new THREE.Line(braceGeo, lineBronze)
      structureGroup.add(braceLine)
    })

    // ---------------------------------------------------------
    // ETAPA 3: Losas y Vigas Perimetrales
    // ---------------------------------------------------------
    const slabsGroup = new THREE.Group()
    worldGroup.add(slabsGroup)

    const levels = [
      { y: 1.38, w: 3.92, d: 3.12 },
      { y: 2.44, w: 3.92, d: 3.12 },
      { y: 3.50, w: 3.92, d: 3.12 },
    ]
    const beamFrontGeo = new THREE.BoxGeometry(3.96, 0.08, 0.08)
    const beamSideGeo = new THREE.BoxGeometry(0.08, 0.08, 3.16)

    levels.forEach((lvl) => {
      const slabGeo = new THREE.BoxGeometry(lvl.w, 0.14, lvl.d)
      const slab = new THREE.Mesh(slabGeo, matSlab)
      slab.position.set(0, lvl.y, 0)
      addWireframeEdges(slab, lineBronze)
      slabsGroup.add(slab)

      // Vigas metálicas de borde bajo cada losa
      const beamFront = new THREE.Mesh(beamFrontGeo, matSteel)
      beamFront.position.set(0, lvl.y - 0.1, lvl.d / 2 - 0.04)
      slabsGroup.add(beamFront)

      const beamRight = new THREE.Mesh(beamSideGeo, matSteel)
      beamRight.position.set(lvl.w / 2 - 0.04, lvl.y - 0.1, 0)
      slabsGroup.add(beamRight)
    })

    // ---------------------------------------------------------
    // ETAPA 4: Envolvente, Celosías Bronce, Logo CSALMA y Cubierta
    // ---------------------------------------------------------
    const envelopeGroup = new THREE.Group()
    worldGroup.add(envelopeGroup)

    const facadeGlassGeo = new THREE.BoxGeometry(3.6, 2.12, 2.8)
    const facadeGlass = new THREE.Mesh(facadeGlassGeo, matGlass)
    facadeGlass.position.set(0, 2.44, 0)
    envelopeGroup.add(facadeGlass)

    const finGeo = new THREE.BoxGeometry(0.055, 2.12, 0.13)
    for (let i = -3; i <= 3; i += 1) {
      if (i >= -1 && i <= 1) continue
      const fin = new THREE.Mesh(finGeo, matBronze)
      fin.position.set(i * 0.48, 2.44, 1.56)
      envelopeGroup.add(fin)
    }

    // Emblema 3D corporativo CSALMA centrado en la fachada frontal
    const logoGroup = new THREE.Group()
    logoGroup.position.set(0, 2.44, 1.59)
    envelopeGroup.add(logoGroup)

    const plaqueGeo = new THREE.BoxGeometry(1.06, 1.06, 0.05)
    const plaque = new THREE.Mesh(plaqueGeo, matConcrete)
    addWireframeEdges(plaque, lineBronze)
    logoGroup.add(plaque)

    const matLogoCopper = new THREE.MeshStandardMaterial({
      color: 0xd67c35,
      roughness: 0.28,
      metalness: 0.65,
      emissive: 0x3b1b05,
      emissiveIntensity: 0.4,
    })
    const matLogoNavy = new THREE.MeshStandardMaterial({
      color: 0x1a3f6b,
      roughness: 0.3,
      metalness: 0.58,
      emissive: 0x081629,
      emissiveIntensity: 0.48,
    })

    const extrudeSettings = {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 1,
    }

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

    // Cubierta superior técnica apoyada sobre pilares y núcleo (y = 4.08)
    const roofGeo = new THREE.BoxGeometry(4.0, 0.14, 3.2)
    const roof = new THREE.Mesh(roofGeo, matSteel)
    roof.position.set(0, 4.08, 0)
    addWireframeEdges(roof, lineBronze)
    envelopeGroup.add(roof)

    // ---------------------------------------------------------
    // ETAPA 5: Overlay CAD de Precisión
    // ---------------------------------------------------------
    const cadGroup = new THREE.Group()
    worldGroup.add(cadGroup)

    const outerFrameGeo = new THREE.BoxGeometry(4.65, 4.35, 3.85)
    const outerEdges = new THREE.EdgesGeometry(outerFrameGeo)
    const outerFrame = new THREE.LineSegments(outerEdges, lineSteel)
    outerFrame.position.set(0, 2.2, 0)
    cadGroup.add(outerFrame)

    const nodeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08)
    const nodeCoords = [
      [-2.32, 4.37, 1.92], [2.32, 4.37, 1.92],
      [-2.32, 0.05, 1.92], [2.32, 0.05, -1.92],
    ]
    nodeCoords.forEach(([x, y, z]) => {
      const node = new THREE.Mesh(nodeGeo, matBronze)
      node.position.set(x, y, z)
      cadGroup.add(node)
    })

    // Animación inicial y ScrollTrigger limpio (sin desarmar pisos)
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      intro
        .from(foundationGroup.position, { y: -0.35, duration: 0.45 }, 0)
        .from(structureGroup.scale, { y: 0.05, duration: 0.5 }, 0.08)
        .from(slabsGroup.position, { y: 0.45, duration: 0.45 }, 0.14)
        .from(envelopeGroup.scale, { x: 0.92, y: 0.92, z: 0.92, duration: 0.45 }, 0.2)
        .from(cadGroup.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.45 }, 0.22)

      if (triggerRef?.current) {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        })
        scrollTl.to(worldGroup.rotation, { y: Math.PI / 5, x: 0.04, ease: 'none' }, 0)
      }
    })

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
    const handlePointerMove = (e) => {
      if (isMobile) return
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

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

    let isVisible = true
    const checkViewportVisibility = () => {
      const rect = container.getBoundingClientRect()
      isVisible = rect.bottom > -80 && rect.top < window.innerHeight + 80
    }
    checkViewportVisibility()

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { rootMargin: '80px 0px', threshold: 0.01 }
    )
    intersectionObserver.observe(container)

    const rafRefreshId = requestAnimationFrame(() => {
      checkViewportVisibility()
      ScrollTrigger.refresh()
    })

    const handleContextLost = (e) => {
      e.preventDefault()
      setFailed(true)
      if (onFallbackRef.current) onFallbackRef.current()
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

      const baseY = compactViewport ? -0.32 : -0.15
      worldGroup.position.y = baseY + Math.sin(t * 0.7) * 0.05
      const camBaseX = compactViewport ? 3.2 : 4.9
      const camBaseY = compactViewport ? 3.8 : 4.45
      const camBaseZ = compactViewport ? 11.4 : 10.5
      const lookY = compactViewport ? 1.8 : 1.95

      camera.position.x = camBaseX + (compactViewport ? 0 : pointer.x * 0.55)
      camera.position.y = camBaseY - (compactViewport ? 0 : pointer.y * 0.35)
      camera.position.z = camBaseZ
      camera.lookAt(0, lookY, 0)

      renderer.render(scene, camera)
    }
    renderLoop()

    return () => {
      cancelAnimationFrame(animId)
      cancelAnimationFrame(rafRefreshId)
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
      renderer.forceContextLoss()

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [failed, triggerRef])

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
