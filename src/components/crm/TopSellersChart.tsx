import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TopSellersChartProps {
  data: { name: string; soldValue: number; }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const TopSellersChart: React.FC<TopSellersChartProps> = ({ data }) => {
  // Ordenar os dados do maior para o menor valor vendido
  const sortedData = [...data].sort((a, b) => b.soldValue - a.soldValue);

  return (
    <div className="text-gray-700 dark:text-gray-300"> {/* Wrapper para controlar a cor do texto */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sortedData}
          margin={{
            top: 5,
            right: 30,
            left: 40, // Aumentado para dar mais espaço ao rótulo do eixo Y
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-slate-700" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12, fill: 'currentColor' }} /> {/* Usar currentColor */}
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: 'currentColor' }} /> {/* Usar currentColor */}
          <Tooltip
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label: string) => `Consultor: ${label}`}
            // Explicitamente definir a cor do texto para o rótulo e itens do tooltip para garantir legibilidade
            labelStyle={{ color: '#333' }} // Cor escura para o nome do consultor
            itemStyle={{ color: '#333' }} // Cor escura para outros itens (se não sobrescrito pelo fill da barra)
            contentStyle={{ backgroundColor: 'white', borderColor: '#e0e0e0', borderRadius: '8px', boxShadow: '0px 0px 10px rgba(0,0,0,0.1)' }} // Garantir fundo branco e estilo
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="soldValue" name="Valor Vendido" fill="#ff7a00" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopSellersChart;