import { useState, useCallback } from 'react';
import {
  Clipboard,
  ClipboardCheck,
  FileText,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Heart,
  Activity,
  Brain,
  Droplets,
  Wind,
  TestTube,
  Shield,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { parseRawText, formatSoapForDisplay, formatSoapSimple, createEmptySoap, type SoapData } from './utils/parser';

function App() {
  const [rawText, setRawText] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [soapData, setSoapData] = useState<SoapData | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSimple, setCopiedSimple] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identificacao: true,
    subjetivo: true,
    objetivo: true,
    avaliacao: true,
    plano: true,
  });
  const [viewMode, setViewMode] = useState<'structured' | 'text'>('structured');

  const handleProcess = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseRawText(rawText, additionalInfo);
    setSoapData(parsed);
  }, [rawText, additionalInfo]);

  const handleCopyFull = useCallback(() => {
    if (!soapData) return;
    const text = formatSoapForDisplay(soapData);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [soapData]);

  const handleCopySimple = useCallback(() => {
    if (!soapData) return;
    const text = formatSoapSimple(soapData);
    navigator.clipboard.writeText(text);
    setCopiedSimple(true);
    setTimeout(() => setCopiedSimple(false), 2000);
  }, [soapData]);

  const handleClear = useCallback(() => {
    setRawText('');
    setAdditionalInfo('');
    setSoapData(null);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasContent = (text: string) => text && text.trim().length > 0;

  const getObjectiveSections = () => {
    if (!soapData) return [];
    return [
      { key: 'sinaisVitais', label: 'Sinais Vitais', icon: <Activity size={16} />, content: soapData.objetivo.sinaisVitais },
      { key: 'hemodinamica', label: 'Hemodinâmica', icon: <Heart size={16} />, content: soapData.objetivo.hemodinamica },
      { key: 'respiratorio', label: 'Respiratório', icon: <Wind size={16} />, content: soapData.objetivo.respiratorio },
      { key: 'neurologico', label: 'Neurológico', icon: <Brain size={16} />, content: soapData.objetivo.neurologico },
      { key: 'renal', label: 'Renal', icon: <Droplets size={16} />, content: soapData.objetivo.renal },
      { key: 'gastrointestinal', label: 'Gastrointestinal', icon: <Stethoscope size={16} />, content: soapData.objetivo.gastrointestinal },
      { key: 'hematologico', label: 'Hematológico', icon: <TestTube size={16} />, content: soapData.objetivo.hematologico },
      { key: 'infectologico', label: 'Infectológico', icon: <Shield size={16} />, content: soapData.objetivo.infectologico },
      { key: 'metabolico', label: 'Metabólico', icon: <Activity size={16} />, content: soapData.objetivo.metabolico },
      { key: 'examesLaboratoriais', label: 'Exames Complementares', icon: <TestTube size={16} />, content: soapData.objetivo.examesLaboratoriais },
      { key: 'dispositivos', label: 'Dispositivos', icon: <FileText size={16} />, content: soapData.objetivo.dispositivos },
      { key: 'escores', label: 'Escores', icon: <AlertCircle size={16} />, content: soapData.objetivo.escores },
    ].filter(s => hasContent(s.content));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
              <Stethoscope className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Evolução Médica UTI</h1>
              <p className="text-xs text-slate-400">Formato SOAP Modificado</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Limpar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Raw Text Input */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
              <Clipboard size={18} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Informações Brutas</h2>
              <span className="text-xs text-slate-400 ml-auto">Cole aqui os dados do paciente</span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Cole aqui todas as informações do paciente...\n\nExemplo:\nPaciente João Silva, 65 anos, leito 302, 5° dia de UTI\nDX admissão: Choque séptico de foco pulmonar\n\nSV: PA 110/65, FC 88, FR 18, Temp 37.2, SpO2 95%\nHemodinâmica: Noradrenalina 0.1 mcg/kg/min, PAM 72\nRespiratório: VM - PCV, PEEP 8, FiO2 40%, Pplat 28\nNeurológico: Glasgow 14, RASS -1, pupilas isocóricas\nRenal: Diurese 800ml/24h, Cr 1.8\n\nPlano: Manter antibioticoterapia, weaning respiratório, reavaliação em 6h`}
              className="w-full h-64 p-4 bg-slate-900/50 text-slate-200 text-sm font-mono placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Additional Info Input */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
              <Plus size={18} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Informações Adicionais / Correções</h2>
              <span className="text-xs text-slate-400 ml-auto">Substituem/complementam dados colados</span>
            </div>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder={`Adicione informações que devem SUBSTITUIR ou COMPLEMENTAR os dados colados.\n\nUse cabeçalhos para substituir seções específicas:\n\nSV: PA 120/70, FC 75, Temp 36.8\nPlano: Suspender noradrenalina, iniciar dieta oral\nAvaliação: Paciente estável, melhora progressiva\n\nOu simplesmente adicione informações gerais que serão incluídas como complemento.`}
              className="w-full h-64 p-4 bg-slate-900/50 text-slate-200 text-sm font-mono placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Process Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleProcess}
            disabled={!rawText.trim()}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-200 flex items-center gap-3 text-base"
          >
            <RefreshCw size={20} />
            Organizar em Formato SOAP
          </button>
        </div>

        {/* Results */}
        {soapData && (
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            {/* Results Header */}
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Evolução Organizada</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('structured')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'structured' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Estruturado
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'text' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Texto
                  </button>
                </div>
                <button
                  onClick={handleCopySimple}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copiedSimple ? <ClipboardCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedSimple ? 'Copiado!' : 'Copiar Simples'}
                </button>
                <button
                  onClick={handleCopyFull}
                  className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <ClipboardCheck size={12} /> : <Copy size={12} />}
                  {copied ? 'Copiado!' : 'Copiar Completo'}
                </button>
              </div>
            </div>

            {/* Results Content */}
            <div className="p-4">
              {viewMode === 'text' ? (
                <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap bg-slate-900/50 rounded-lg p-4 overflow-x-auto">
                  {formatSoapForDisplay(soapData)}
                </pre>
              ) : (
                <div className="space-y-3">
                  {/* Identificação */}
                  {hasContent(soapData.identificacao) && (
                    <SectionCard
                      title="Identificação"
                      icon={<FileText size={16} className="text-blue-400" />}
                      content={soapData.identificacao}
                      expanded={expandedSections.identificacao}
                      onToggle={() => toggleSection('identificacao')}
                      color="blue"
                    />
                  )}

                  {/* Diagnóstico de Admissão */}
                  {hasContent(soapData.diagnosticoAdmissao) && (
                    <SectionCard
                      title="Diagnóstico de Admissão"
                      icon={<AlertCircle size={16} className="text-red-400" />}
                      content={soapData.diagnosticoAdmissao}
                      expanded={expandedSections.identificacao}
                      onToggle={() => toggleSection('identificacao')}
                      color="red"
                    />
                  )}

                  {/* Subjetivo */}
                  <SectionCard
                    title="S - Subjetivo"
                    icon={<Clipboard size={16} className="text-purple-400" />}
                    content={soapData.subjetivo || 'Não informado'}
                    expanded={expandedSections.subjetivo}
                    onToggle={() => toggleSection('subjetivo')}
                    color="purple"
                  />

                  {/* Objetivo */}
                  <div className="bg-slate-900/40 rounded-xl border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => toggleSection('objetivo')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" />
                        <span className="text-sm font-semibold text-white">O - Objetivo</span>
                        <span className="text-xs text-slate-400">
                          ({getObjectiveSections().length} itens)
                        </span>
                      </div>
                      {expandedSections.objetivo ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>
                    {expandedSections.objetivo && (
                      <div className="px-4 pb-4 space-y-2">
                        {getObjectiveSections().length > 0 ? (
                          getObjectiveSections().map((section) => (
                            <div key={section.key} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-emerald-400">{section.icon}</span>
                                <span className="text-xs font-semibold text-emerald-300">{section.label}</span>
                              </div>
                              <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{section.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 italic">Nenhum dado objetivo identificado</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Avaliação */}
                  <SectionCard
                    title="A - Avaliação"
                    icon={<Brain size={16} className="text-amber-400" />}
                    content={soapData.avaliacao || 'Não informado'}
                    expanded={expandedSections.avaliacao}
                    onToggle={() => toggleSection('avaliacao')}
                    color="amber"
                  />

                  {/* Plano */}
                  <SectionCard
                    title="P - Plano"
                    icon={<Stethoscope size={16} className="text-teal-400" />}
                    content={soapData.plano || 'Não informado'}
                    expanded={expandedSections.plano}
                    onToggle={() => toggleSection('plano')}
                    color="teal"
                  />

                  {/* Informações Adicionais */}
                  {hasContent(soapData.informacoesAdicionais) && (
                    <div className="bg-amber-900/20 rounded-xl border border-amber-700/30 overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-2">
                        <Plus size={16} className="text-amber-400" />
                        <span className="text-sm font-semibold text-amber-300">Informações Adicionais</span>
                      </div>
                      <div className="px-4 pb-3">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{soapData.informacoesAdicionais}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!soapData && (
          <div className="mt-8 bg-slate-800/40 rounded-xl border border-slate-700 p-6">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" />
              Como usar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
                <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-emerald-400 font-bold text-sm">1</span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Cole as informações</h4>
                <p className="text-xs text-slate-400">
                  Cole no campo esquerdo todas as informações brutas do paciente (anotações, dados de monitorização, exames, etc.)
                </p>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
                <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-amber-400 font-bold text-sm">2</span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Adicione correções</h4>
                <p className="text-xs text-slate-400">
                  Use o campo direito para adicionar informações que devem SUBSTITUIR ou COMPLEMENTAR os dados colados. Use cabeçalhos como "SV:", "Plano:", etc.
                </p>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
                <div className="w-8 h-8 bg-teal-600/20 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-teal-400 font-bold text-sm">3</span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">Organize e copie</h4>
                <p className="text-xs text-slate-400">
                  Clique em "Organizar" para gerar a evolução no formato SOAP. Copie o resultado completo ou simplificado para o prontuário.
                </p>
              </div>
            </div>

            <div className="mt-4 bg-slate-900/40 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-white mb-2">Formato SOAP Modificado para UTI:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400">
                <div><span className="text-purple-400 font-semibold">S</span> - Subjetivo (queixas, história)</div>
                <div><span className="text-emerald-400 font-semibold">O</span> - Objetivo (sinais vitais, exames, sistemas)</div>
                <div><span className="text-amber-400 font-semibold">A</span> - Avaliação (hipóteses, estado atual)</div>
                <div><span className="text-teal-400 font-semibold">P</span> - Plano (condutas, prescrições)</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-slate-800">
        <p className="text-center text-xs text-slate-500">
          Evolução Médica UTI • Formato SOAP Modificado • Uso profissional
        </p>
      </footer>
    </div>
  );
}

// Section Card Component
interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  content: string;
  expanded: boolean;
  onToggle: () => void;
  color: string;
}

function SectionCard({ title, icon, content, expanded, onToggle, color }: SectionCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-700/30',
    red: 'border-red-700/30',
    purple: 'border-purple-700/30',
    amber: 'border-amber-700/30',
    teal: 'border-teal-700/30',
    emerald: 'border-emerald-700/30',
  };

  return (
    <div className={`bg-slate-900/40 rounded-xl border ${colorClasses[color] || 'border-slate-700'} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}

export default App;
