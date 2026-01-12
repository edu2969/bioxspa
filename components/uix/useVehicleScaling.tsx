import { useState, useEffect, useCallback, RefObject } from 'react';
import type { IVehiculoView } from '@/types/types';

// Configuración base para diferentes modelos de vehículos
const VEHICLE_CONFIGS = {
  "hyundai_porter": { baseWidth: 247, baseHeight: 173, aspectRatio: 1.427, m2: 4.2, pesoMax: 1000 },
  "ford_ranger": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 5.3, pesoMax: 1200 },
  "mitsubishi_l200": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 4.7, pesoMax: 1100 },
  "volkswagen_constellation": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 12, pesoMax: 6000 },
  "volkswagen_delivery": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 10, pesoMax: 4500 },
  "kia_frontier": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 4.5, pesoMax: 1150 },
  "ford_transit": { baseWidth: 300, baseHeight: 200, aspectRatio: 1.5, m2: 9, pesoMax: 3500 },
  "default": { baseWidth: 247, baseHeight: 191, aspectRatio: 1.293, m2: 5, pesoMax: 1500 }
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
}

interface CylinderPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex: number;
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
      vehicleDimensions: { width: scaledWidth, height: scaledHeight }
    });
  }, [containerSize, vehiculo, getVehicleConfig]);

  // Calcular posición de cilindro individual
  const calculateCylinderPosition = useCallback((
    index: number,
    isLoaded: boolean = true
  ): CylinderPosition => {
    if (!scalingConfig) {
      return { top: 0, left: 0, width: 20, height: 80, zIndex: 1 };
    }

    const { vehiclePosition, vehicleDimensions, vehicleScale } = scalingConfig;
    
    // Tamaño base del cilindro escalado
    const cylinderWidth = 1.3 * 14 * vehicleScale;
    const cylinderHeight = 1.3 * 78 * vehicleScale;
    
    // Posiciones dentro del área del vehículo
    const row = Math.floor(index / 2);
    const col = index % 2;
    
    // Calcular posición relativa dentro del vehículo (ajustada al sistema anterior)
    const relativeLeft = CYLINDER_BASE_POSITIONS.baseLeft + 
      (col * CYLINDER_BASE_POSITIONS.spacing.horizontal) + 
      (row * CYLINDER_BASE_POSITIONS.spacing.depth);
      
    // Ajuste más preciso para la posición vertical basado en el sistema anterior
    const relativeTop = CYLINDER_BASE_POSITIONS.baseTop - 
      (row * CYLINDER_BASE_POSITIONS.spacing.vertical) + 
      (col * CYLINDER_BASE_POSITIONS.spacing.vertical * 0.3); // Reducido el factor

    // Convertir a posición absoluta dentro del vehículo
    const absoluteLeft = vehiclePosition.left + (vehicleDimensions.width * relativeLeft);
    const absoluteTop = vehiclePosition.top + (vehicleDimensions.height * relativeTop);

    // Si es descargado, posicionar fuera del vehículo (izquierda)
    const finalLeft = isLoaded ? absoluteLeft : absoluteLeft - (cylinderWidth * 2.5);
    const finalTop = isLoaded ? absoluteTop : absoluteTop + (cylinderHeight * 0.3);

    return {
      top: finalTop,
      left: finalLeft,
      width: cylinderWidth,
      height: cylinderHeight,
      zIndex: isLoaded ? 10 + index : 5 + index
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
