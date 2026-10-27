import { useState, useCallback, useEffect, useRef } from 'react';

interface SoapData {
  identificacao: string;
  diagnosticoAdmissao: string;
  subjetivo: string;
  objetivo: {
    sinaisVitais: string;
    hemodinamica: string;
    respiratorio: string;
    neurologico: string;
    renal: string;
    gastrointestinal: string;
    hematologico: string;
    infectologico: string;
    metabolico: string;
    examesLaboratoriais: string;
    dispositivos: string;
    escores: string;
  };
  avaliacao: string;
  plano: string;
  informacoesAdicionais: string;
}

// ====== TOAST NOTIFICATION ======
interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColor = toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb';
  const icon = toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️';

  return (
    <div style={{
      background: bgColor,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'auto',
      minWidth: '250px',
    }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      {toast.text}
    </div>
  );
}

// ====== COPY UTILITY ======
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

// ====== PARSER FUNCTIONS ======
function createEmptySoap(): SoapData {
  return {
    identificacao: '',
    diagnosticoAdmissao: '',
    subjetivo: '',
    objetivo: {
      sinaisVitais: '', hemodinamica: '', respiratorio: '', neurologico: '',
      renal: '', gastrointestinal: '', hematologico: '', infectologico: '',
      metabolico: '', examesLaboratoriais: '', dispositivos: '', escores: '',
    },
    avaliacao: '',
    plano: '',
    informacoesAdicionais: '',
  };
}

function extractSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  const results: string[] = [];
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    for (const keyword of keywords) {
      if (lowerLine.includes(keyword.toLowerCase())) {
        results.push(line.trim());
        break;
      }
    }
  }
  return results.join('\n');
}

function extractByHeader(text: string, header: string): string {
  const lines = text.split('\n');
  let capturing = false;
  const results: string[] = [];
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.includes(header.toLowerCase())) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (line.trim().length > 0 && line.trim().length < 50 && /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(line.trim()) && line.trim().includes(':')) {
        break;
      }
      if (line.trim()) {
        results.push(line.trim());
      }
    }
  }
  return results.join('\n');
}

function parseRawText(rawText: string, additionalInfo: string): SoapData {
  const soap = createEmptySoap();

  const idKeywords = ['paciente', 'nome', 'idade', 'leito', 'quarto', 'prontuário', 'internação', 'dia de uti', 'dx de admissão', 'diagnóstico de admissão'];
  soap.identificacao = extractSection(rawText, idKeywords);

  const dxKeywords = ['dx de admissão', 'diagnóstico de admissão', 'diagnostico de admissao', 'motivo internação', 'motivo da internação'];
  soap.diagnosticoAdmissao = extractSection(rawText, dxKeywords);

  const subKeywords = ['subjetivo', 'queixa', 'história', 'historia', 'relata', 'refere', 'acompanhante', 'família', 'sintoma'];
  soap.subjetivo = extractSection(rawText, subKeywords);

  const svKeywords = ['pa ', 'pa:', 'pressão arterial', 'fc ', 'fc:', 'frequência cardíaca', 'fr ', 'fr:', 'frequência respiratória', 'temp', 'temperatura', 'spo2', 'saturação', 'saturacao', 'tmax', 'sinais vitais', 'ta:', 'pam', 'sv:'];
  soap.objetivo.sinaisVitais = extractSection(rawText, svKeywords);

  const hemoKeywords = ['hemodinâmica', 'hemodinamica', 'vasopressor', 'noradrenalina', 'adrenalina', 'vasopressina', 'dobutamina', 'débito cardíaco', 'picc', 'cvc', 'pvc'];
  soap.objetivo.hemodinamica = extractSection(rawText, hemoKeywords);

  const respKeywords = ['respiratório', 'respiratorio', 'vm ', 'vm:', 'ventilação', 'ventilacao', 'ventilatório', 'ventilatorio', 'peep', 'fio2', 'pplat', 'pico', 'weaning', 'extubação', 'extubacao', 'traqueostomia', 'oxigênio', 'oxigenio', 'gasometria', 'pco2', 'po2'];
  soap.objetivo.respiratorio = extractSection(rawText, respKeywords);

  const neuroKeywords = ['neurológico', 'neurologico', 'glasgow', 'pupilas', 'sedação', 'sedacao', 'rass', 'richmond', 'delirium', 'cam-icu', 'convulsão', 'focalidade', 'midríase', 'isocóricas', 'isocoricas'];
  soap.objetivo.neurologico = extractSection(rawText, neuroKeywords);

  const renalKeywords = ['renal', 'diurese', 'urina', 'creatinina', 'ureia', 'hemodiálise', 'hemodialise', 'balanço hídrico', 'balanco hidrico', 'bhd', 'edema'];
  soap.objetivo.renal = extractSection(rawText, renalKeywords);

  const giKeywords = ['gastrointestinal', 'hepático', 'hepatico', 'abdome', 'abdominal', 'dieta', 'nutrição', 'nutricao', 'sng', 'evacuação', 'evacuacao', 'ascite', 'distensão', 'rha'];
  soap.objetivo.gastrointestinal = extractSection(rawText, giKeywords);

  const hemaKeywords = ['hematológico', 'hematologico', 'hemoglobina', 'hematócrito', 'hematocrito', 'plaquetas', 'leucócitos', 'leucocitos', 'coagulograma', 'inr', 'transfusão', 'transfusao', 'anemia', 'sangramento'];
  soap.objetivo.hematologico = extractSection(rawText, hemaKeywords);

  const infKeywords = ['infecto', 'infecção', 'infeccao', 'procalcitonina', 'cultura', 'hemocultura', 'antibiótico', 'antibiotico', 'meropenem', 'piperacilina', 'vancomicina', 'febre', 'sepsis', 'sépsis', 'pct'];
  soap.objetivo.infectologico = extractSection(rawText, infKeywords);

  const metKeywords = ['metabólico', 'metabolico', 'glicemia', 'glicose', 'insulina', 'sódio', 'sodio', 'potássio', 'potassio', 'cálcio', 'calcio', 'magnésio', 'magnesio', 'lactato', 'acidose', 'alcalose', 'eletrólitos'];
  soap.objetivo.metabolico = extractSection(rawText, metKeywords);

  const examKeywords = ['exame', 'laboratório', 'laboratorio', 'tc ', 'raio-x', 'rx ', 'ecocardiograma', 'tomografia', 'ultrassom', 'biópsia', 'resultado'];
  soap.objetivo.examesLaboratoriais = extractSection(rawText, examKeywords);

  const devKeywords = ['dispositivo', 'dreno', 'sonda', 'jal', 'arterial', 'acesso venoso', 'acesso arterial', 'iot', 'tqt'];
  soap.objetivo.dispositivos = extractSection(rawText, devKeywords);

  const scoreKeywords = ['escore', 'sofa', 'apache', 'rass', 'cam-icu', 'qsofa', 'score'];
  soap.objetivo.escores = extractSection(rawText, scoreKeywords);

  const avalKeywords = ['avaliação', 'avaliacao', 'hipótese', 'hipotese', 'diagnóstico atual', 'quadro', 'evolução', 'evolucao', 'melhora', 'piora', 'estável', 'estavel', 'grave', 'crítico', 'critico'];
  soap.avaliacao = extractSection(rawText, avalKeywords);

  const planKeywords = ['plano', 'conduta', 'prescrição', 'prescricao', 'medicação', 'medicacao', 'ajuste', 'manter', 'suspender', 'iniciar', 'trocar', 'meta', 'solicitar', 'interconsulta', 'procedimento'];
  soap.plano = extractSection(rawText, planKeywords);

  if (additionalInfo.trim()) {
    soap.informacoesAdicionais = additionalInfo.trim();
    const additionalLower = additionalInfo.toLowerCase();
    if (additionalLower.includes('sv:') || additionalLower.includes('sinais vitais')) {
      const svSection = extractByHeader(additionalInfo, 'sv:') || extractByHeader(additionalInfo, 'sinais vitais');
      if (svSection) soap.objetivo.sinaisVitais = svSection;
    }
    if (additionalLower.includes('plano:') || additionalLower.includes('conduta')) {
      const planSection = extractByHeader(additionalInfo, 'plano:') || extractByHeader(additionalInfo, 'conduta');
      if (planSection) soap.plano = planSection;
    }
    if (additionalLower.includes('avaliação:') || additionalLower.includes('avaliacao:')) {
      const avalSection = extractByHeader(additionalInfo, 'avaliação:') || extractByHeader(additionalInfo, 'avaliacao:');
      if (avalSection) soap.avaliacao = avalSection;
    }
  }

  return soap;
}

function formatSoapForDisplay(soap: SoapData): string {
  let output = '';
  output += '═══════════════════════════════════════\n';
  output += '         EVOLUÇÃO MÉDICA - UTI\n';
  output += '═══════════════════════════════════════\n\n';
  if (soap.identificacao) output += '▸ IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  if (soap.diagnosticoAdmissao) output += '▸ DIAGNÓSTICO DE ADMISSÃO:\n' + soap.diagnosticoAdmissao + '\n\n';
  output += '───────────────────────────────────────\n';
  output += 'S - SUBJETIVO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.subjetivo || 'Não informado') + '\n\n';
  output += '───────────────────────────────────────\n';
  output += 'O - OBJETIVO\n';
  output += '───────────────────────────────────────\n\n';
  if (soap.objetivo.sinaisVitais) output += '  • Sinais Vitais:\n    ' + soap.objetivo.sinaisVitais.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.hemodinamica) output += '  • Hemodinâmica:\n    ' + soap.objetivo.hemodinamica.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.respiratorio) output += '  • Respiratório:\n    ' + soap.objetivo.respiratorio.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.neurologico) output += '  • Neurológico:\n    ' + soap.objetivo.neurologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.renal) output += '  • Renal:\n    ' + soap.objetivo.renal.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.gastrointestinal) output += '  • Gastrointestinal:\n    ' + soap.objetivo.gastrointestinal.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.hematologico) output += '  • Hematológico:\n    ' + soap.objetivo.hematologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.infectologico) output += '  • Infectológico:\n    ' + soap.objetivo.infectologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.metabolico) output += '  • Metabólico:\n    ' + soap.objetivo.metabolico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.examesLaboratoriais) output += '  • Exames:\n    ' + soap.objetivo.examesLaboratoriais.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.dispositivos) output += '  • Dispositivos:\n    ' + soap.objetivo.dispositivos.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.escores) output += '  • Escores:\n    ' + soap.objetivo.escores.replace(/\n/g, '\n    ') + '\n\n';
  output += '───────────────────────────────────────\n';
  output += 'A - AVALIAÇÃO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.avaliacao || 'Não informado') + '\n\n';
  output += '───────────────────────────────────────\n';
  output += 'P - PLANO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.plano || 'Não informado') + '\n\n';
  if (soap.informacoesAdicionais) {
    output += '───────────────────────────────────────\n';
    output += '▸ INFORMAÇÕES ADICIONAIS\n';
    output += '───────────────────────────────────────\n';
    output += soap.informacoesAdicionais + '\n\n';
  }
  output += '═══════════════════════════════════════\n';
  return output;
}

function formatSoapSimple(soap: SoapData): string {
  let output = '';
  output += 'EVOLUÇÃO MÉDICA - UTI\n\n';
  if (soap.identificacao) output += 'IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  if (soap.diagnosticoAdmissao) output += 'DIAGNÓSTICO DE ADMISSÃO:\n' + soap.diagnosticoAdmissao + '\n\n';
  output += 'S - SUBJETIVO:\n' + (soap.subjetivo || '-') + '\n\n';
  output += 'O - OBJETIVO:\n';
  if (soap.objetivo.sinaisVitais) output += 'SV: ' + soap.objetivo.sinaisVitais + '\n';
  if (soap.objetivo.hemodinamica) output += 'Hemodinâmica: ' + soap.objetivo.hemodinamica + '\n';
  if (soap.objetivo.respiratorio) output += 'Respiratório: ' + soap.objetivo.respiratorio + '\n';
  if (soap.objetivo.neurologico) output += 'Neurológico: ' + soap.objetivo.neurologico + '\n';
  if (soap.objetivo.renal) output += 'Renal: ' + soap.objetivo.renal + '\n';
  if (soap.objetivo.gastrointestinal) output += 'GI: ' + soap.objetivo.gastrointestinal + '\n';
  if (soap.objetivo.hematologico) output += 'Hematológico: ' + soap.objetivo.hematologico + '\n';
  if (soap.objetivo.infectologico) output += 'Infecto: ' + soap.objetivo.infectologico + '\n';
  if (soap.objetivo.metabolico) output += 'Metabólico: ' + soap.objetivo.metabolico + '\n';
  if (soap.objetivo.examesLaboratoriais) output += 'Exames: ' + soap.objetivo.examesLaboratoriais + '\n';
  if (soap.objetivo.dispositivos) output += 'Dispositivos: ' + soap.objetivo.dispositivos + '\n';
  if (soap.objetivo.escores) output += 'Escores: ' + soap.objetivo.escores + '\n';
  output += '\nA - AVALIAÇÃO:\n' + (soap.avaliacao || '-') + '\n\n';
  output += 'P - PLANO:\n' + (soap.plano || '-') + '\n';
  return output;
}

// ====== MAIN APP ======
function App() {
  const [rawText, setRawText] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [soapData, setSoapData] = useState<SoapData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identificacao: true, subjetivo: true, objetivo: true, avaliacao: true, plano: true,
  });
  const [viewMode, setViewMode] = useState<'structured' | 'text'>('structured');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleProcess = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseRawText(rawText, additionalInfo);
    setSoapData(parsed);
    addToast('Evolução organizada com sucesso!', 'success');
  }, [rawText, additionalInfo, addToast]);

  const handleCopyFull = useCallback(async () => {
    if (!soapData) return;
    const text = formatSoapForDisplay(soapData);
    const success = await copyToClipboard(text);
    if (success) {
      addToast('📋 Evolução completa copiada!', 'success');
    } else {
      addToast('Erro ao copiar. Tente novamente.', 'error');
    }
  }, [soapData, addToast]);

  const handleCopySimple = useCallback(async () => {
    if (!soapData) return;
    const text = formatSoapSimple(soapData);
    const success = await copyToClipboard(text);
    if (success) {
      addToast('📄 Evolução simplificada copiada!', 'success');
    } else {
      addToast('Erro ao copiar. Tente novamente.', 'error');
    }
  }, [soapData, addToast]);

  const handleCopySection = useCallback(async (label: string, content: string) => {
    const text = `${label}:\n${content}`;
    const success = await copyToClipboard(text);
    if (success) {
      addToast(`📋 "${label}" copiado!`, 'success');
    } else {
      addToast('Erro ao copiar.', 'error');
    }
  }, [addToast]);

  const handleShowCopyModal = useCallback(() => {
    if (!soapData) return;
    setCopiedPreview(formatSoapSimple(soapData));
    setShowCopyModal(true);
  }, [soapData]);

  const handleCopyFromModal = useCallback(async () => {
    const success = await copyToClipboard(copiedPreview);
    if (success) {
      addToast('✅ Texto copiado com sucesso!', 'success');
    } else {
      addToast('Erro ao copiar.', 'error');
    }
  }, [copiedPreview, addToast]);

  const handleClear = useCallback(() => {
    setRawText('');
    setAdditionalInfo('');
    setSoapData(null);
    addToast('Dados limpos', 'info');
  }, [addToast]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasContent = (text: string) => text && text.trim().length > 0;

  const getObjectiveSections = () => {
    if (!soapData) return [];
    return [
      { key: 'sinaisVitais', label: 'Sinais Vitais', emoji: '💓', content: soapData.objetivo.sinaisVitais },
      { key: 'hemodinamica', label: 'Hemodinâmica', emoji: '🫀', content: soapData.objetivo.hemodinamica },
      { key: 'respiratorio', label: 'Respiratório', emoji: '🫁', content: soapData.objetivo.respiratorio },
      { key: 'neurologico', label: 'Neurológico', emoji: '🧠', content: soapData.objetivo.neurologico },
      { key: 'renal', label: 'Renal', emoji: '💧', content: soapData.objetivo.renal },
      { key: 'gastrointestinal', label: 'Gastrointestinal', emoji: '🩺', content: soapData.objetivo.gastrointestinal },
      { key: 'hematologico', label: 'Hematológico', emoji: '🩸', content: soapData.objetivo.hematologico },
      { key: 'infectologico', label: 'Infectológico', emoji: '🛡️', content: soapData.objetivo.infectologico },
      { key: 'metabolico', label: 'Metabólico', emoji: '⚡', content: soapData.objetivo.metabolico },
      { key: 'examesLaboratoriais', label: 'Exames Complementares', emoji: '🔬', content: soapData.objetivo.examesLaboratoriais },
      { key: 'dispositivos', label: 'Dispositivos', emoji: '📎', content: soapData.objetivo.dispositivos },
      { key: 'escores', label: 'Escores', emoji: '📊', content: soapData.objetivo.escores },
    ].filter(s => hasContent(s.content));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0' }}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Copy Modal */}
      {showCopyModal && soapData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setShowCopyModal(false)}>
          <div style={{
            background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
            maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Copiar Evolução</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Selecione o formato e copie</p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                style={{ background: '#334155', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            {/* Format Buttons */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCopiedPreview(formatSoapSimple(soapData))}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: copiedPreview === formatSoapSimple(soapData) ? '#059669' : '#334155',
                  color: copiedPreview === formatSoapSimple(soapData) ? '#fff' : '#94a3b8',
                }}
              >📄 Formato Simples</button>
              <button
                onClick={() => setCopiedPreview(formatSoapForDisplay(soapData))}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: copiedPreview === formatSoapForDisplay(soapData) ? '#059669' : '#334155',
                  color: copiedPreview === formatSoapForDisplay(soapData) ? '#fff' : '#94a3b8',
                }}
              >📋 Formato Completo</button>
            </div>

            {/* Preview */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              <textarea
                ref={textareaRef}
                value={copiedPreview}
                onChange={(e) => setCopiedPreview(e.target.value)}
                style={{
                  width: '100%', minHeight: '300px', padding: '16px',
                  background: '#0f172a', color: '#e2e8f0', fontSize: '13px',
                  fontFamily: 'monospace', border: '1px solid #334155',
                  borderRadius: '8px', resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px', borderTop: '1px solid #334155',
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
            }}>
              <button
                onClick={() => setShowCopyModal(false)}
                style={{ padding: '10px 20px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
              >Fechar</button>
              <button
                onClick={handleCopyFromModal}
                style={{
                  padding: '10px 24px', fontSize: '14px',
                  background: 'linear-gradient(135deg, #059669, #0d9488)',
                  color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                }}
              >📋 Copiar Texto</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: 'rgba(30,41,59,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #0d9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🏥
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Evolução Médica UTI</h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Formato SOAP Modificado</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {soapData && (
              <button
                onClick={handleShowCopyModal}
                style={{
                  padding: '8px 16px', fontSize: '14px', fontWeight: 600,
                  background: 'linear-gradient(135deg, #059669, #0d9488)',
                  color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                }}
              >
                📋 Copiar Evolução
              </button>
            )}
            <button
              onClick={handleClear}
              style={{ padding: '8px 12px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🗑️ Limpar
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Input Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Raw Text Input */}
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Brutas</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Cole aqui os dados do paciente</span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Cole aqui todas as informações do paciente...\n\nExemplo:\nPaciente João Silva, 65 anos, leito 302, 5° dia de UTI\nDX admissão: Choque séptico de foco pulmonar\n\nSV: PA 110/65, FC 88, FR 18, Temp 37.2, SpO2 95%\nHemodinâmica: Noradrenalina 0.1 mcg/kg/min, PAM 72\nRespiratório: VM - PCV, PEEP 8, FiO2 40%, Pplat 28\nNeurológico: Glasgow 14, RASS -1, pupilas isocóricas\nRenal: Diurese 800ml/24h, Cr 1.8\n\nPlano: Manter antibioticoterapia, weaning respiratório`}
              style={{ width: '100%', height: '256px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Additional Info Input */}
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>✏️</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Adicionais / Correções</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Substituem/complementam dados</span>
            </div>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder={`Adicione informações que devem SUBSTITUIR ou COMPLEMENTAR os dados colados.\n\nUse cabeçalhos para substituir seções:\n\nSV: PA 120/70, FC 75, Temp 36.8\nPlano: Suspender noradrenalina, iniciar dieta oral\nAvaliação: Paciente estável, melhora progressiva\n\nOu adicione informações gerais como complemento.`}
              style={{ width: '100%', height: '256px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Process Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button
            onClick={handleProcess}
            disabled={!rawText.trim()}
            style={{
              padding: '12px 32px',
              background: rawText.trim() ? 'linear-gradient(135deg, #059669, #0d9488)' : '#475569',
              color: '#fff', fontWeight: 600, fontSize: '16px', border: 'none', borderRadius: '12px',
              cursor: rawText.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: rawText.trim() ? '0 4px 14px rgba(5,150,105,0.3)' : 'none',
            }}
          >
            🔄 Organizar em Formato SOAP
          </button>
        </div>

        {/* Results */}
        {soapData && (
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            {/* Results Header */}
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Evolução Organizada</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#334155', borderRadius: '8px', padding: '2px' }}>
                  <button
                    onClick={() => setViewMode('structured')}
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: viewMode === 'structured' ? '#059669' : 'transparent',
                      color: viewMode === 'structured' ? '#fff' : '#94a3b8',
                    }}
                  >Estruturado</button>
                  <button
                    onClick={() => setViewMode('text')}
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: viewMode === 'text' ? '#059669' : 'transparent',
                      color: viewMode === 'text' ? '#fff' : '#94a3b8',
                    }}
                  >Texto</button>
                </div>
                <button
                  onClick={handleCopySimple}
                  style={{ padding: '6px 12px', fontSize: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                >📄 Copiar Simples</button>
                <button
                  onClick={handleCopyFull}
                  style={{ padding: '6px 12px', fontSize: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                >📋 Copiar Completo</button>
              </div>
            </div>

            {/* Results Content */}
            <div style={{ padding: '16px' }}>
              {viewMode === 'text' ? (
                <div style={{ position: 'relative' }}>
                  <pre style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '16px', overflowX: 'auto', margin: 0 }}>
                    {formatSoapForDisplay(soapData)}
                  </pre>
                  <button
                    onClick={handleCopyFull}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                      background: 'linear-gradient(135deg, #059669, #0d9488)',
                      color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >📋 Copiar Tudo</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Identificação */}
                  {hasContent(soapData.identificacao) && (
                    <CollapsibleSection
                      title="Identificação" emoji="📝" content={soapData.identificacao}
                      expanded={expandedSections.identificacao} onToggle={() => toggleSection('identificacao')}
                      borderColor="#3b82f6" onCopy={() => handleCopySection('Identificação', soapData.identificacao)}
                    />
                  )}

                  {/* Diagnóstico */}
                  {hasContent(soapData.diagnosticoAdmissao) && (
                    <CollapsibleSection
                      title="Diagnóstico de Admissão" emoji="🔴" content={soapData.diagnosticoAdmissao}
                      expanded={expandedSections.identificacao} onToggle={() => toggleSection('identificacao')}
                      borderColor="#ef4444" onCopy={() => handleCopySection('Diagnóstico de Admissão', soapData.diagnosticoAdmissao)}
                    />
                  )}

                  {/* Subjetivo */}
                  <CollapsibleSection
                    title="S - Subjetivo" emoji="💬" content={soapData.subjetivo || 'Não informado'}
                    expanded={expandedSections.subjetivo} onToggle={() => toggleSection('subjetivo')}
                    borderColor="#a855f7" onCopy={() => handleCopySection('S - Subjetivo', soapData.subjetivo || 'Não informado')}
                  />

                  {/* Objetivo */}
                  <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <button
                      onClick={() => toggleSection('objetivo')}
                      style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🔍</span>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>O - Objetivo</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>({getObjectiveSections().length} itens)</span>
                      </div>
                      <span style={{ color: '#94a3b8' }}>{expandedSections.objetivo ? '▲' : '▼'}</span>
                    </button>
                    {expandedSections.objetivo && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {getObjectiveSections().length > 0 ? (
                          getObjectiveSections().map((section) => (
                            <div key={section.key} style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{section.emoji}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>{section.label}</span>
                                </div>
                                <button
                                  onClick={() => handleCopySection(section.label, section.content)}
                                  style={{
                                    padding: '3px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                  }}
                                  title={`Copiar ${section.label}`}
                                >📋 Copiar</button>
                              </div>
                              <p style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0 }}>{section.content}</p>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Nenhum dado objetivo identificado</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Avaliação */}
                  <CollapsibleSection
                    title="A - Avaliação" emoji="🧠" content={soapData.avaliacao || 'Não informado'}
                    expanded={expandedSections.avaliacao} onToggle={() => toggleSection('avaliacao')}
                    borderColor="#f59e0b" onCopy={() => handleCopySection('A - Avaliação', soapData.avaliacao || 'Não informado')}
                  />

                  {/* Plano */}
                  <CollapsibleSection
                    title="P - Plano" emoji="📋" content={soapData.plano || 'Não informado'}
                    expanded={expandedSections.plano} onToggle={() => toggleSection('plano')}
                    borderColor="#14b8a6" onCopy={() => handleCopySection('P - Plano', soapData.plano || 'Não informado')}
                  />

                  {/* Informações Adicionais */}
                  {hasContent(soapData.informacoesAdicionais) && (
                    <div style={{ background: 'rgba(120,53,15,0.2)', borderRadius: '12px', border: '1px solid rgba(180,83,9,0.3)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>✏️</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>Informações Adicionais</span>
                        </div>
                        <button
                          onClick={() => handleCopySection('Informações Adicionais', soapData.informacoesAdicionais)}
                          style={{
                            padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >📋 Copiar</button>
                      </div>
                      <div style={{ padding: '0 16px 12px' }}>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0 }}>{soapData.informacoesAdicionais}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Big Copy Button at Bottom */}
            <div style={{
              padding: '16px', borderTop: '1px solid #334155',
              display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap',
            }}>
              <button
                onClick={handleShowCopyModal}
                style={{
                  padding: '14px 32px', fontSize: '16px', fontWeight: 700,
                  background: 'linear-gradient(135deg, #059669, #0d9488)',
                  color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: '0 4px 20px rgba(5,150,105,0.4)',
                  width: '100%', maxWidth: '400px', justifyContent: 'center',
                }}
              >
                📋 Copiar Evolução Completa
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!soapData && (
          <div style={{ marginTop: '32px', background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px solid #334155', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📖 Como usar
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(5,150,105,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>1</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Cole as informações</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Cole no campo esquerdo todas as informações brutas do paciente (anotações, monitorização, exames, etc.)</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Adicione correções</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Use o campo direito para informações que devem SUBSTITUIR ou COMPLEMENTAR os dados. Use cabeçalhos como "SV:", "Plano:", etc.</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(20,184,166,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#2dd4bf', fontWeight: 'bold', fontSize: '14px' }}>3</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Organize e copie</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Clique em "Organizar" para gerar a evolução SOAP. Use o botão "📋 Copiar Evolução" para copiar o resultado.</p>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px', marginTop: 0 }}>Formato SOAP Modificado para UTI:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                <div><span style={{ color: '#a855f7', fontWeight: 600 }}>S</span> - Subjetivo (queixas, história)</div>
                <div><span style={{ color: '#34d399', fontWeight: 600 }}>O</span> - Objetivo (sinais vitais, exames, sistemas)</div>
                <div><span style={{ color: '#fbbf24', fontWeight: 600 }}>A</span> - Avaliação (hipóteses, estado atual)</div>
                <div><span style={{ color: '#2dd4bf', fontWeight: 600 }}>P</span> - Plano (condutas, prescrições)</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '32px', padding: '16px', borderTop: '1px solid #1e293b' }}>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: 0 }}>
          Evolução Médica UTI • Formato SOAP Modificado • Uso profissional
        </p>
      </footer>
    </div>
  );
}

// ====== COLLAPSIBLE SECTION WITH COPY ======
interface CollapsibleSectionProps {
  title: string;
  emoji: string;
  content: string;
  expanded: boolean;
  onToggle: () => void;
  borderColor: string;
  onCopy?: () => void;
}

function CollapsibleSection({ title, emoji, content, expanded, onToggle, borderColor, onCopy }: CollapsibleSectionProps) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: `1px solid ${borderColor}33`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={onToggle}
          style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{emoji}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{title}</span>
          </div>
          <span style={{ color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </button>
        {onCopy && (
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            style={{
              padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8',
              border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '12px',
              display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
            }}
            title={`Copiar ${title}`}
          >📋 Copiar</button>
        )}
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          <p style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0 }}>{content}</p>
        </div>
      )}
    </div>
  );
}

export default App;
