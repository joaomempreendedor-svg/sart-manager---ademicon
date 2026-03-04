import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopSellersChartProps {
  data: { name: string; soldValue: number; }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
        <p className="font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-brand-600 dark:text-brand-400">{`Valor Vendido: ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

const TopSellersChart: React.FC<TopSellersChartProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.soldValue - a.soldValue);

  return (
    <div className="text-gray-700 dark:text-gray-300">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={sortedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60, // Increased bottom margin for angled labels
          }}
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffb870" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#ff7a00" stopOpacity={1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-slate-700" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            interval={0} 
            tick={{ fontSize: 12, fill: 'currentColor' }} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            tick={{ fontSize: 12, fill: 'currentColor' }} 
            tickLine={false}
            axisLine={false}
            width={100} // Give more space for currency values
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(255, 122, 0, 0.1)' }}
          />
          <Bar 
            dataKey="soldValue" 
            name="Valor Vendido" 
            fill="url(#salesGradient)" 
            radius={[4, 4, 0, 0]} // Rounded top corners
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopSellersChart;