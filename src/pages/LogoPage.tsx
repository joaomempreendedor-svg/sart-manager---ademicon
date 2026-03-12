import React from 'react';

export const LogoPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center p-8">
      <div className="text-center bg-white dark:bg-slate-900 p-10 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Logo do Sistema</h1>
        <img 
          src="/favicon.svg" 
          alt="Logo do Sistema SART" 
          className="w-64 h-64 my-8 mx-auto"
        />
        <p className="text-gray-600 dark:text-gray-400">
          Clique com o botão direito na imagem acima e selecione <strong>"Salvar imagem como..."</strong> para baixar o arquivo.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Você poderá escolher o formato PNG ao salvar.
        </p>
      </div>
    </div>
  );
};