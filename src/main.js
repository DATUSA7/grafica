    import { initAudienciaChart } from '/src/AudienciaChart.js';

    async function cargarYGraficar() {
      try {
        // 1. Llamamos al archivo JSON local usando fetch nativo
        const response = await fetch('./metrics.json');
        const data = await response.json();
        
        // 2. Extraemos el arreglo de edades y lo mandamos a tu función 3D
        initAudienciaChart('canvas-age', data.age_groups);

      } catch (error) {
        console.error("Error al leer el archivo JSON local:", error);
      }
    }

    // Ejecutamos la función al cargar la página
    cargarYGraficar();
