import { useState, useCallback, useEffect, useRef } from 'react';

// ====== TYPES ======
interface Diagnostico {
  texto: string;
  cid: string;
}

interface SoapData {
  identificacao: string;
  diagnosticos: Diagnostico[];
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

// ====== TOAST ======
interface ToastMessage { id: number; text: string; type: 'success' | 'error' | 'info'; }
let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
      {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />)}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }, 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  const bgColor = toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb';
  const icon = toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️';
  return (
    <div style={{
      background: bgColor, color: '#fff', padding: '12px 20px', borderRadius: '10px',
      fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'auto', minWidth: '250px',
    }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>{toast.text}
    </div>
  );
}

// ====== COPY UTILITY ======
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; textArea.style.left = '-9999px'; textArea.style.opacity = '0';
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch { return false; }
}

// ====== PARSER ======
function createEmptySoap(): SoapData {
  return {
    identificacao: '', diagnosticos: [], subjetivo: '',
    objetivo: {
      sinaisVitais: '', hemodinamica: '', respiratorio: '', neurologico: '',
      renal: '', gastrointestinal: '', hematologico: '', infectologico: '',
      metabolico: '', examesLaboratoriais: '', dispositivos: '', escores: '',
    },
    avaliacao: '', plano: '', informacoesAdicionais: '',
  };
}

// Classifica uma linha em uma seção específica (first match, sem duplicação)
function classifyLine(line: string): string | null {
  const lower = line.toLowerCase().trim();
  if (!lower) return null;

  // Identificação
  if (/^(paciente|nome|idade|leito|quarto|prontu[áa]rio|internação|internacao|dia de uti|d[úu]t[íi])/.test(lower)) return 'identificacao';

  // Diagnóstico de admissão
  if (/^(dx de admiss|diagn[óo]stico de admiss|dx admiss|motivo intern)/.test(lower)) return 'diagnostico';

  // Sinais vitais - APENAS sinais vitais (PA, FC, FR, Temp, SpO2, PAM)
  if (/^(sv:|sinais vitais|pa:|pa |ta:|pam:|pam |fc:|fc |fr:|fr |temp:|temp |temperatura|spo2|satura[çc][ãa]o|tmax)/.test(lower)) return 'sinaisVitais';

  // Hemodinâmica
  if (/^(hemodin[aâ]mica|vasopressor|noradrenalina|adrenalina|vasopressina|dobutamina|dopamina|pvc|picc|cvc)/.test(lower)) return 'hemodinamica';

  // Respiratório (inclui gasometria e parâmetros de VM)
  if (/^(respirat[óo]rio|vm:|vm |ventila[çc][ãa]o|ventilat[óo]rio|peep|fio2|pplat|pico|weaning|extuba[çc][ãa]o|traqueostomia|oxig[eê]nio|gaso|pco2|po2|ph |hco3|be |base excess|rela[çc][ãa]o p\/f)/.test(lower)) return 'respiratorio';

  // Neurológico
  if (/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|rass|richmond|delirium|cam-icu|convuls[ãa]o|focalidade|midr[íi]ase|isoc[óo]ricas|isocoricas|anisocoria|movimenta[çc][ãa]o)/.test(lower)) return 'neurologico';

  // Renal (inclui creatinina, ureia, diurese, balanço hídrico)
  if (/^(renal|diurese|urina|creatinina|ureia|hemodi[áa]lise|hemodialise|balan[çc]o h[íi]drico|balanco hidrico|bhd|crrt|tdc|catheter|volume total)/.test(lower)) return 'renal';

  // Gastrointestinal
  if (/^(gastrointestinal|gi:|hep[áa]tico|abdome|abdominal|dieta|nutri[çc][ãa]o|sng|sngt|evacua[çc][ãa]o|fezes|ascite|distens[ãa]o|rha|ru[íi]dos|tgp|tgo|bilirrubina|albumina|v[ôo]mito|n[áa]usea)/.test(lower)) return 'gastrointestinal';

  // Hematológico (hemograma, coagulação)
  if (/^(hematol[óo]gico|hemoglobina|hemat[óo]crito|plaquetas|leuc[óo]citos|coagulograma|inr|tpa|fibrinog[eê]nio|d-d[íi]mero|transfus[ãa]o|anemia|sangramento|hemorragia|ht:|hb:|hgb)/.test(lower)) return 'hematologico';

  // Infectológico
  if (/^(infecto|infec[çc][ãa]o|procalcitonina|pct|cultura|hemocultura|antibi[óo]tico|meropenem|piperacilina|vancomicina|febre|foco infeccioso|sepsis|s[ée]psis)/.test(lower)) return 'infectologico';

  // Metabólico (eletrólitos, glicemia, lactato)
  if (/^(metab[óo]lico|glicemia|glicose|insulina|s[óo]dio|pot[áa]ssio|c[áa]lcio|magn[ée]sio|fosfato|lactato|lact|acidose|alcalose|eletr[óo]litos|ionograma|na:|k:|cl:)/.test(lower)) return 'metabolico';

  // Dispositivos
  if (/^(dispositivo|dreno|sonda|jal|acesso venoso|acesso arterial|iot |tqt |m[áa]scara|mascara)/.test(lower)) return 'dispositivos';

  // Escores
  if (/^(escore|sofa|apache|qsofa|q-sofa|mlds|kidigo)/.test(lower)) return 'escores';

  // Exames complementares (imagem, ecocardiograma, etc.) - APENAS exames de imagem/procedimentos
  if (/^(exame|laborat[óo]rio|tc |raio.x|rx |ecocardiograma|tomografia|ultrassom|bi[óo]psia|usg|resson[aâ]ncia|endoscopia)/.test(lower)) return 'exames';

  // Avaliação
  if (/^(avalia[çc][ãa]o|hip[óo]tese|diagn[óo]stico atual|quadro cl[íi]nico|evolu[çc][ãa]o|melhora|piora|est[áa]vel|grave|cr[íi]tico|resposta terap)/.test(lower)) return 'avaliacao';

  // Plano
  if (/^(plano|conduta|prescri[çc][ãa]o|medica[çc][ãa]o|ajuste|manter|suspender|iniciar|trocar|meta|solicitar|interconsulta|procedimento)/.test(lower)) return 'plano';

  return null;
}

// Extrai diagnósticos de uma linha
function extractDiagnostico(line: string): Diagnostico | null {
  const lower = line.toLowerCase().trim();
  if (!/^(dx de admiss|diagn[óo]stico de admiss|dx admiss|motivo intern)/.test(lower)) return null;

  // Remove o prefixo
  let texto = line.replace(/^(dx de admiss[ãa]o|diagn[óo]stico de admiss[ãa]o|dx admiss[ãa]o|motivo da interna[çc][ãa]o|motivo interna[çc][ãa])\s*[:\-]?\s*/i, '').trim();

  // Verifica se já tem CID entre parênteses
  const cidMatch = texto.match(/\(([A-Z]\d[\d.]*)\)/);
  if (cidMatch) {
    const cid = cidMatch[1];
    const textoLimpo = texto.replace(/\([A-Z]\d[\d.]*\)/, '').trim();
    return { texto: textoLimpo, cid };
  }

  return { texto, cid: '' };
}

function parseRawText(rawText: string, additionalInfo: string): SoapData {
  const soap = createEmptySoap();
  const lines = rawText.split('\n');

  // Usamos sets para evitar duplicação
  const usedLines = new Set<number>();

  // Primeiro passo: classificar cada linha
  const lineClassifications: (string | null)[] = lines.map((line, idx) => {
    const classification = classifyLine(line);
    if (classification) usedLines.add(idx);
    return classification;
  });

  // Segundo passo: agrupar linhas por seção
  const sections: Record<string, string[]> = {
    identificacao: [],
    diagnostico: [],
    sinaisVitais: [],
    hemodinamica: [],
    respiratorio: [],
    neurologico: [],
    renal: [],
    gastrointestinal: [],
    hematologico: [],
    infectologico: [],
    metabolico: [],
    exames: [],
    dispositivos: [],
    escores: [],
    avaliacao: [],
    plano: [],
  };

  lineClassifications.forEach((cls, idx) => {
    if (cls && sections[cls]) {
      sections[cls].push(lines[idx].trim());
    }
  });

  // Terceiro passo: linhas não classificadas vão para "exames" como fallback
  lines.forEach((line, idx) => {
    if (!usedLines.has(idx) && line.trim()) {
      // Verificar se parece ser resultado de exame
      const lower = line.toLowerCase();
      if (/\d+\.\d+|mg\/dl|mmol|meq|ui\/l|g\/dl|mmhg|bpm/.test(line) || /^(resultado|dosagem|n[íi]vel)/.test(lower)) {
        sections.exames.push(line.trim());
      }
    }
  });

  // Aplicar aos campos do SOAP
  soap.identificacao = sections.identificacao.join('\n');

  // Processar diagnósticos
  sections.diagnostico.forEach(line => {
    const dx = extractDiagnostico(line);
    if (dx) soap.diagnosticos.push(dx);
  });

  soap.subjetivo = sections.avaliacao.length > 0 && /subjetivo|queixa|hist[óo]ria|relata|refere/i.test(sections.avaliacao[0])
    ? sections.avaliacao.join('\n') : '';

  soap.objetivo.sinaisVitais = sections.sinaisVitais.join('\n');
  soap.objetivo.hemodinamica = sections.hemodinamica.join('\n');
  soap.objetivo.respiratorio = sections.respiratorio.join('\n');
  soap.objetivo.neurologico = sections.neurologico.join('\n');
  soap.objetivo.renal = sections.renal.join('\n');
  soap.objetivo.gastrointestinal = sections.gastrointestinal.join('\n');
  soap.objetivo.hematologico = sections.hematologico.join('\n');
  soap.objetivo.infectologico = sections.infectologico.join('\n');
  soap.objetivo.metabolico = sections.metabolico.join('\n');
  soap.objetivo.examesLaboratoriais = sections.exames.join('\n');
  soap.objetivo.dispositivos = sections.dispositivos.join('\n');
  soap.objetivo.escores = sections.escores.join('\n');
  soap.avaliacao = sections.avaliacao.join('\n');
  soap.plano = sections.plano.join('\n');

  // Informações adicionais
  if (additionalInfo.trim()) {
    soap.informacoesAdicionais = additionalInfo.trim();
  }

  return soap;
}

function formatDiagnostico(dx: Diagnostico): string {
  if (dx.cid) return `${dx.texto} (${dx.cid})`;
  return dx.texto;
}

function formatSoapForDisplay(soap: SoapData): string {
  let output = '';
  output += '═══════════════════════════════════════\n';
  output += '         EVOLUÇÃO MÉDICA - UTI\n';
  output += '═══════════════════════════════════════\n\n';

  if (soap.identificacao) {
    output += '▸ IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  }

  if (soap.diagnosticos.length > 0) {
    output += '▸ DIAGNÓSTICO(S) DE ADMISSÃO:\n';
    soap.diagnosticos.forEach((dx, i) => {
      output += `  ${i + 1}. ${formatDiagnostico(dx)}\n`;
    });
    output += '\n';
  }

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
  if (soap.objetivo.gastrointestinal) output += '  • Gastrointestinal/Hepático:\n    ' + soap.objetivo.gastrointestinal.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.hematologico) output += '  • Hematológico:\n    ' + soap.objetivo.hematologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.infectologico) output += '  • Infectológico:\n    ' + soap.objetivo.infectologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.metabolico) output += '  • Metabólico/Eletrolítico:\n    ' + soap.objetivo.metabolico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.examesLaboratoriais) output += '  • Exames Complementares (Imagem/Procedimentos):\n    ' + soap.objetivo.examesLaboratoriais.replace(/\n/g, '\n    ') + '\n\n';
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
  if (soap.diagnosticos.length > 0) {
    output += 'DX ADMISSÃO:\n';
    soap.diagnosticos.forEach((dx, i) => {
      output += `${i + 1}. ${formatDiagnostico(dx)}\n`;
    });
    output += '\n';
  }
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
    identificacao: true, diagnosticos: true, subjetivo: true, objetivo: true, avaliacao: true, plano: true,
  });
  const [viewMode, setViewMode] = useState<'structured' | 'text'>('structured');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState('');

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
    if (success) addToast('📋 Evolução completa copiada!', 'success');
    else addToast('Erro ao copiar. Tente novamente.', 'error');
  }, [soapData, addToast]);

  const handleCopySimple = useCallback(async () => {
    if (!soapData) return;
    const text = formatSoapSimple(soapData);
    const success = await copyToClipboard(text);
    if (success) addToast('📄 Evolução simplificada copiada!', 'success');
    else addToast('Erro ao copiar. Tente novamente.', 'error');
  }, [soapData, addToast]);

  const handleCopySection = useCallback(async (label: string, content: string) => {
    const text = `${label}:\n${content}`;
    const success = await copyToClipboard(text);
    if (success) addToast(`📋 "${label}" copiado!`, 'success');
    else addToast('Erro ao copiar.', 'error');
  }, [addToast]);

  const handleShowCopyModal = useCallback(() => {
    if (!soapData) return;
    setCopiedPreview(formatSoapSimple(soapData));
    setShowCopyModal(true);
  }, [soapData]);

  const handleCopyFromModal = useCallback(async () => {
    const success = await copyToClipboard(copiedPreview);
    if (success) addToast('✅ Texto copiado com sucesso!', 'success');
    else addToast('Erro ao copiar.', 'error');
  }, [copiedPreview, addToast]);

  const handleClear = useCallback(() => {
    setRawText(''); setAdditionalInfo(''); setSoapData(null);
    addToast('Dados limpos', 'info');
  }, [addToast]);

  // Atualizar diagnóstico (texto ou CID)
  const handleUpdateDiagnostico = useCallback((index: number, field: 'texto' | 'cid', value: string) => {
    if (!soapData) return;
    const newDiagnosticos = [...soapData.diagnosticos];
    newDiagnosticos[index] = { ...newDiagnosticos[index], [field]: value };
    setSoapData({ ...soapData, diagnosticos: newDiagnosticos });
  }, [soapData]);

  // Adicionar novo diagnóstico
  const handleAddDiagnostico = useCallback(() => {
    if (!soapData) return;
    setSoapData({ ...soapData, diagnosticos: [...soapData.diagnosticos, { texto: '', cid: '' }] });
  }, [soapData]);

  // Remover diagnóstico
  const handleRemoveDiagnostico = useCallback((index: number) => {
    if (!soapData) return;
    const newDiagnosticos = soapData.diagnosticos.filter((_, i) => i !== index);
    setSoapData({ ...soapData, diagnosticos: newDiagnosticos });
  }, [soapData]);

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
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Copy Modal */}
      {showCopyModal && soapData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowCopyModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Copiar Evolução</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Selecione o formato e copie</p>
                </div>
              </div>
              <button onClick={() => setShowCopyModal(false)} style={{ background: '#334155', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setCopiedPreview(formatSoapSimple(soapData))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapSimple(soapData) ? '#059669' : '#334155', color: copiedPreview === formatSoapSimple(soapData) ? '#fff' : '#94a3b8' }}>📄 Formato Simples</button>
              <button onClick={() => setCopiedPreview(formatSoapForDisplay(soapData))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapForDisplay(soapData) ? '#059669' : '#334155', color: copiedPreview === formatSoapForDisplay(soapData) ? '#fff' : '#94a3b8' }}>📋 Formato Completo</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              <textarea value={copiedPreview} onChange={(e) => setCopiedPreview(e.target.value)} style={{ width: '100%', minHeight: '300px', padding: '16px', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: '1px solid #334155', borderRadius: '8px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCopyModal(false)} style={{ padding: '10px 20px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Fechar</button>
              <button onClick={handleCopyFromModal} style={{ padding: '10px 24px', fontSize: '14px', background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>📋 Copiar Texto</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: 'rgba(30,41,59,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #0d9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏥</div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Evolução Médica UTI</h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Formato SOAP Modificado</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {soapData && (
              <button onClick={handleShowCopyModal} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                📋 Copiar Evolução
              </button>
            )}
            <button onClick={handleClear} style={{ padding: '8px 12px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>🗑️ Limpar</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Input Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Brutas</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Cole aqui os dados do paciente</span>
            </div>
            <textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
              placeholder={`Cole aqui todas as informações do paciente...\n\nExemplo:\nPaciente João Silva, 65 anos, leito 302, 5° dia de UTI\nDX admissão: Choque séptico de foco pulmonar\n\nSV: PA 110/65, FC 88, FR 18, Temp 37.2, SpO2 95%\nHemodinâmica: Noradrenalina 0.1 mcg/kg/min, PAM 72\nRespiratório: VM - PCV, PEEP 8, FiO2 40%, Pplat 28\nNeurológico: Glasgow 14, RASS -1, pupilas isocóricas\nRenal: Diurese 800ml/24h, Cr 1.8\nCreatinina: 1.8 mg/dL\nUreia: 65 mg/dL\nHemoglobina: 9.2 g/dL\nHematócrito: 28%\nPlaquetas: 145.000\nGasometria: pH 7.38, pCO2 42, pO2 78\n\nPlano: Manter antibioticoterapia, weaning respiratório`}
              style={{ width: '100%', height: '280px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>✏️</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Adicionais / Correções</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Substituem/complementam dados</span>
            </div>
            <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder={`Adicione informações que devem SUBSTITUIR ou COMPLEMENTAR os dados colados.\n\nUse cabeçalhos para substituir seções:\n\nSV: PA 120/70, FC 75, Temp 36.8\nPlano: Suspender noradrenalina, iniciar dieta oral\nAvaliação: Paciente estável, melhora progressiva\n\nOu adicione informações gerais como complemento.\n\nDica: Você pode editar os CIDs dos diagnósticos diretamente na evolução gerada.`}
              style={{ width: '100%', height: '280px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Process Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button onClick={handleProcess} disabled={!rawText.trim()} style={{ padding: '12px 32px', background: rawText.trim() ? 'linear-gradient(135deg, #059669, #0d9488)' : '#475569', color: '#fff', fontWeight: 600, fontSize: '16px', border: 'none', borderRadius: '12px', cursor: rawText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: rawText.trim() ? '0 4px 14px rgba(5,150,105,0.3)' : 'none' }}>
            🔄 Organizar em Formato SOAP
          </button>
        </div>

        {/* Results */}
        {soapData && (
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Evolução Organizada</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#334155', borderRadius: '8px', padding: '2px' }}>
                  <button onClick={() => setViewMode('structured')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewMode === 'structured' ? '#059669' : 'transparent', color: viewMode === 'structured' ? '#fff' : '#94a3b8' }}>Estruturado</button>
                  <button onClick={() => setViewMode('text')} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewMode === 'text' ? '#059669' : 'transparent', color: viewMode === 'text' ? '#fff' : '#94a3b8' }}>Texto</button>
                </div>
                <button onClick={handleCopySimple} style={{ padding: '6px 12px', fontSize: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>📄 Copiar Simples</button>
                <button onClick={handleCopyFull} style={{ padding: '6px 12px', fontSize: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>📋 Copiar Completo</button>
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              {viewMode === 'text' ? (
                <div style={{ position: 'relative' }}>
                  <pre style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '16px', overflowX: 'auto', margin: 0 }}>{formatSoapForDisplay(soapData)}</pre>
                  <button onClick={handleCopyFull} style={{ position: 'absolute', top: '8px', right: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>📋 Copiar Tudo</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Identificação */}
                  {hasContent(soapData.identificacao) && (
                    <CollapsibleSection title="Identificação" emoji="📝" content={soapData.identificacao} expanded={expandedSections.identificacao} onToggle={() => toggleSection('identificacao')} borderColor="#3b82f6" onCopy={() => handleCopySection('Identificação', soapData.identificacao)} />
                  )}

                  {/* Diagnósticos com CID */}
                  <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
                    <button onClick={() => toggleSection('diagnosticos')} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🔴</span>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Diagnóstico(s) de Admissão</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>({soapData.diagnosticos.length})</span>
                      </div>
                      <span style={{ color: '#94a3b8' }}>{expandedSections.diagnosticos ? '▲' : '▼'}</span>
                    </button>
                    {expandedSections.diagnosticos && (
                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {soapData.diagnosticos.map((dx, idx) => (
                          <div key={idx} style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', minWidth: '20px' }}>{idx + 1}.</span>
                              <input
                                type="text"
                                value={dx.texto}
                                onChange={(e) => handleUpdateDiagnostico(idx, 'texto', e.target.value)}
                                placeholder="Diagnóstico..."
                                style={{ flex: 1, padding: '6px 10px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                              />
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>(</span>
                              <input
                                type="text"
                                value={dx.cid}
                                onChange={(e) => handleUpdateDiagnostico(idx, 'cid', e.target.value)}
                                placeholder="CID"
                                style={{ width: '100px', padding: '6px 10px', background: '#0f172a', color: '#fbbf24', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 600, textAlign: 'center' }}
                              />
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>)</span>
                              <button
                                onClick={() => handleRemoveDiagnostico(idx)}
                                style={{ padding: '4px 8px', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                title="Remover diagnóstico"
                              >✕</button>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Preview: {formatDiagnostico(dx)}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleAddDiagnostico}
                          style={{ padding: '8px 16px', background: '#334155', color: '#94a3b8', border: '1px dashed #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          ➕ Adicionar Diagnóstico
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subjetivo */}
                  <CollapsibleSection title="S - Subjetivo" emoji="💬" content={soapData.subjetivo || 'Não informado'} expanded={expandedSections.subjetivo} onToggle={() => toggleSection('subjetivo')} borderColor="#a855f7" onCopy={() => handleCopySection('S - Subjetivo', soapData.subjetivo || 'Não informado')} />

                  {/* Objetivo */}
                  <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <button onClick={() => toggleSection('objetivo')} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
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
                                <button onClick={() => handleCopySection(section.label, section.content)} style={{ padding: '3px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title={`Copiar ${section.label}`}>📋 Copiar</button>
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
                  <CollapsibleSection title="A - Avaliação" emoji="🧠" content={soapData.avaliacao || 'Não informado'} expanded={expandedSections.avaliacao} onToggle={() => toggleSection('avaliacao')} borderColor="#f59e0b" onCopy={() => handleCopySection('A - Avaliação', soapData.avaliacao || 'Não informado')} />

                  {/* Plano */}
                  <CollapsibleSection title="P - Plano" emoji="📋" content={soapData.plano || 'Não informado'} expanded={expandedSections.plano} onToggle={() => toggleSection('plano')} borderColor="#14b8a6" onCopy={() => handleCopySection('P - Plano', soapData.plano || 'Não informado')} />

                  {/* Informações Adicionais */}
                  {hasContent(soapData.informacoesAdicionais) && (
                    <div style={{ background: 'rgba(120,53,15,0.2)', borderRadius: '12px', border: '1px solid rgba(180,83,9,0.3)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>✏️</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>Informações Adicionais</span>
                        </div>
                        <button onClick={() => handleCopySection('Informações Adicionais', soapData.informacoesAdicionais)} style={{ padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>📋 Copiar</button>
                      </div>
                      <div style={{ padding: '0 16px 12px' }}>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0 }}>{soapData.informacoesAdicionais}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Big Copy Button */}
            <div style={{ padding: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleShowCopyModal} style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(5,150,105,0.4)', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
                📋 Copiar Evolução Completa
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!soapData && (
          <div style={{ marginTop: '32px', background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px solid #334155', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>📖 Como usar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(5,150,105,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>1</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Cole as informações</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Cole no campo esquerdo todas as informações brutas do paciente. O sistema separa automaticamente por sistema.</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Adicione CIDs</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Após organizar, edite os diagnósticos para adicionar os CIDs correspondentes entre parênteses.</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(20,184,166,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#2dd4bf', fontWeight: 'bold', fontSize: '14px' }}>3</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', marginTop: 0 }}>Copie a evolução</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Use o botão "📋 Copiar Evolução" para copiar em formato simples ou completo para o prontuário.</p>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px', marginTop: 0 }}>Separação Inteligente por Sistema:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <div>💓 <b style={{ color: '#34d399' }}>SV:</b> PA, FC, FR, Temp, SpO2, PAM</div>
                <div>🫀 <b style={{ color: '#34d399' }}>Hemodinâmica:</b> Vasopressores, CVC, PVC</div>
                <div>🫁 <b style={{ color: '#34d399' }}>Respiratório:</b> VM, PEEP, FiO2, Gasometria</div>
                <div>🧠 <b style={{ color: '#34d399' }}>Neurológico:</b> Glasgow, RASS, Sedação</div>
                <div>💧 <b style={{ color: '#34d399' }}>Renal:</b> Diurese, Cr, Ureia, BHD</div>
                <div>🩸 <b style={{ color: '#34d399' }}>Hematológico:</b> Hb, Ht, Plaq, Leuc, Coag</div>
                <div>🛡️ <b style={{ color: '#34d399' }}>Infecto:</b> ATB, Cultura, PCT, PCR</div>
                <div>⚡ <b style={{ color: '#34d399' }}>Metabólico:</b> Na, K, Ca, Mg, Glicemia, Lactato</div>
                <div>🔬 <b style={{ color: '#34d399' }}>Exames:</b> TC, RX, Eco, USG, Imagens</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ marginTop: '32px', padding: '16px', borderTop: '1px solid #1e293b' }}>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: 0 }}>
          Evolução Médica UTI • Formato SOAP Modificado • Uso profissional
        </p>
      </footer>
    </div>
  );
}

// ====== COLLAPSIBLE SECTION ======
interface CollapsibleSectionProps {
  title: string; emoji: string; content: string; expanded: boolean;
  onToggle: () => void; borderColor: string; onCopy?: () => void;
}

function CollapsibleSection({ title, emoji, content, expanded, onToggle, borderColor, onCopy }: CollapsibleSectionProps) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: `1px solid ${borderColor}33`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={onToggle} style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{emoji}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{title}</span>
          </div>
          <span style={{ color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </button>
        {onCopy && (
          <button onClick={(e) => { e.stopPropagation(); onCopy(); }} style={{ padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }} title={`Copiar ${title}`}>📋 Copiar</button>
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
