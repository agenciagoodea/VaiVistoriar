
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const InspectionsPage: React.FC = () => {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Buscar perfil do usuário para saber o cargo
      const { data: profile } = await supabase
        .from('broker_profiles')
        .select('role, full_name, company_name')
        .eq('user_id', user.id)
        .single();

      const role = profile?.role || 'BROKER';
      const myCompany = (profile?.company_name || (role === 'PJ' ? profile?.full_name : ''))?.trim() || '';
      setMyRole(role);

      // 2. Buscar vistorias (sem Join direto para evitar erro de FK inexistente no cache)
      let query = supabase.from('inspections').select('*');

      if (role === 'PJ' && myCompany) {
        // Se for PJ, primeiro buscamos todos os IDs de usuários da mesma empresa
        const { data: companyBrokers } = await supabase
          .from('broker_profiles')
          .select('user_id')
          .eq('company_name', myCompany);

        const brokerIds = companyBrokers?.map(b => b.user_id) || [];
        query = query.in('user_id', brokerIds);
      } else if (role === 'BROKER') {
        // Se for Corretor, vê apenas as suas vistorias
        query = query.eq('user_id', user.id);
      }

      const { data: inspectionsData, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // 3. Enriquecer com nomes dos corretores (Manual Join)
      // Buscamos os perfis de todos os envolvidos nessas vistorias
      const distinctUserIds = [...new Set((inspectionsData || []).map(i => i.user_id))];
      const { data: profiles } = await supabase
        .from('broker_profiles')
        .select('user_id, full_name, company_name')
        .in('user_id', distinctUserIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p });

      const enrichedData = (inspectionsData || []).map(i => ({
        ...i,
        broker_profiles: profileMap[i.user_id] || null
      }));

      setInspections(enrichedData);
    } catch (err) {
      console.error('Erro ao buscar vistorias:', err);
    } finally {
      setLoading(false);
    }
  };

  const [myRole, setMyRole] = useState<string>('BROKER');

  const handleDeleteClick = (inspection: any) => {
    setInspectionToDelete(inspection);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!inspectionToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', inspectionToDelete.id);

      if (error) throw error;

      setInspections(inspections.filter(item => item.id !== inspectionToDelete.id));
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Erro ao excluir vistoria:', err);
      alert('Erro ao excluir vistoria.');
    } finally {
      setDeleting(false);
      setInspectionToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 transform scale-100 duration-300">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">delete_forever</span>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">Excluir Vistoria?</h3>
              <p className="text-sm text-slate-500 leading-relaxed text-balance">
                Deseja mesmo remover a vistoria de <span className="font-bold text-slate-900">{inspectionToDelete?.property_name}</span>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Não, Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vistorias</h1>
          <p className="text-slate-500 mt-1">Gerencie todas as vistorias realizadas e agendadas.</p>
        </div>
        <button
          onClick={() => navigate('/inspections/new')}
          className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Nova Vistoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Todos', 'Pendentes', 'Finalizadas', 'Canceladas'].map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${activeFilter === status ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
              }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[35%]">Imóvel</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden lg:table-cell">Resumo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hidden xl:table-cell">Envio</th>
                {myRole === 'PJ' && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Corretor</th>}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Buscando vistorias...</p>
                    </div>
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-4xl">inventory_2</span>
                      <p className="text-sm font-bold uppercase tracking-widest">Nenhuma vistoria encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : inspections
                .filter(i => {
                  if (activeFilter === 'Todos') return true;
                  if (activeFilter === 'Pendentes') return i.status === 'Agendada' || i.status === 'Pendente' || i.status === 'Editando';
                  if (activeFilter === 'Finalizadas') return i.status === 'Finalizada' || i.status === 'Concluída' || i.status === 'Enviado';
                  if (activeFilter === 'Canceladas') return i.status === 'Cancelada';
                  return true;
                })
                .map((inspection) => {
                  const roomCount = Array.isArray(inspection.rooms) ? inspection.rooms.length : 0;
                  const photoCount = Array.isArray(inspection.rooms) ? inspection.rooms.reduce((acc: number, room: any) => acc + (room.photos?.length || 0), 0) : 0;
                  const isRent = inspection.report_type !== 'Venda';

                  return (
                    <tr key={inspection.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">home</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 uppercase text-[11px] leading-tight max-w-[180px] truncate" title={inspection.property_name}>{inspection.property_name || 'Sem nome'}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]" title={inspection.address}>{inspection.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="font-bold text-slate-700 text-[11px] uppercase truncate max-w-[150px]" title={inspection.client_name}>{inspection.client_name}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isRent ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {inspection.report_type || (isRent ? 'Locação' : 'Venda')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center" title={`${roomCount} Ambientes`}>
                            <div className="flex items-center gap-1 text-slate-400 justify-center">
                              <span className="material-symbols-outlined text-[14px]">meeting_room</span>
                              <span className="text-[10px] font-bold text-slate-600">{roomCount}</span>
                            </div>
                          </div>
                          <div className="text-center" title={`${photoCount} Fotos`}>
                            <div className="flex items-center gap-1 text-slate-400 justify-center">
                              <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                              <span className="text-[10px] font-bold text-slate-600">{photoCount}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center hidden xl:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${inspection.email_sent_at ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`} title={inspection.email_sent_at ? `Enviado em ${new Date(inspection.email_sent_at).toLocaleDateString()}` : 'Não enviado por email'}>
                            <span className="material-symbols-outlined text-[14px]">mail</span>
                          </div>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${inspection.whatsapp_sent_at ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`} title={inspection.whatsapp_sent_at ? `Enviado por WhatsApp em ${new Date(inspection.whatsapp_sent_at).toLocaleDateString()}` : 'Não enviado por WhatsApp'}>
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                          </div>
                        </div>
                      </td>
                      {myRole === 'PJ' && (
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700 text-[11px] uppercase truncate max-w-[120px]">
                            {inspection.broker_profiles?.full_name || 'Desconhecido'}
                          </p>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center text-[11px] font-bold text-slate-500">
                        {inspection.scheduled_date ? new Date(inspection.scheduled_date).toLocaleDateString('pt-BR') : '--'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${inspection.status === 'Enviado' ? 'bg-blue-50 text-blue-600' :
                          inspection.status === 'Finalizada' || inspection.status === 'Concluída' ? 'bg-emerald-50 text-emerald-600' :
                            inspection.status === 'Editando' ? 'bg-amber-50 text-amber-600' :
                              inspection.status === 'Agendada' ? 'bg-indigo-50 text-indigo-600' :
                                'bg-slate-100 text-slate-500'
                          }`}>
                          {inspection.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inspection.pdf_url && (
                            <a
                              href={inspection.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Ver PDF Salvo"
                            >
                              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/inspections/view/${inspection.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Visualizar Vistoria"
                          >
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <button
                            onClick={() => navigate(`/inspections/edit/${inspection.id}`)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(inspection)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InspectionsPage;
