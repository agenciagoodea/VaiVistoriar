
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';

const PlanConfigPage: React.FC = () => {
   const [plans, setPlans] = useState<Plan[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
   const [showNewPlanModal, setShowNewPlanModal] = useState(false);


   const [form, setForm] = useState<Partial<Plan>>({
      name: '',
      slug: '',
      price: 0,
      billingCycle: 'Mensal',
      status: 'Ativo',
      type: 'PF',
      maxInspections: 0,
      maxPhotos: 0,
      maxRooms: 0,
      maxBrokers: 0,
      storageGb: 0,
      badgeText: '',
      durationDays: 30, // Default 30 days
      features: { inspections: '', storage: '', users: '' }
   });

   useEffect(() => {
      fetchPlans();
   }, []);

   const fetchPlans = async () => {
      try {
         const { data, error } = await supabase.from('plans').select('*').order('created_at');
         if (error) throw error;

         // Mapear campos do DB para a tipagem do frontend (camelCase)
         const mappedPlans: Plan[] = (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: parseFloat(p.price),
            billingCycle: p.billing_cycle,
            status: p.status,
            features: p.features,
            type: p.plan_type,
            maxInspections: p.max_inspections || 0,
            maxPhotos: p.max_photos || 0,
            maxRooms: p.max_rooms || 0,
            maxBrokers: p.max_brokers || 0,
            storageGb: p.storage_gb || 0,
            badgeText: p.plan_badge_text || '',
            durationDays: p.duration_days || 30,
            comparisonPrice: p.comparison_price ? parseFloat(p.comparison_price) : undefined,
            subscribers: 0 // Mock por enquanto
         }));

         setPlans(mappedPlans);
         if (mappedPlans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(mappedPlans[0].id);
            setForm(mappedPlans[0]);
         }
      } catch (err) {
         console.error('Erro ao buscar planos:', err);
      } finally {
         setLoading(false);
      }
   };



   const handleSelectPlan = (plan: Plan) => {
      setSelectedPlanId(plan.id);
      setForm(plan);
   };

   const handleUpdatePlan = async () => {
      if (!selectedPlanId) return;
      setSaving(true);
      try {
         const { error } = await supabase.from('plans').update({
            name: form.name,
            slug: form.slug,
            price: form.price,
            billing_cycle: form.billingCycle,
            status: form.status,
            features: { ...form.features, comparison_price: form.comparisonPrice },
            plan_type: form.type,
            max_inspections: form.maxInspections,
            max_photos: form.maxPhotos,
            max_rooms: form.maxRooms,
            max_brokers: form.maxBrokers,
            storage_gb: form.storageGb,
            plan_badge_text: form.badgeText,
            duration_days: form.durationDays
         }).eq('id', selectedPlanId);

         if (error) throw error;
         alert('Plano atualizado com sucesso!');
         fetchPlans();
      } catch (err: any) {
         console.error('Erro ao atualizar plano:', err);
         alert(`Erro ao atualizar plano: ${err.message || 'Erro desconhecido'}`);
      } finally {
         setSaving(false);
      }
   };

   const handleCreatePlan = async () => {
      setSaving(true);
      try {
         const { error } = await supabase.from('plans').insert([{
            name: form.name,
            slug: form.slug,
            price: form.price,
            billing_cycle: form.billingCycle,
            status: form.status,
            features: { ...form.features, comparison_price: form.comparisonPrice },
            plan_type: form.type,
            max_inspections: form.maxInspections,
            max_photos: form.maxPhotos,
            max_rooms: form.maxRooms,
            max_brokers: form.maxBrokers,
            storage_gb: form.storageGb,
            plan_badge_text: form.badgeText,
            duration_days: form.durationDays
         }]);

         if (error) throw error;
         setShowNewPlanModal(false);
         alert('Plano criado!');
         fetchPlans();
      } catch (err: any) {
         console.error('Erro ao criar plano:', err);
         alert(`Erro ao criar plano: ${err.message || 'Erro desconhecido'}`);
      } finally {
         setSaving(false);
      }
   };

   const handleDeletePlan = async () => {
      if (!selectedPlanId) return;

      const planToDelete = plans.find(p => p.id === selectedPlanId);
      const confirmMessage = `Deseja realmente EXCLUIR o plano "${planToDelete?.name || 'este plano'}" permanentemente?\n\nUsuários e históricos de pagamento vinculados serão desassociados automaticamente.`;

      if (!window.confirm(confirmMessage)) return;

      setSaving(true);
      try {
         const { data, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'delete_plan',
               payload: { plan_id: selectedPlanId }
            }
         });

         if (error) throw error;
         if (data && !data.success) throw new Error(data.error || 'Erro ao excluir plano no servidor');

         alert('Plano excluído com sucesso!');
         setSelectedPlanId(null);
         fetchPlans();
      } catch (err: any) {
         console.error('Erro ao excluir plano:', err);

         let errorMessage = 'Erro desconhecido ao excluir o plano.';

         // Tentamos extrair detalhes do erro da resposta HTTP
         if (err.context && typeof err.context.json === 'function') {
            try {
               const errorData = await err.context.json();
               errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
               console.warn('Não foi possível ler o JSON do erro:', e);
            }
         } else if (err.message) {
            errorMessage = err.message;
         }

         alert(`Erro: ${errorMessage}`);
      } finally {
         setSaving(false);
      }
   };

   const selectedPlan = plans.find(p => p.id === selectedPlanId);

   if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando Ofertas...</div>;

   return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gerenciamento de Planos</h1>
               <p className="text-slate-400 font-medium text-sm mt-1">Configure as ofertas, preços e limites para corretores e imobiliárias.</p>
            </div>
            <button
               onClick={() => {
                  setForm({
                     name: '',
                     slug: '',
                     price: 0,
                     billingCycle: 'Mensal',
                     status: 'Ativo',
                     type: 'PF',
                     maxInspections: 0,
                     maxPhotos: 0,
                     maxRooms: 0,
                     maxBrokers: 0,
                     storageGb: 0,
                     badgeText: '',
                     comparisonPrice: undefined,
                     features: { inspections: '', storage: '' }
                  });
                  setShowNewPlanModal(true);
               }}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all transform active:scale-95"
            >
               <span className="material-symbols-outlined text-[20px]">add</span>
               Adicionar Novo Plano
            </button>
         </div>


         <div className="space-y-6">
            <h3 className="font-black text-slate-900 px-1 tracking-tight">Planos Cadastrados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {plans.map((plan) => (
                  <div
                     key={plan.id}
                     onClick={() => handleSelectPlan(plan)}
                     className={`bg-white rounded-[32px] border-2 transition-all cursor-pointer p-6 space-y-6 relative overflow-hidden ${selectedPlanId === plan.id ? 'border-blue-600 shadow-2xl shadow-blue-500/10 scale-[1.02]' : 'border-slate-100 hover:border-blue-200 shadow-sm'
                        }`}
                  >
                     <div className="flex justify-between items-start">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${plan.type === 'PF' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                           {plan.badgeText || `${plan.type} - ${plan.name.split(' ')[1]?.toUpperCase() || 'PLANO'}`}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${plan.status === 'Ativo' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`} />
                     </div>

                     <div>
                        <h4 className="text-xl font-black text-slate-900 leading-tight">{plan.name}</h4>
                        <div className="flex items-baseline gap-1 mt-1">
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                           <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                              /{plan.billingCycle === 'Anual' ? 'ano' : 'mês'}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                           <span className="material-symbols-outlined text-slate-300 text-[18px]">verified</span>
                           {plan.maxInspections} Vistorias / {plan.maxPhotos} Fotos / {plan.maxRooms} Cômodos
                        </div>
                        {plan.type === 'PJ' && (
                           <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                              <span className="material-symbols-outlined text-slate-300 text-[18px]">group</span>
                              Max. {plan.maxBrokers} Corretores
                           </div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                           <span className="material-symbols-outlined text-slate-300 text-[18px]">cloud</span>
                           {plan.storageGb} GB Armazenamento
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Editor Section */}
         {selectedPlan && (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
               <div className="px-10 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                     <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                        <span className="material-symbols-outlined text-[24px]">tune</span>
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Configurar Plano: {selectedPlan.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {selectedPlan.id.slice(0, 8)}...</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <button
                        onClick={handleDeletePlan}
                        className="px-6 py-3 text-rose-500 bg-rose-50 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                     >
                        Excluir Plano
                     </button>
                     <button
                        onClick={handleUpdatePlan}
                        disabled={saving}
                        className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                     >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                     </button>
                  </div>
               </div>

               <div className="p-10 grid xl:grid-cols-2 gap-16 bg-slate-50/30">
                  <div className="space-y-8">
                     <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Plano</label>
                           <input
                              type="text"
                              value={form.name}
                              onChange={e => setForm({ ...form, name: e.target.value })}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto do Badge</label>
                           <input
                              type="text"
                              value={form.badgeText}
                              onChange={e => setForm({ ...form, badgeText: e.target.value })}
                              className="w-full px-6 py-4 bg-blue-50/30 border border-blue-100/50 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-blue-600"
                              placeholder="Ex: MAIS POPULAR"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duração (Dias)</label>
                           <input
                              type="number"
                              value={form.durationDays}
                              onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) })}
                              className="w-full px-6 py-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-emerald-600"
                              placeholder="Ex: 30"
                           />
                        </div>
                     </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slug (Link Identificador)</label>
                           <input
                              type="text"
                              value={form.slug}
                              onChange={e => setForm({ ...form, slug: e.target.value })}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Mensal Ref. (Para cálculo de economia)</label>
                           <input
                              type="number"
                              value={form.comparisonPrice || ''}
                              onChange={e => setForm({ ...form, comparisonPrice: parseFloat(e.target.value) })}
                              className="w-full px-6 py-4 bg-amber-50/20 border border-amber-100/50 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-amber-500/5 transition-all text-amber-600"
                              placeholder="Ex: 99.90"
                           />
                        </div>
                     </div>

                     <div className="grid md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                           <input
                              type="number"
                              value={form.price}
                              onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciclo</label>
                           <select
                              value={form.billingCycle}
                              onChange={e => {
                                 const cycle = e.target.value as 'Mensal' | 'Anual';
                                 setForm({
                                    ...form,
                                    billingCycle: cycle,
                                    durationDays: cycle === 'Anual' ? 365 : 30
                                 });
                              }}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer"
                           >
                              <option value="Mensal">Mensal (30 dias)</option>
                              <option value="Anual">Anual (365 dias)</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
                           <select
                              value={form.type}
                              onChange={e => setForm({ ...form, type: e.target.value as any })}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer"
                           >
                              <option value="PF">Pessoa Física (Corretor)</option>
                              <option value="PJ">Pessoa Jurídica (Imobiliária)</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visibilidade</label>
                           <select
                              value={form.status}
                              onChange={e => setForm({ ...form, status: e.target.value as any })}
                              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer"
                           >
                              <option value="Ativo">Venda Ativa</option>
                              <option value="Inativo">Rascunho / Pausado</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-6 pt-4">
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-1">Limites do Sistema</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 ml-1">Max Vistorias</label>
                              <input
                                 type="number"
                                 value={form.maxInspections}
                                 onChange={e => setForm({ ...form, maxInspections: parseInt(e.target.value) })}
                                 className="w-full px-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm outline-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 ml-1">Max Fotos</label>
                              <input
                                 type="number"
                                 value={form.maxPhotos}
                                 onChange={e => setForm({ ...form, maxPhotos: parseInt(e.target.value) })}
                                 className="w-full px-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm outline-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 ml-1">Max Cômodos</label>
                              <input
                                 type="number"
                                 value={form.maxRooms}
                                 onChange={e => setForm({ ...form, maxRooms: parseInt(e.target.value) })}
                                 className="w-full px-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm outline-none"
                              />
                           </div>
                           {form.type === 'PJ' && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-slate-400 ml-1">Max Corretores</label>
                                 <input
                                    type="number"
                                    value={form.maxBrokers}
                                    onChange={e => setForm({ ...form, maxBrokers: parseInt(e.target.value) })}
                                    className="w-full px-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm outline-none"
                                 />
                              </div>
                           )}
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 ml-1">Espaço (GB)</label>
                              <input
                                 type="number"
                                 value={form.storageGb}
                                 onChange={e => setForm({ ...form, storageGb: parseInt(e.target.value) })}
                                 className="w-full px-6 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm outline-none"
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-[48px] p-8 border border-slate-100 flex flex-col items-center justify-center text-center space-y-10 shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 blur-[80px] rounded-full" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] relative z-10">Interface do Cliente</p>

                     <div className="w-full max-w-[340px] bg-white rounded-[40px] border-4 border-blue-600 p-8 shadow-2xl space-y-8 relative z-10 transform scale-110">
                        <div className="flex items-center justify-between">
                           <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                              {form.badgeText || `${form.type} - ${form.name?.split(' ')[1]?.toUpperCase() || 'PREVIEW'}`}
                           </span>
                        </div>
                        <div className="text-left space-y-1">
                           <h4 className="text-2xl font-black text-slate-900 leading-none">{form.name || 'Nome do Plano'}</h4>
                           <p className="text-2xl font-black text-slate-900">
                              R$ {form.price?.toFixed(2).replace('.', ',')}
                              <span className="text-[10px] text-slate-400 font-black tracking-widest ml-1">
                                 / {form.billingCycle === 'Anual' ? 'ANO' : 'MÊS'}
                              </span>
                           </p>
                           {form.billingCycle === 'Anual' && form.comparisonPrice && (
                              <div className="mt-2 text-left space-y-1">
                                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    Economia de R$ {((form.comparisonPrice * 12) - (form.price || 0)).toFixed(2).replace('.', ',')}/ano
                                 </p>
                                 <p className="text-[11px] font-bold text-slate-400">
                                    Apenas R$ {((form.price || 0) / 12).toFixed(2).replace('.', ',')} / mês
                                 </p>
                              </div>
                           )}
                        </div>
                        <div className="space-y-4 text-left">
                           <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                              <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                              {form.maxInspections} Vistorias / {form.maxPhotos} Fotos
                           </div>
                           <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                              <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                              Máximo de {form.maxRooms} cômodos
                           </div>
                           {form.type === 'PJ' && (
                              <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                 <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                                 Até {form.maxBrokers} Corretores
                              </div>
                           )}
                           <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                              <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                              {form.storageGb} GB de Espaço
                           </div>
                        </div>
                        <button className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200">
                           ASSINAR PLANO
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Modal Novo Plano (Simples) */}
         {showNewPlanModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Plano</h3>
                        <button onClick={() => setShowNewPlanModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
                     </div>
                     <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                           <input placeholder="Nome (Ex: Corretor Plus)" onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
                           <input placeholder="Slug (corretor-plus)" onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                           <input type="number" placeholder="Preço" onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
                           <select onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                              <option value="PF">Pessoa Física</option>
                              <option value="PJ">Pessoa Jurídica</option>
                           </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           <input type="number" placeholder="Vistorias" onChange={e => setForm({ ...form, maxInspections: parseInt(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                           <input type="number" placeholder="Fotos" onChange={e => setForm({ ...form, maxPhotos: parseInt(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                           <input type="number" placeholder="Cômodos" onChange={e => setForm({ ...form, maxRooms: parseInt(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                           {form.type === 'PJ' && (
                              <input type="number" placeholder="Corretores" onChange={e => setForm({ ...form, maxBrokers: parseInt(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                           )}
                           <input type="number" placeholder="Storage (GB)" onChange={e => setForm({ ...form, storageGb: parseInt(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto do Badge (Novo)</label>
                           <input
                              placeholder="Ex: PROMOCIONAL"
                              onChange={e => setForm({ ...form, badgeText: e.target.value })}
                              className="w-full px-6 py-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-bold text-blue-600"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setShowNewPlanModal(false)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                     <button
                        onClick={handleCreatePlan}
                        disabled={saving}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200"
                     >
                        {saving ? 'Criando...' : 'Criar Plano'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default PlanConfigPage;
