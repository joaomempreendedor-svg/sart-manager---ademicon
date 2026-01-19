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
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-slate-700" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12, fill: 'var(--tw-colors-gray-700)' }} className="dark:text-gray-300" />
        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12, fill: 'var(--tw-colors-gray-700)' }} className="dark:text-gray-300" />
        <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} formatter={(value: number) => formatCurrency(value)} labelFormatter={(label: string) => `Consultor: ${label}`} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Bar dataKey="soldValue" name="Valor Vendido" fill="#ff7a00" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopSellersChart;