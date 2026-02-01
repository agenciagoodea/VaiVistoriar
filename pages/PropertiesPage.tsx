
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../types';
import { supabase } from '../lib/supabase';

const PropertiesPage: React.FC = () => {
   const [properties, setProperties] = React.useState<Property[]>([]);
   const [loading, setLoading] = React.useState(true);
   const [deleteModal, setDeleteModal] = React.useState<{ show: boolean, property: Property | null, inspections: any[] }>({
      show: false,
      property: null,
      inspections: []
   });
   const [deleting, setDeleting] = React.useState(false);
   const navigate = useNavigate();

   React.useEffect(() => {
      fetchProperties();
   }, []);

   const fetchProperties = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         // Buscar perfil para saber cargo
         const { data: profile } = await supabase
            .from('broker_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

         let query = supabase.from('properties').select('*');

         // Se for PJ ou Corretor, filtramos pelo user_id (quem cadastrou)
         // Para PJ, idealmente implementaríamos lógica de ver equipe, mas por enquanto isolamos por usuário
         if (profile?.role === 'PJ' || profile?.role === 'BROKER') {
            query = query.eq('user_id', user.id);
         }

         const { data: dbData, error } = await query.order('created_at', { ascending: false });

         if (error) throw error;

         // Buscar datas das últimas vistorias
         const propertyIds = (dbData || []).map((p: any) => p.id);
         let latestInspectionsMap: Record<string, string> = {};

         if (propertyIds.length > 0) {
            const { data: inspections } = await supabase
               .from('inspections')
               .select('property_id, created_at, scheduled_date')
               .in('property_id', propertyIds)
               .order('created_at', { ascending: false });

            (inspections || []).forEach((insp: any) => {
               // Como está ordenado por created_at desc, o primeiro que aparecer para cada propriedade é o mais recente
               if (!latestInspectionsMap[insp.property_id]) {
                  const date = insp.created_at || insp.scheduled_date;
                  latestInspectionsMap[insp.property_id] = date ? new Date(date).toLocaleDateString('pt-BR') : 'Sem data';
               }
            });
         }

         const formattedData: Property[] = (dbData || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            address: `${item.address || ''}, ${item.number || ''} - ${item.neighborhood || ''}`,
            owner: item.owner,
            type: item.type as any,
            lastInspection: latestInspectionsMap[item.id] || 'Nenhuma',
            image: item.image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400'
         }));

         setProperties(formattedData);
      } catch (err) {
         console.error('Erro ao buscar imóveis:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleDeleteClick = async (property: Property) => {
      try {
         // Buscar vistorias vinculadas
         const { data, error } = await supabase
            .from('inspections')
            .select('id, client_name, scheduled_date')
            .eq('property_id', property.id);

         if (error) throw error;

         setDeleteModal({
            show: true,
            property,
            inspections: data || []
         });
      } catch (err) {
         console.error('Erro ao verificar vínculos:', err);
         alert('Erro ao verificar vínculos do imóvel.');
      }
   };

   const confirmDelete = async () => {
      if (!deleteModal.property) return;

      setDeleting(true);
      try {
         const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', deleteModal.property.id);

         if (error) throw error;

         setDeleteModal({ show: false, property: null, inspections: [] });
         fetchProperties();
      } catch (err) {
         console.error('Erro ao excluir imóvel:', err);
         alert('Erro ao excluir imóvel. Verifique se existem vistorias que impedem a exclusão direta.');
      } finally {
         setDeleting(false);
      }
   };

   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meus Imóveis</h1>
               <p className="text-slate-500 mt-1">Gerencie todos os imóveis cadastrados para vistoria.</p>
            </div>
            <button
               onClick={() => navigate('/properties/new')}
               className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95"
            >
               <span className="material-symbols-outlined text-[20px]">add</span>
               Adicionar Imóvel
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               <div className="col-span-full py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando imóveis...</p>
                  </div>
               </div>
            ) : (
               <>
                  {properties.map((property) => (
                     <div key={property.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col">
                        <div className="relative h-48 bg-slate-200">
                           <img src={property.image} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute top-3 right-3">
                              <span className="px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-black uppercase text-slate-900">{property.type}</span>
                           </div>
                        </div>
                        <div className="p-6 space-y-6 flex-grow flex flex-col justify-between">
                           <div>
                              <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{property.name}</h3>
                              <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                 <span className="material-symbols-outlined text-sm">location_on</span>
                                 {property.address}
                              </p>
                           </div>

                           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                              <div>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Proprietário</p>
                                 <p className="text-xs text-slate-700 font-semibold">{property.owner}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Última Vistoria</p>
                                 <p className="text-xs text-slate-700 font-semibold">{property.lastInspection}</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-2 pt-4 mt-auto">
                              <button
                                 onClick={() => navigate(`/properties/edit/${property.id}`)}
                                 className="flex-grow flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                              >
                                 <span className="material-symbols-outlined text-[18px]">visibility</span>
                                 Detalhes
                              </button>
                              <div className="flex gap-2">
                                 <button
                                    onClick={() => navigate(`/properties/edit/${property.id}`)}
                                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 hover:bg-blue-50 transition-all"
                                 >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                 </button>
                                 <button
                                    onClick={() => handleDeleteClick(property)}
                                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 transition-all"
                                 >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}

                  <button
                     onClick={() => navigate('/properties/new')}
                     className="group border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all bg-white min-h-[400px]"
                  >
                     <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                        <span className="material-symbols-outlined text-[32px]">add</span>
                     </div>
                     <div className="text-center">
                        <p className="font-bold text-slate-900">Cadastrar Novo Imóvel</p>
                        <p className="text-xs text-slate-400 mt-1">Adicione um novo imóvel para começar a realizar vistorias.</p>
                     </div>
                  </button>
               </>
            )}
         </div>

         {/* Modal de Exclusão */}
         {deleteModal.show && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="p-8 text-center space-y-6">
                     <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-[40px]">delete_forever</span>
                     </div>

                     <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Excluir Imóvel?</h3>
                        <p className="text-sm text-slate-500 font-medium">
                           Você está prestes a excluir o imóvel <span className="font-bold text-slate-700">"{deleteModal.property?.name}"</span>.
                        </p>
                     </div>

                     {deleteModal.inspections.length > 0 && (
                        <div className="bg-amber-50 rounded-2xl p-6 text-left border border-amber-100 space-y-3">
                           <div className="flex items-center gap-2 text-amber-700">
                              <span className="material-symbols-outlined text-[20px]">warning</span>
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Vínculos Encontrados</p>
                           </div>
                           <p className="text-[11px] text-amber-800 font-bold leading-tight">
                              Este imóvel possui <span className="text-amber-900">{deleteModal.inspections.length} vistoria(s)</span> vinculada(s):
                           </p>
                           <ul className="space-y-2 pt-1">
                              {deleteModal.inspections.slice(0, 3).map((insp, idx) => (
                                 <li key={idx} className="flex flex-col border-l-2 border-amber-200 pl-3 py-0.5">
                                    <span className="text-[10px] font-bold text-amber-900 leading-none">{insp.client_name}</span>
                                    <span className="text-[9px] text-amber-700 mt-1">{new Date(insp.scheduled_date).toLocaleDateString()}</span>
                                 </li>
                              ))}
                              {deleteModal.inspections.length > 3 && (
                                 <li className="text-[9px] text-amber-600 italic font-medium pl-3">
                                    + {deleteModal.inspections.length - 3} outras vistorias...
                                 </li>
                              )}
                           </ul>
                           <p className="text-[10px] text-amber-900 font-black uppercase pt-2">Deseja prosseguir mesmo assim?</p>
                        </div>
                     )}

                     <div className="flex flex-col gap-3 pt-4">
                        <button
                           onClick={confirmDelete}
                           disabled={deleting}
                           className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                           {deleting ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                           ) : (
                              <>Sim, Excluir Imóvel</>
                           )}
                        </button>
                        <button
                           onClick={() => setDeleteModal({ show: false, property: null, inspections: [] })}
                           className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                           Cancelar
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default PropertiesPage;
