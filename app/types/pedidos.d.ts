export interface PedidoResponse {
  pedidos: Pedido[];
}

export interface Pedido {
  id: string;
  cliente: PedidoCliente;
  solicitante: PedidoSolicitante;
  fecha: string;
  items: PedidoItem[];
}

export interface PedidoCliente {
  id?: string;
  nombre: string;
  rut: string;
  credito: {
    utilizado: number;
    autorizado: number;
  }
}

export interface PedidoSolicitante {
  id: string;
  nombre: string;
  telefono: string;
}

export interface PedidoItem {
  producto: string;
  capacidad: string;
  cantidad: number;
  precio?: number;
  subcategoriaCatalogoId: string | null;
}