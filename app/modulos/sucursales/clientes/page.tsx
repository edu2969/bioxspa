'use client'
import { useEffect, useRef, useState } from "react";
import { MdEmail, MdOutlineCompare, MdOutlineSettings, MdPriceChange } from "react-icons/md";
import useMeasure from "react-use-measure"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import MultiLineChart from "@/components/charts/MultiLineChart"
import { CircularProgressbar } from "react-circular-progressbar";
import { FaPlusCircle, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { IoIosNotifications } from "react-icons/io";
import { GrMoney } from "react-icons/gr";

import dayjs from "dayjs";
import 'dayjs/locale/es'
import './page.css'
import { TbMoneybag } from "react-icons/tb";
import { RiCheckDoubleFill } from "react-icons/ri";
dayjs.locale("es");

type PointType = {
  date: Date,
  value: number,
}

type KeyType = {
  category: string,
  points: PointType[],
}

const HomeGerencia = () => {
  const [dataVentas, setDataVentas] = useState<PointType[]>([{
    date: dayjs('2024-02-01 00:00').toDate(),
    value: 375677,
  }, {
    date: dayjs('2024-03-01 00:00').toDate(),
    value: 200098,
  }, {
    date: dayjs('2024-04-01 00:00').toDate(),
    value: 80088,
  }, {
    date: dayjs('2024-05-01 00:00').toDate(),
    value: 399877,
  }, {
    date: dayjs('2024-06-01 00:00').toDate(),
    value: 470987,
  }, {
    date: dayjs('2024-07-01 00:00').toDate(),
    value: 233440,
  }, {
    date: dayjs('2024-08-01 00:00').toDate(),
    value: 175677,
  }, {
    date: dayjs('2024-09-01 00:00').toDate(),
    value: 100098,
  }, {
    date: dayjs('2024-10-01 00:00').toDate(),
    value: 80088,
  }, {
    date: dayjs('2024-11-01 00:00').toDate(),
    value: 399877,
  }, {
    date: dayjs('2024-12-01 00:00').toDate(),
    value: 975677,
  }, {
    date: dayjs('2025-01-01 00:00').toDate(),
    value: 1233440,
  }]);

  const [debts, setDebts] = useState<PointType[]>([{
    date: dayjs('2024-02-01 00:00').toDate(),
    value: 456000,
  }, {
    date: dayjs('2024-03-01 00:00').toDate(),
    value: 679123,
  }, {
    date: dayjs('2024-04-01 00:00').toDate(),
    value: 456998,
  }, {
    date: dayjs('2024-05-01 00:00').toDate(),
    value: 567985,
  }, {
    date: dayjs('2024-06-01 00:00').toDate(),
    value: 611000,
  }, {
    date: dayjs('2024-07-01 00:00').toDate(),
    value: 712990,
  }, {
    date: dayjs('2024-08-01 00:00').toDate(),
    value: 1245665,
  }, {
    date: dayjs('2024-09-01 00:00').toDate(),
    value: 690000,
  }, {
    date: dayjs('2024-10-01 00:00').toDate(),
    value: 123999,
  }, {
    date: dayjs('2024-11-01 00:00').toDate(),
    value: 223448,
  }, {
    date: dayjs('2024-12-01 00:00').toDate(),
    value: 778990,
  }, {
    date: dayjs('2025-01-01 00:00').toDate(),
    value: 1233440,
  }]);

  const [clientDebts, setClientDebts] = useState<any[]>([
    {
      empresa: "Homero Simpson",
      deuda: 1245665,
    },
    {
      empresa: "Los Mastriones",
      deuda: 778990,
    },
    {
      empresa: "Gerardo Parra",
      deuda: 712990,
    },
    {
      empresa: "INDUGAS",
      deuda: 690000,
    },
    {
      empresa: "Fuxtrizona",
      deuda: 611000,
    },
    {
      empresa: "Emeral Jankis",
      deuda: 567985,
    },
    {
      empresa: "Dinacofi",
      deuda: 456998,
    },
    {
      empresa: "SIMEN",
      deuda: 456000,
    },
    {
      empresa: "JANSEN",
      deuda: 123999,
    },
  ]);

  const [clientList, setClientList] = useState<any[]>([]);

  const [ref, bounds] = useMeasure();
  const initData = useRef(false);

  /*async function getData() {
    console.log("ACTUAL", BIData);
    const res = await fetch(`/api/bi/toolStorage`)
    res.json().then((data: IBIToolStorage[] | any) => {
      var arreglo = new Array(12).fill([]).map((elem, index) => {
        var fecha = dayjs().month(index).startOf("month").toDate();
        return {
          date: fecha,
          value: 0
        };
      });
      var newData = data.data;
      console.log("NEW_DATA", newData);
      if (newData == null) return;
      newData.forEach(reg => {
        var month = dayjs(reg.date).month();
        arreglo[month].value = reg.totalAmount;
      })
      setBIData(arreglo)
      console.log("FINAL!", arreglo);
    });
  }*/

  const getRecent = (historial: any[]) => {
    if (historial.length === 0) return null;
    const recent = historial.reduce((latest, current) => {
      return dayjs(current.mes).isAfter(dayjs(latest.mes)) ? current : latest;
    });
    return {
      mes: recent.mes,
      montoPagado: recent.montoPagado,
      montoAdeudado: recent.montoAdeudado,
    };
  };

  const loadData = () => {
    var data = [{
      nombreCliente: "Hinrichsen y Vasey Operaciones Limitada",
      avatar: '/clientes/hinrichsen_vasey.png',
      clienteId: 1,
      telefono: "123456789",
      email: "cliente1@example.com",
      historial: Array.from({ length: 12 }, (_, i) => ({
        mes: dayjs().subtract(i, 'month').startOf("month").toDate(),
        montoAdeudado: Math.floor(Math.random() * 1000000),
        montoPagado: Math.floor(Math.random() * 1000000),
      })).reverse(),
    },
    {
      nombreCliente: "Simen Limitada",
      avatar: "/clientes/simen.png",
      clienteId: 2,
      telefono: "987654321",
      email: "cliente2@example.com",
      historial: Array.from({ length: 12 }, (_, i) => ({
        mes: dayjs().subtract(i, 'month').startOf("month").toDate(),
        montoAdeudado: Math.floor(Math.random() * 1000000),
        montoPagado: Math.floor(Math.random() * 1000000),
      })).reverse(),
    },
    {
      nombreCliente: "Constructora Castillo Y Bono Limitada",
      avatar: "clientes/castillo_y_bono.png",
      clienteId: 3,
      telefono: "456123789",
      email: "cliente3@example.com",
      historial: Array.from({ length: 12 }, (_, i) => ({
        mes: dayjs().subtract(i, 'month').startOf("month").toDate(),
        montoAdeudado: Math.floor(Math.random() * 1000000),
        montoPagado: Math.floor(Math.random() * 1000000),
      })).reverse(),
    },
    {
      nombreCliente: "Maestranza SG Limitada",
      avatar: "/clientes/maestraza_sg.jpg",
      clienteId: 4,
      telefono: "321654987",
      email: "cliente4@example.com",
      historial: Array.from({ length: 12 }, (_, i) => ({
        mes: dayjs().subtract(i, 'month').startOf("month").toDate(),
        montoAdeudado: Math.floor(Math.random() * 1000000),
        montoPagado: Math.floor(Math.random() * 1000000),
      })).reverse(),
    },
    {
      nombreCliente: "Ingenieria y Montaje Jorge Salgado Espinoza EIRL",
      avatar: "/clientes/d_y_b.png",
      clienteId: 5,
      telefono: "789456123",
      email: "cliente5@example.com",
      historial: Array.from({ length: 12 }, (_, i) => ({
        mes: dayjs().subtract(i, 'month').startOf("month").toDate(),
        montoAdeudado: Math.floor(Math.random() * 1000000),
        montoPagado: Math.floor(Math.random() * 1000000),
      })).reverse(),
    }];
    setClientList(data);
  }

  useEffect(() => {
    if (!initData.current) {
      initData.current = true
      loadData();
    }
  }, [])

  return (
    <div className="flex h-screen w-full px-6 mt-16 text-blue-900 overflow-y-auto">
      <div className="w-1/3">

        <div className="h-1/3 shadow-md rounded-md px-4 pt-4 pb-24 mb-4" ref={ref}>
          <div className="flex">
            <div className="w-full">
              <div className="flex text-blue-900">
                <MdPriceChange size="3.5em" />
                <p className="text-2xl mt-3 ml-3">VENTAS</p>
                <div className="flex w-full justify-end">
                  <button className="flex flex-col items-center text-xs shadow-md hover:shadow-lg transition-shadow duration-300 p-2 w-20 mr-2">
                    <FaPlusCircle size="2em" />
                    <span>NUEVA</span>
                  </button>
                  <button className="flex flex-col items-center text-xs shadow-md hover:shadow-lg transition-shadow duration-300 p-2 w-20 mr-2">
                    <MdOutlineSettings size="2em" />
                    <span>OPCIONES</span>
                  </button>
                </div>
              </div>
              {dataVentas.length > 0 && <LineChart data={dataVentas} width={bounds.width} height={bounds.height} />}
            </div>
          </div>
        </div>

        <div className="shadow-md rounded-md px-4 pt-4 mb-4">
          <div className="flex">
            <MdOutlineCompare size="2em" />
            <p className="text-2xl ml-4">ENERO&#39;23 vs ENERO&#39;24</p>
          </div>
          <div className="flex">
            <CircularProgressbar
              className="orbitron p-4"
              value={34}
              text={`34%`}
              styles={{
                root: { width: '96px' },
                path: { stroke: `rgba(138,159,208,0.4)` },
                text: { fill: 'rgba(138,159,208)', fontSize: '28px', textAnchor: 'middle', dominantBaseline: 'middle' },
                trail: { stroke: '#d6d6d6' },
              }}
            />
            <div className="text-blue-900 text-xl ml-5 mt-5">
              <p><small>de CLP $</small><b> 1.43M</b></p>
              <p><small>&nbsp;&nbsp;a CLP $</small><b> 1.78M</b></p>
            </div>
          </div>
        </div>

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
              { task: "Revisar reportes de ventas", date: "2024-02-01" },
              { task: "Actualizar precios", date: "2024-02-05" },
              { task: "Reunión con el equipo", date: "2024-02-10" },
              { task: "Enviar informe mensual", date: "2024-02-15" },
              { task: "Planificación trimestral", date: "2024-02-20" },
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
              {debts.length > 0 && <LineChart data={debts} width={bounds.width} height={bounds.height} indexColor={7} />}
            </div>
            <div className="w-1/2 bg-red-50 shadow-md rounded-md p-4 text-center mx-6 h-48">
              <div className="flex text-red-700">
                <TbMoneybag size="2.1em" />
                <p className="text-md mt-1 ml-3">DEUDA ACTUAL TOTAL</p>
              </div>
              <p className="text-6xl ml-3 text-red-700 mt-4"><small>CLP </small><b>$ 1.43</b><small> M</small></p>
              <p className="text-md ml-3 text-red-700 mt-4"><b>236</b><small> DEUDORES</small></p>
            </div>
          </div>
          <div className="w-full">
            {<BarChart data={clientDebts} width={bounds.width * 1.75} height={bounds.height} indexColor={7} />}
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
                              <img src={client.avatar} alt="Avatar" className="rounded-full w-12 h-12 mr-4" />
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
                            <p className="text-red-700 text-lg"><b>$ {client.historial[client.historial.length - 1].montoAdeudado}</b></p>
                          </div>                            
                          <div className="flex -mt-2">
                            <p className="text-xs text-green-700 mt-2 mr-1">ULT. PAGO CLP </p>
                            <p className="text-green-700 text-md mt-0.5"><b>$ {getRecent(client.historial)?.montoPagado}</b></p>
                          </div>
                          <p className="text-xs text-gray-500 uppercase">{dayjs(getRecent(client.historial)?.mes).format('DD/MMM/YYYY')}</p>
                        </div>

                        <div className="w-5/12 flex flex-col items-end">
                            <button className="flex items-center text-xs shadow-md hover:shadow-lg transition-shadow duration-300 p-2 w-32 mr-2 bg-green-500 text-white rounded-md h-8 justify-center">
                            <RiCheckDoubleFill size="1.5em" className="mr-2" />
                            <span>RESOLVER</span>
                            </button>
                          <MultiLineChart
                          data={[
                            {
                            category: "Deuda",
                            points: client.historial.map((reg: any) => ({
                              date: reg.mes,
                              value: reg.montoAdeudado
                            }))
                            },
                            {
                            category: "Pagos",
                            points: client.historial.map((reg: any) => ({
                              date: reg.mes,
                              value: reg.montoPagado
                            }))
                            }
                          ]}
                          width={bounds.width}
                          height={bounds.height * 0.6}
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
}

export default HomeGerencia;