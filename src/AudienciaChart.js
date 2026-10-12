import './style.css'
// AudienciaChart.js - Componente 3D Independiente para Cloudflare
import * as THREE from 'three';
import { Timer } from 'three';

export default {
  async fetch(request, env, ctx) {
    // 1) Configuras los permisos de seguridad (CORS)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2) Respondes a la pregunta de seguridad automática del navegador (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 3) Aquí pones tu código nativo de Three.js (la escena individual)
    const tuCodigoThreeJS = `
      import * as THREE from 'https://cloudflare.com';
      
      export function initEscena(containerId, data) {
        // Tu lógica de Three.js para el globo o la gráfica...
        console.log("Escena cargada de forma individual.");
      }
    `;

    // 4) Envías el código Three.js a la LandingPage con los permisos (CORS) activados
    return new Response(tuCodigoThreeJS, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/javascript; charset=utf-8" // Indica que es un script ejecutable
      }
    });
  }
};


/**
 * Inicializa y renderiza la gráfica 3D de barras cilíndricas animadas.
 * @param {string} containerId - El ID del div contenedor de la Landing Page.
 * @param {Object} data - Los datos extraídos del JSON (data.age_groups).
 */
export function initAudienciaChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Configuración de dimensiones iniciales
  
  let width = container.clientWidth;
  let height = container.clientHeight;

  // ⚡ NUEVO: Validación de seguridad anticaídas / anti-errores WebGL
  // Si el contenedor aún mide 0 (porque el CSS no ha cargado), forzamos un tamaño por defecto
  // o esperamos a que el DOM esté listo para evitar el "Attachment has zero size".
  if (width === 0 || height === 0) {
    width = 500;  // El tamaño por defecto que tienes en tu CSS
    height = 500;
  }


  // 1. Configuración de la Escena, Cámara y Renderizador
  const scene = new THREE.Scene();
  
  // const width = container.clientWidth;
  // const height = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 4, 10);
  camera.lookAt(0, 1.5, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  
  // 2. Iluminación Estilo Estudio
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x00f2fe, 0.8); // Turquesa Neón
  dirLight1.position.set(5, 10, 7);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xe01e69, 0.5); // Rosa Mexicano
  dirLight2.position.set(-5, 2, 2);
  scene.add(dirLight2);

  // ==========================================
  // NUEVO: Variables para Interacción Táctil y Mouse
  // ==========================================
  let isPointerDown = false;
  let previousPointerPosition = { x: 0, y: 0 };
  let targetRotationY = 0;
  let targetRotationX = 0;

  // NUEVO: Contenedor global para poder rotar toda la gráfica junta
  const mainGroup = new THREE.Group();
  scene.add(mainGroup);
  // ==========================================

  // 3. Creación de las Barras 3D basadas en el JSON
  const bars = [];
  const barCount = data.length;
  
  const spacing = 2; // Espacio entre barras
  const startX = -((barCount - 1) * spacing) / 2;

  data.forEach((item, index) => {
    const targetHeight = (item.percentage / 100) * 8; 

    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    geometry.translate(0, 0.5, 0); 

    const material = new THREE.MeshPhysicalMaterial({
      color: index === 1 ? 0x00f2fe : 0xe01e69, 
      roughness: 0.1,
      transmission: 0.6, 
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = startX + index * spacing;
    mesh.position.y = 0;
    
    mesh.scale.set(1, 0.01, 1);
    
    // CAMBIO: Añadir la barra al grupo interactivo en lugar de a la escena directa
    mainGroup.add(mesh);

    bars.push({
      mesh: mesh,
      targetHeight: targetHeight,
      currentHeight: 0.01
    });

    // CAMBIO: Pasamos el 'mainGroup' para enlazar las coordenadas de las etiquetas dinámicamente
    createHtmlLabel(container, mesh, mainGroup, camera, `${item.range} (${item.percentage}%)`);
  });

  // Base sutil reflectante para la gráfica
  const gridGeo = new THREE.PlaneGeometry(10, 10);
  const gridMat = new THREE.MeshPhysicalMaterial({ 
    color: 0x151d30, 
    roughness: 0.5, 
    transparent: true, 
    opacity: 0.2 
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -0.01;
  
  // CAMBIO: Añadir la base al grupo interactivo para que rote junto con las barras
  mainGroup.add(grid);

  // ==========================================
  // NUEVO: Listeners de Eventos de Puntero (Unificados Móvil/Escritorio)
  // ==========================================
  container.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    previousPointerPosition = { x: e.clientX, y: e.clientY };
    container.setPointerCapture(e.pointerId); // Captura el rastro del dedo fuera del div
  });

  container.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;

    const deltaX = e.clientX - previousPointerPosition.x;
    const deltaY = e.clientY - previousPointerPosition.y;

    // Sensibilidad del arrastre (0.007). Modifica este valor si deseas mayor o menor velocidad
    targetRotationY += deltaX * 0.007;
    targetRotationX += deltaY * 0.007;

    // Limitamos la rotación vertical (Eje X) para evitar que la gráfica se ponga de cabeza
    targetRotationX = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, targetRotationX));

    previousPointerPosition = { x: e.clientX, y: e.clientY };
  });

  const stopPointerInteraction = (e) => {
    isPointerDown = false;
    container.releasePointerCapture(e.pointerId);
  };

  container.addEventListener('pointerup', stopPointerInteraction);
  container.addEventListener('pointercancel', stopPointerInteraction); // Manejo por si se interrumpe el gesto táctil
  // ==========================================

  // 4. Bucle de Animación (Render Loop)
  let animationFrameId;
  // const clock = new THREE.Clock();
  const timer = new Timer();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    // const elapsedTime = clock.getElapsedTime();
    const elapsedTime = timer.getDelta();

    bars.forEach(bar => {
      if (bar.currentHeight < bar.targetHeight) {
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.08;
        bar.mesh.scale.y = bar.currentHeight;
      }
      // Micro-rotación interna de cada cilindro (mantiene el efecto estético original)
      bar.mesh.rotation.y = elapsedTime * 0.2;
    });

    // ==========================================
    // NUEVO: Interpolación de suavizado (LERP) y rotación automática pasiva
    // ==========================================
    mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.1;
    mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.1;

    // Rotación pasiva continua si el usuario no está tocando la pantalla
    if (!isPointerDown) {
      targetRotationY += 0.002;
    }
    // ==========================================

    renderer.render(scene, camera);
  }

  animate();

  // 5. Manejo del Responsive Design
const handleResize = () => {
    // Al redimensionar o cuando el CSS termine de aplicar, Three.js tomará el tamaño correcto
    const w = container.clientWidth || 500;
    const h = container.clientHeight || 500;
    
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('resize', handleResize);
  // NUEVO EXTRA: Forzar un pequeño ajuste de tamaño un milisegundo después 
  // para asegurar que se adapte perfectamente si el CSS tardó en renderizar
  setTimeout(handleResize, 50);

  // Retornar método de limpieza para liberar memoria si el Observer destruye componentes
  return () => {
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animationFrameId);
    renderer.dispose();
    scene.clear();
  };
}

// ==========================================
// CAMBIO: Función auxiliar optimizada para calcular etiquetas con grupos en rotación
// ==========================================
function createHtmlLabel(container, mesh, mainGroup, camera, text) {
  const label = document.createElement('div');
  label.style.position = 'absolute';
  label.style.color = '#9ca3af';
  label.style.fontFamily = 'sans-serif';
  label.style.fontSize = '0.75rem';
  label.style.fontWeight = 'bold';
  label.style.transform = 'translate(-50%, -100%)';
  label.style.pointerEvents = 'none';
  label.innerText = text;
  container.appendChild(label);

  function updateLabelPosition() {
    // Calculamos la posición del mundo considerando la matriz de transformación del grupo rotado
    const vector = new THREE.Vector3(mesh.position.x, mesh.scale.y + 0.3, mesh.position.z);
    vector.applyMatrix4(mainGroup.matrixWorld); 
    
    vector.project(camera);
    const x = (vector.x * .5 + .5) * container.clientWidth;
    const y = (-(vector.y * .5) + .5) * container.clientHeight;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    requestAnimationFrame(updateLabelPosition);
  }
  updateLabelPosition();
}
