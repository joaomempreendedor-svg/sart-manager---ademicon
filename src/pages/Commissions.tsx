return (
  <React.Fragment key={c.db_id}>
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
      <td className="px-4 py-3 align-top"><div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div><div className="text-xs text-gray-500">{new Date(c.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div></td>
      <td className="px-4 py-3 align-top"><div className="font-bold text-gray-900 dark:text-white flex items-center">{c.clientName}{c.angelName && <span title={`Anjo: ${c.angelName}`}><Crown className="ml-2 h-3.5 w-3.5 text-yellow-500" /></span>}</div><div className="text-xs text-gray-500">{c.group} / {c.quota} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.type === 'Imóvel' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'}`}>{c.type === 'Imóvel' ? '🏠' : '🚗'} {c.type}</span></div></td>
      <td className="px-4 py-3 align-top text-xs space-y-1">
        <div className="flex items-center" title={`Consultor: ${c.consultant}`}>
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 shrink-0"></div>
          <span className="truncate">{c.consultant}</span>
        </div>
        {c.managerName && c.managerName !== 'N/A' && (
          <div className="pt-1">
            <div className="font-semibold text-gray-600 dark:text-gray-400">Equipe SART</div>
            <div className="flex items-center text-gray-500" title={`Gestor: ${c.managerName}`}>
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2 shrink-0"></div>
              <span className="truncate">{c.managerName}</span>
            </div>
          </div>
        )}
        {c.angelName && (
          <div className="flex items-center text-yellow-700 dark:text-yellow-400" title={`Anjo: ${c.angelName}`}>
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 shrink-0"></div>
            <span className="truncate">{c.angelName}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top"><div className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(c.value)}</div><div className="text-xs text-gray-500">PV: {c.pv}</div></td>
      <td className="px-4 py-3 align-top"><div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>{status}</div><div className="mt-2"><div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"><span>{paidCount}/{totalInstallments}</span><span>{Math.round(progressPercent)}%</span></div><div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${progressPercent}%` }}></div></div></div></td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex justify-end items-center">
          {status !== 'Concluído' && (
            <button
              onClick={() => handleMarkAllAsPaid(c)}
              className="p-2 rounded-md hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-500"
              title="Marcar Todas as Parcelas como Pagas"
            >
              <MarkAllPaidIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCommissionForRange(c);
              setIsRangeModalOpen(true);
            }}
            className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500"
            title="Marcar Faixa de Parcelas como Pagas"
          >
            <CalendarCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEditCommissionModal(c)}
            className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500"
            title="Editar Venda"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteCommission(c.db_id!)}
            className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
            title="Excluir Venda"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpandedRow(expandedRow === c.db_id ? null : c.db_id!)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${expandedRow === c.db_id ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </td>
    </tr>
    {expandedRow === c.db_id && (
      <tr className="bg-gray-50 dark:bg-slate-800">
        <td colSpan={6} className="p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {Object.entries(c.installmentDetails).map(([num, info]) => {
              const installmentInfo = info as InstallmentInfo;
              const statusValue = installmentInfo?.status || 'Pendente';
              const values = getInstallmentValues(c, parseInt(num));
              return (
                <div key={num} className="text-center p-2 rounded-md border bg-white dark:bg-slate-700">
                  <div className="text-xs text-gray-400">
                    Parcela {num}
                    {installmentInfo.competenceMonth && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Comp: {installmentInfo.competenceMonth.slice(5, 7)}/{installmentInfo.competenceMonth.slice(2, 4)}
                      </div>
                    )}
                  </div>
                  <select value={statusValue} onChange={async (e) => await handleStatusChange(c.db_id!, parseInt(num), e.target.value as InstallmentStatus, c.clientName, c.type)} className={`mt-1 w-full text-xs font-bold py-1 px-2 rounded border cursor-pointer focus:outline-none ${getInstallmentStatusColor(statusValue)}`}>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Atraso">Atraso</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  {statusValue === 'Pago' && (
                    <div className="mt-2 text-xs space-y-1 text-left text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between"><span>Consultor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.cons)}</span></div>
                      <div className="flex justify-between"><span>Gestor:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.man)}</span></div>
                      {c.angelName && <div className="flex justify-between"><span>Anjo:</span> <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(values.angel)}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
);