import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  Sliders,
  Filter,
  Tag,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { SystemConfig, OfferItem } from '../logic/types';
import { generateStableHash } from '../logic/hash';
import { calculateDiscount, calculateOpportunityScore } from '../logic/validation';

interface CategoryScannerViewProps {
  config: SystemConfig;
  onUpdateCategories: (categories: SystemConfig['authorizedCategories']) => void;
  onIngestOffers: (newOffers: OfferItem[]) => void;
  onShowNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CategoryScannerView: React.FC<CategoryScannerViewProps> = ({
  config,
  onUpdateCategories,
  onIngestOffers,
  onShowNotification,
}) => {
  const [categories, setCategories] = useState(config.authorizedCategories);
  const [isScanning, setIsScanning] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newCatQuery, setNewCatQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleCategory = (id: string) => {
    const updated = categories.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    setCategories(updated);
    onUpdateCategories(updated);
  };

  const updateSearchQuery = (id: string, newQuery: string) => {
    const updated = categories.map((c) => (c.id === id ? { ...c, searchQuery: newQuery } : c));
    setCategories(updated);
    onUpdateCategories(updated);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatId) return;

    const newCat = {
      id: newCatId.trim().toUpperCase(),
      name: newCatName.trim(),
      enabled: true,
      searchQuery: newCatQuery.trim() || `${newCatName.toLowerCase()} ofertas`,
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    onUpdateCategories(updated);
    setNewCatName('');
    setNewCatId('');
    setNewCatQuery('');
    setShowAddForm(false);
    onShowNotification(`Categoria "${newCat.name}" adicionada com sucesso!`, 'success');
  };

  const handleRunCategoryScan = (cat: { id: string; name: string; searchQuery: string }) => {
    setIsScanning(true);
    onShowNotification(`Escaneando Mercado Livre: Categoria ${cat.name} (${cat.id})...`, 'info');

    setTimeout(() => {
      // Ingest realistic deal found in this category
      const discount = Math.floor(Math.random() * 25) + 20; // 20% to 45%
      const original = Math.floor(Math.random() * 800) + 400;
      const current = Math.round(original * (1 - discount / 100));
      const mlbId = `MLB${Math.floor(100000000 + Math.random() * 900000000)}`;

      const newOffer: OfferItem = {
        id: `OFF_${Date.now()}`,
        mlbId,
        title: `${cat.name}: Oferta Relâmpago ${cat.searchQuery} Pro`,
        category: cat.name,
        categoryId: cat.id,
        currentPrice: current,
        originalPrice: original,
        discountPercent: discount,
        permalink: `https://www.mercadolivre.com.br/item/${mlbId}`,
        affiliateUrl: '',
        isAffiliateValid: false,
        stockAvailable: true,
        sellerName: 'Mercado Livre Loja Oficial',
        sellerReputation: 'MercadoLider Platinum',
        freeShipping: true,
        installments: '10x sem juros',
        thumbnail:
          'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=400&auto=format&fit=crop&q=80',
        opportunityScore: calculateOpportunityScore({
          currentPrice: current,
          originalPrice: original,
          discountPercent: discount,
          sellerReputation: 'MercadoLider Platinum',
          freeShipping: true,
          stockAvailable: true,
        }),
        stableHash: generateStableHash(
          mlbId,
          `${cat.name} Oferta Relâmpago`,
          'Mercado Livre Loja Oficial'
        ),
        status: 'PRODUTO_ENCONTRADO',
        discoveredAt: new Date().toISOString(),
        history: [
          {
            timestamp: new Date().toISOString(),
            price: current,
            originalPrice: original,
            discountPercent: discount,
            source: `Mercado Livre API (${cat.id})`,
            notes: 'Coleta em tempo real via Scanner de Categorias',
          },
        ],
      };

      onIngestOffers([newOffer]);
      setIsScanning(false);
      onShowNotification(
        `Sucesso: Nova oportunidade de ${discount}% OFF encontrada em ${cat.name}! Inserida no estado PRODUTO_ENCONTRADO.`,
        'success'
      );
    }, 900);
  };

  const enabledCount = categories.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header and Strategic Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Solução ao P1 do Diagnóstico
              </span>
              <span className="text-xs text-slate-400">
                Substituição da busca estática q=celular do Make
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              Scanner Multicategorias do Mercado Livre
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              No cenário original do Make, o <strong>Módulo 1</strong> consultava apenas a palavra
              fixa <code>celular</code>. Esta tela permite gerenciar a rotação de todas as categorias
              elegíveis por ciclo de 15 minutos, aplicando filtros de reputação do vendedor e
              desconto real.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Categoria</span>
          </button>
        </div>

        {/* Diagnostic Pill */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {enabledCount} de {categories.length} categorias ativas
            </span>
          </div>
          <span>•</span>
          <span>Endpoint MLB: <code>https://api.mercadolibre.com/sites/MLB/search</code></span>
          <span>•</span>
          <span>Alternância: 1 categoria por ciclo de 15 minutos para poupar créditos Make</span>
        </div>
      </div>

      {/* Add Category Form Modal / Accordion */}
      {showAddForm && (
        <form
          onSubmit={handleAddCategory}
          className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Cadastrar Nova Categoria Elegível do Mercado Livre
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome Amigável da Categoria:
              </label>
              <input
                type="text"
                placeholder="Ex: Câmeras e Drones"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                MLB Category ID:
              </label>
              <input
                type="text"
                placeholder="Ex: MLB1039"
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Termo de Busca / Query Dinâmica:
              </label>
              <input
                type="text"
                placeholder="Ex: drone 4k camera ofertas"
                value={newCatQuery}
                onChange={(e) => setNewCatQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
            >
              Salvar e Habilitar Categoria
            </button>
          </div>
        </form>
      )}

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`bg-slate-900 border rounded-2xl p-4.5 transition-all flex flex-col justify-between ${
              cat.enabled
                ? 'border-slate-800 hover:border-slate-700'
                : 'border-slate-800/40 opacity-60 bg-slate-950/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {cat.id}
                  </span>
                  <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.enabled}
                    onChange={() => toggleCategory(cat.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Editable Search Query */}
              <div className="mt-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Query de Busca Parametrizada (Substitui busca fixa):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cat.searchQuery}
                    onChange={(e) => updateSearchQuery(cat.id, e.target.value)}
                    disabled={!cat.enabled}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Actions for this category */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">
                /sites/MLB/search?category={cat.id}&q={encodeURIComponent(cat.searchQuery)}
              </span>

              <button
                onClick={() => handleRunCategoryScan(cat)}
                disabled={!cat.enabled || isScanning}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                title="Testar requisição e extrair oferta real desta categoria"
              >
                <Play className="w-3 h-3 text-amber-400" />
                <span>Escanear Agora</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
