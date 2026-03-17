import { useState, useEffect, useCallback, RefObject } from 'react';
import type { IVehiculoView } from '@/types/types';

const DEFAULT_CYLINDER_LAYOUT = {
  baseTop: -0.2,
  baseLeft: 0.2,
  maxCylindersPerLine: 8,
  blockOffsetHorizontal: 0.22,
  blockOffsetVertical: 0.01,
};

// Configuración base para diferentes modelos de vehículos
const VEHICLE_CONFIGS = {
  "hyundai_porter": { baseWidth: 247, baseHeight: 173, aspectRatio: 1.427, m2: 4.2, pesoMax: 1000, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "ford_ranger": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 5.3, pesoMax: 1200, cylinderLayout: {
    baseTop: -0.30,
    baseLeft: 0.5,
    maxCylindersPerLine: 6,
    blockOffsetHorizontal: 0.25,
    blockOffsetVertical: 0.02
  } },
  "mitsubishi_l200": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 4.7, pesoMax: 1100, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "volkswagen_constellation": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 12, pesoMax: 6000, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "volkswagen_delivery": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 10, pesoMax: 4500, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "kia_frontier": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 4.5, pesoMax: 1150, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "ford_transit": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 9, pesoMax: 3500, cylinderLayout: DEFAULT_CYLINDER_LAYOUT },
  "default": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 5, pesoMax: 1500, cylinderLayout: DEFAULT_CYLINDER_LAYOUT }
};

// Posiciones base para cilindros (como porcentajes del contenedor)
const CYLINDER_BASE_POSITIONS = {
  // Posición relativa dentro del vehículo (porcentajes ajustados al sistema anterior)
  baseTop: -0.2, 
  baseLeft: 0.2, 
  spacing: {
    horizontal: 0.08, // 3.5% de separación horizontal (más compacto)
    vertical: 0.04,   // 1.5% de separación vertical (más compacto)
    depth: 0.05        // 2% para efecto de profundidad
  }
};

interface ContainerSize {
  width: number;
  height: number;
}

interface ScalingConfig {
  containerSize: ContainerSize;
  vehicleScale: number;
  vehiclePosition: { top: number; left: number };
  vehicleDimensions: { width: number; height: number };
  cylinderLayout: {
    baseTop: number;
    baseLeft: number;
    maxCylindersPerLine: number;
    blockOffsetHorizontal: number;
    blockOffsetVertical: number;
  };
}

interface CylinderPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const useVehicleScaling = (
  containerRef: RefObject<HTMLDivElement>,
  vehiculo?: IVehiculoView | null
) => {
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 300, height: 200 });
  const [scalingConfig, setScalingConfig] = useState<ScalingConfig | null>(null);

  // Función para obtener la configuración del vehículo
  const getVehicleConfig = useCallback((vehiculo?: IVehiculoView | null) => {
    if (!vehiculo) return VEHICLE_CONFIGS.default;
    
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    const key = `${marca}_${modelo}` as keyof typeof VEHICLE_CONFIGS;
    
    return VEHICLE_CONFIGS[key] || VEHICLE_CONFIGS.default;
  }, []);

  // Función para generar el nombre de la imagen del vehículo
  const getVehicleImageName = useCallback((vehiculo?: IVehiculoView | null): string => {
    if (!vehiculo) return "desconocida_desconocido";
    
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    
    return `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }, []);

  // Actualizar tamaño del contenedor
  const updateContainerSize = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setContainerSize({ width: clientWidth, height: clientHeight });
    }
  }, [containerRef]);

  // Calcular configuración de escalado
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const vehicleConfig = getVehicleConfig(vehiculo);
    
    // Calcular escala basada en el 90% del ancho del contenedor
    const targetWidth = containerSize.width * 0.85;
    const scale = targetWidth / vehicleConfig.baseWidth;
    
    // Dimensiones escaladas del vehículo
    const scaledWidth = vehicleConfig.baseWidth * scale;
    const scaledHeight = vehicleConfig.baseHeight * scale;
    
    // Centrar el vehículo en el contenedor
    const vehicleLeft = (containerSize.width - scaledWidth) / 2;
    const vehicleTop = (containerSize.height - scaledHeight) / 2;

    setScalingConfig({
      containerSize,
      vehicleScale: scale,
      vehiclePosition: { top: vehicleTop, left: vehicleLeft },
      vehicleDimensions: { width: scaledWidth, height: scaledHeight },
      cylinderLayout: vehicleConfig.cylinderLayout || DEFAULT_CYLINDER_LAYOUT,
    });
  }, [containerSize, vehiculo, getVehicleConfig]);

  // Calcular posición de cilindro individual
  const calculateCylinderPosition = useCallback((
    index: number,
    isLoaded: boolean = true
  ): CylinderPosition => {
    if (!scalingConfig) {
      return { top: 0, left: 0, width: 20, height: 80 };
    }

    const { vehiclePosition, vehicleDimensions, vehicleScale, cylinderLayout } = scalingConfig;
    
    // Tamaño base del cilindro escalado
    const cylinderWidth = 1.3 * 14 * vehicleScale;
    const cylinderHeight = 1.3 * 78 * vehicleScale;
    
    // Posiciones dentro del área del vehículo, limitando la cantidad de cilindros por bloque.
    const maxCylindersPerLine = Math.max(cylinderLayout.maxCylindersPerLine, 1);
    const block = Math.floor(index / maxCylindersPerLine);
    const indexInBlock = index % maxCylindersPerLine;
    const row = Math.floor(indexInBlock / 2);
    const col = indexInBlock % 2;
    
    // Calcular posición relativa dentro del vehículo (ajustada al sistema anterior)
    const relativeLeft = cylinderLayout.baseLeft + 
      (block * cylinderLayout.blockOffsetHorizontal) +
      (col * CYLINDER_BASE_POSITIONS.spacing.horizontal) + 
      (row * CYLINDER_BASE_POSITIONS.spacing.depth);
      
    // Ajuste más preciso para la posición vertical basado en el sistema anterior
    const relativeTop = cylinderLayout.baseTop +
      (block * cylinderLayout.blockOffsetVertical) -
      (row * CYLINDER_BASE_POSITIONS.spacing.vertical) + 
      (col * CYLINDER_BASE_POSITIONS.spacing.vertical * 0.3); // Reducido el factor

    // Convertir a posición absoluta dentro del vehículo
    const absoluteLeft = vehiclePosition.left + (vehicleDimensions.width * relativeLeft);
    const absoluteTop = vehiclePosition.top + (vehicleDimensions.height * relativeTop);

    // Si es descargado, posicionar fuera del vehículo (izquierda)
    const finalLeft = isLoaded ? absoluteLeft : absoluteLeft + (cylinderWidth * 2.5);
    const finalTop = isLoaded ? absoluteTop : absoluteTop + 80 + (cylinderHeight * 0.3);

    return {
      top: finalTop,
      left: finalLeft,
      width: cylinderWidth,
      height: cylinderHeight
    };
  }, [scalingConfig]);

  // Observer para cambios de tamaño
  useEffect(() => {
    updateContainerSize();
    
    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [containerRef, updateContainerSize]);

  return {
    // Estados
    containerSize,
    scalingConfig,
    
    // Funciones utilitarias
    getVehicleImageName,
    calculateCylinderPosition,
    
    // Datos calculados
    vehicleScale: scalingConfig?.vehicleScale || 1,
    vehiclePosition: scalingConfig?.vehiclePosition || { top: 0, left: 0 },
    vehicleDimensions: scalingConfig?.vehicleDimensions || { width: 247, height: 191 },
    
    // Estado de carga
    isReady: !!scalingConfig
  };
};

export default useVehicleScaling;
