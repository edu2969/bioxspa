'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MdEmail } from 'react-icons/md';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import MultiLineChart from '@/components/charts/MultiLineChart';
import { FaUserCircle, FaWhatsapp } from 'react-icons/fa';
import { IoIosNotifications } from 'react-icons/io';
import { GrMoney } from 'react-icons/gr';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import './page.css';
import { TbMoneybag } from 'react-icons/tb';
import { RiCheckDoubleFill } from 'react-icons/ri';

dayjs.locale('es');

type PointType = {
  date: Date;
  value: number;
};

const HomeGerencia = () => {
  const [debts] = useState<PointType[]>([
    { date: dayjs('2024-02-01 00:00').toDate(), value: 456000 },
    { date: dayjs('2024-03-01 00:00').toDate(), value: 679123 },
    { date: dayjs('2024-04-01 00:00').toDate(), value: 456998 },
    { date: dayjs('2024-05-01 00:00').toDate(), value: 567985 },
    { date: dayjs('2024-06-01 00:00').toDate(), value: 611000 },
    { date: dayjs('2024-07-01 00:00').toDate(), value: 712990 },
    { date: dayjs('2024-08-01 00:00').toDate(), value: 1245665 },
    { date: dayjs('2024-09-01 00:00').toDate(), value: 690000 },
    { date: dayjs('2024-10-01 00:00').toDate(), value: 123999 },
    { date: dayjs('2024-11-01 00:00').toDate(), value: 223448 },
    { date: dayjs('2024-12-01 00:00').toDate(), value: 778990 },
    { date: dayjs('2025-01-01 00:00').toDate(), value: 1233440 },
  ]);

  const [clientDebts] = useState([
    { empresa: 'Homero Simpson', deuda: 1245665 },
    { empresa: 'Los Mastriones', deuda: 778990 },
    { empresa: 'Gerardo Parra', deuda: 712990 },
    { empresa: 'INDUGAS', deuda: 690000 },
    { empresa: 'Fuxtrizona', deuda: 611000 },
    { empresa: 'Emeral Jankis', deuda: 567985 },
    { empresa: 'Dinacofi', deuda: 456998 },
    { empresa: 'SIMEN', deuda: 456000 },
    { empresa: 'JANSEN', deuda: 123999 },
  ]);

  type Client = {
    nombreCliente: string;
    avatar: string | null;
    clienteId: number;
    telefono: string;
    email: string;
    historial: {
      mes: Date;
      montoAdeudado: number;
      montoPagado: number;
    }[];
  };

  const [clientList, setClientList] = useState<Client[]>([]);

  const initData = useRef(false);

  const getRecent = (historial: Client['historial']) => {
    if (historial.length === 0) return null;
    const recent = historial.reduce((latest, current) =>
      dayjs(current.mes).isAfter(dayjs(latest.mes)) ? current : latest
    );
    return {
      mes: recent.mes,
      montoPagado: recent.montoPagado,
      montoAdeudado: recent.montoAdeudado,
    };
  };

  const loadData = () => {
    const data = [
      {
        nombreCliente: 'Hinrichsen y Vasey Operaciones Limitada',
        avatar: '/clientes/hinrichsen_vasey.png',
        clienteId: 1,
        telefono: '123456789',
        email: 'cliente1@example.com',
        historial: Array.from({ length: 12 }, (_, i) => ({
          mes: dayjs().subtract(i, 'month').startOf('month').toDate(),
          montoAdeudado: Math.floor(Math.random() * 1000000),
          montoPagado: Math.floor(Math.random() * 1000000),
        })).reverse(),
      },
      // ... (otros clientes)
    ];
    setClientList(data);
  };

  useEffect(() => {
    if (!initData.current) {
      initData.current = true;
      loadData();
    }
  }, []);

  return (
    <div className="flex h-screen w-full px-6 mt-16 text-blue-900 overflow-y-auto">
      <div className="w-1/3">
        {/* ... */}
        <div className="w-full mt-4 text-blue-900 shadow-md rounded-md p-6">
          <div className="relative">
            <p className="rounded-full bg-red-500 text-white text-xs p-1 w-6 h-6 text-center absolute ml-4 -top-1 left-2">3</p>
            <div className="flex">
              <IoIosNotifications size="2.5em" />
              <p className="text-2xl ml-6">NOTIFICACIONES</p>
            </div>
          </div>
          <div className="mt-12">
            {[
              { task: 'Revisar reportes de ventas', date: '2024-02-01' },
              { task: 'Actualizar precios', date: '2024-02-05' },
              { task: 'Reunión con el equipo', date: '2024-02-10' },
              { task: 'Enviar informe mensual', date: '2024-02-15' },
              { task: 'Planificación trimestral', date: '2024-02-20' },
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center mb-4">
                <input type="checkbox" className="mr-4" />
                <p className="flex-1">{item.task}</p>
                <p className="text-gray-500">{item.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-2/3 pl-4">
        <div className="w-full text-blue-900 shadow-md rounded-md p-6">
          <div className="flex">
            <div className="w-1/2">
              <div className="flex text-blue-900 mb-4">
                <GrMoney size="2.5em" />
                <p className="text-xl mt-3 ml-3">CRÉDITO</p>
              </div>
              {debts.length > 0 && <LineChart data={debts} width={640} height={480} indexColor={7} />}
            </div>
            <div className="w-1/2 bg-red-50 shadow-md rounded-md p-4 text-center mx-6 h-48">
              <div className="flex text-red-700">
                <TbMoneybag size="2.1em" />
                <p className="text-md mt-1 ml-3">DEUDA ACTUAL TOTAL</p>
              </div>
              <p className="text-6xl ml-3 text-red-700 mt-4">
                <small>CLP </small>
                <b>$ 1.43</b>
                <small> M</small>
              </p>
              <p className="text-md ml-3 text-red-700 mt-4">
                <b>236</b>
                <small> DEUDORES</small>
              </p>
            </div>
          </div>
          <div className="w-full">
            {<BarChart data={clientDebts} width={640 * 1.75} height={480}/>}
          </div>
          <div className="w-full">
            <div className="mt-8">
              <div className="overflow-x-auto">
                <div className="min-w-full mb-20">
                  {clientList.map((client) => (
                    <div key={client.clienteId} className="flex bg-red-50 shadow-md rounded-lg p-4 mb-2 pb-0">
                      <div className="w-7/12 px-4">
                        <div className="flex">
                          <div>
                            {client.avatar ? (
                              <Image
                                src={client.avatar}
                                alt="Avatar"
                                className="rounded-full"
                                width={48}
                                height={48}
                              />
                            ) : (
                              <FaUserCircle size="3em" className="mr-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-xl font-bold">{client.nombreCliente}</span>
                            <div className="flex items-center">
                              <MdEmail className="mr-2 text-blue-600" />
                              <span className="mr-2">{client.email}</span>
                              <FaWhatsapp className="mr-2 text-green-500" />
                              <span>+{client.telefono}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex">
                          <p className="text-xs text-red-700 mt-2 mr-1">DEUDA ACTUAL CLP </p>
                          <p className="text-red-700 text-lg">
                            <b>$ {client.historial[client.historial.length - 1].montoAdeudado}</b>
                          </p>
                        </div>
                        <div className="flex -mt-2">
                          <p className="text-xs text-green-700 mt-2 mr-1">ULT. PAGO CLP </p>
                          <p className="text-green-700 text-md mt-0.5">
                            <b>$ {getRecent(client.historial)?.montoPagado}</b>
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 uppercase">
                          {dayjs(getRecent(client.historial)?.mes).format('DD/MMM/YYYY')}
                        </p>
                      </div>

                      <div className="w-5/12 flex flex-col items-end">
                        <button className="flex items-center text-xs shadow-md hover:shadow-lg transition-shadow duration-300 p-2 w-32 mr-2 bg-green-500 text-white rounded-md h-8 justify-center">
                          <RiCheckDoubleFill size="1.5em" className="mr-2" />
                          <span>RESOLVER</span>
                        </button>
                        <MultiLineChart
                          data={[
                            {
                              category: 'Deuda',
                              points: client.historial.map((reg) => ({
                                date: reg.mes,
                                value: reg.montoAdeudado,
                              })),
                            },
                            {
                              category: 'Pagos',
                              points: client.historial.map((reg) => ({
                                date: reg.mes,
                                value: reg.montoPagado,
                              })),
                            },
                          ]}
                          width={640}
                          height={480 * 0.6}
                          simple={true}
                          colorIndexes={[7, 2]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeGerencia;
