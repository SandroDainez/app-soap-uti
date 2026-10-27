import { useState, useCallback, useEffect } from 'react';

// ====== TYPES ======
interface Diagnostico { texto: string; cid: string; }

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
    exames: string;
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
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
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

// ====== COPY UTILITY (com fallback robusto para iframe) ======
async function copyToClipboard(text: string): Promise<boolean> {
  // Tentativa 1: Clipboard API moderna
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      // Em alguns contextos (iframe sem permissão) isso falha silenciosamente
      await navigator.clipboard.writeText(text);
      // Verifica se realmente copiou comparando
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText === text) return true;
      } catch {
        // Se não pode ler, assume que funcionou se não deu erro no write
        return true;
      }
    }
  } catch (e) {
    console.warn('Clipboard API falhou, usando fallback:', e);
  }

  // Tentativa 2: Fallback com textarea (funciona em qualquer contexto)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(textArea);

    // Para iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      textArea.contentEditable = 'true';
      textArea.readOnly = false;
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
    }

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (e) {
    console.error('Fallback de cópia falhou:', e);
    return false;
  }
}

// ====== PARSER ======
function createEmptySoap(): SoapData {
  return {
    identificacao: '', diagnosticos: [], subjetivo: '',
    objetivo: {
      sinaisVitais: '', hemodinamica: '', respiratorio: '', neurologico: '',
      renal: '', gastrointestinal: '', hematologico: '', infectologico: '',
      metabolico: '', exames: '', dispositivos: '', escores: '',
    },
    avaliacao: '', plano: '', informacoesAdicionais: '',
  };
}

// Classifica uma linha em uma seção específica
function classifyLine(line: string): string | null {
  const lower = line.toLowerCase().trim();
  if (!lower) return null;

  // === IDENTIFICAÇÃO ===
  if (/^(paciente|nome|idade|leito|quarto|prontu[áa]rio|internação|internacao|dia de uti|d[úu]t[íi]|admitido em)/.test(lower)) return 'identificacao';

  // === DIAGNÓSTICO ===
  if (/^(dx de admiss|diagn[óo]stico de admiss|dx admiss|motivo intern|hip[óo]tese diagn)/.test(lower)) return 'diagnostico';

  // === SUBJETIVO (queixa, história, relato do paciente/família) ===
  if (/^(subjetivo|queixa principal|qp:|hda:|hist[óo]ria da doen[çc]a|hist[óo]ria cl|antecedentes|hist[óo]ria pregressa|relata que|refere que|queixa de|acompanhante relata|fam[íi]lia relata|trazido por|paciente relata|paciente refere|in[íi]cio dos sintomas|h[áa] dias|h[áa] horas|onset)/.test(lower)) return 'subjetivo';

  // === SINAIS VITAIS (apenas parâmetros vitais básicos) ===
  if (/^(sv:|sinais vitais|pa:|ta:|pam:|pam |fc:|fc |fr:|fr |temp:|temp |temperatura|spo2|satura[çc][ãa]o|tmax|tmin|pa |ta |press[ãa]o arterial|frequ[êe]ncia card|frequ[êe]ncia resp)/.test(lower)) return 'sinaisVitais';

  // === HEMODINÂMICA (vasopressores, acessos centrais, parâmetros hemodinâmicos) ===
  if (/^(hemodin[aâ]mica|vasopressor|noradrenalina|adrenalina|vasopressina|dobutamina|dopamina|pvc|picc|cvc|d[ée]bito card[íi]aco|ci |ic |svO2|svo2|ppv|varia[çc][ãa]o press[ôo]|volume responsivo)/.test(lower)) return 'hemodinamica';

  // === RESPIRATÓRIO (VM, parâmetros ventilatórios, gasometria arterial) ===
  if (/^(respirat[óo]rio|vm:|vm |ventila[çc][ãa]o mec|ventilat[óo]rio|peep|fio2|fiO2|pplat|pico|weaning|extuba[çc][ãa]o|traqueostomia|oxig[eê]nio|gaso|gasometria|pco2|po2|ph |hco3|be |base excess|rela[çc][ãa]o p\/f|pfr|modo ventilat|pcv|vcv|psv|bipap|cpap|cateter nasal|m[áa]scara de|venturi|t-piece)/.test(lower)) return 'respiratorio';

  // === NEUROLÓGICO ===
  if (/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|rass|richmond|delirium|cam-icu|convuls[ãa]o|focalidade|midr[íi]ase|isoc[óo]ricas|isocoricas|anisocoria|movimenta[çc][ãa]o|for[çc]a muscular|reflexos|sensibilidade|tontura|cefaleia|escala de coma| pupilas|reatividade pupilar)/.test(lower)) return 'neurologico';

  // === RENAL (função renal, diurese, terapia renal) ===
  if (/^(renal|diurese|urina|creatinina|ureia|tfg|hemodi[áa]lise|hemodialise|balan[çc]o h[íi]drico|balanco hidrico|bhd|crrt|tdc|catheter|volume total|edema|ingest|clearance de creat|protein[úu]ria|sedimento urin)/.test(lower)) return 'renal';

  // === GASTROINTESTINAL/HEPÁTICO ===
  if (/^(gastrointestinal|gi:|hep[áa]tico|abdome|abdominal|dieta|nutri[çc][ãa]o|sng|sngt|sng\/|evacua[çc][ãa]o|fezes|ascite|distens[ãa]o abdominal|rha|ru[íi]dos hidro|tgp|tgo|bilirrubina|albumina|v[ôo]mito|n[áa]usea|deito|g[áa]strico|intestinal|enteral|parenteral|trato digest|digest[óo]rio)/.test(lower)) return 'gastrointestinal';

  // === HEMATOLÓGICO (hemograma, coagulação) ===
  if (/^(hematol[óo]gico|hemograma|hemoglobina|hemat[óo]crito|plaquetas|leuc[óo]citos|leucopenia|leucocitose|coagulograma|inr|tpa|tp |fibrinog[eê]nio|d-d[íi]mero|ddimer|transfus[ãa]o|anemia|sangramento|hemorragia|ht:|hb:|hgb|neutr[óo]filos|linf[óo]citos|eosin[óo]filos|bas[óo]filos|mon[óo]citos|reticul[óo]citos|vcm|HCM |hcm |rdw)/.test(lower)) return 'hematologico';

  // === INFECTOLÓGICO ===
  if (/^(infecto|infec[çc][ãa]o|procalcitonina|pct|cultura|hemocultura|urocultura|antibi[óo]tico|meropenem|piperacilina|vancomicina|febre|foco infeccioso|sepsis|s[ée]psis|choque s[ée]ptico|pcr |crp |antimicrobiano|esquema antimicrobiano|cobertura antimicrobiana)/.test(lower)) return 'infectologico';

  // === METABÓLICO/ELETROLÍTICO ===
  if (/^(metab[óo]lico|glicemia|glicose|insulina|s[óo]dio|pot[áa]ssio|c[áa]lcio|magn[ée]sio|fosfato|lactato|lact|acidose|alcalose|eletr[óo]litos|ionograma|na:|na |k:|k |cl:|cl |gap ani|osmolaridade|equil[íi]brio [áa]cido|ph arterial)/.test(lower)) return 'metabolico';

  // === DISPOSITIVOS ===
  if (/^(dispositivo|dreno|sonda (vesical|naso|oro)|jal|acesso venoso|acesso arterial|iot |tqt |m[áa]scara lar[íi]n|cateter venoso central|cateter arterial|swan|capn[óo]grafo)/.test(lower)) return 'dispositivos';

  // === ESCORES ===
  if (/^(escore|sofa|apache|qsofa|q-sofa|mlds|kidigo|glasgow [0-9]|rass [+-])/.test(lower)) return 'escores';

  // === EXAMES COMPLEMENTARES (imagem, procedimentos diagnósticos) ===
  if (/^(exame|laborat[óo]rio|tc |tc de|raio.x|rx |rx de|ecocardiograma|eco |tomografia|ultrassom|usg|bi[óo]psia|resson[aâ]ncia|endoscopia|pun[çc][ãa]o|paracentese|toracocentese|pun[çc][ãa]o lombar|ecg |eletrocardiograma|holter|mapa |cintilografia|pet-ct|angiotomografia|angiorresson)/.test(lower)) return 'exames';

  // === AVALIAÇÃO (julgamento clínico, hipóteses atuais, estado do paciente) ===
  if (/^(avalia[çc][ãa]o|hip[óo]tese|diagn[óo]stico atual|quadro cl[íi]nico|evolu[çc][ãa]o cl[íi]nica|melhora|piora|est[áa]vel|grave|cr[íi]tico|resposta terap|paciente apresenta|encontra-se|mant[ée]m-se|apresenta melhora|apresenta piora|quadro de|paciente em|conclus[ãa]o|s[íi]ntese)/.test(lower)) return 'avaliacao';

  // === PLANO (condutas, prescrições, metas) ===
  if (/^(plano|conduta|prescri[çc][ãa]o|medica[çc][ãa]o|ajuste|manter|suspender|iniciar|trocar|meta|solicitar|interconsulta|procedimento|prescrever|orientar|encaminhar|liberar|restringir|monitorar|titular|reavaliar|otimizar|desmame|weaning|profilaxia|prevenir)/.test(lower)) return 'plano';

  return null;
}

function extractDiagnostico(line: string): Diagnostico | null {
  const lower = line.toLowerCase().trim();
  if (!/^(dx de admiss|diagn[óo]stico de admiss|dx admiss|motivo intern|hip[óo]tese diagn)/.test(lower)) return null;
  let texto = line.replace(/^(dx de admiss[ãa]o|diagn[óo]stico de admiss[ãa]o|dx admiss[ãa]o|motivo da interna[çc][ãa]o|motivo interna[çc][ãa]o|hip[óo]tese diagn[óo]stica)\s*[:\-]?\s*/i, '').trim();
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
  const usedLines = new Set<number>();

  const lineClassifications: (string | null)[] = lines.map((line, idx) => {
    const classification = classifyLine(line);
    if (classification) usedLines.add(idx);
    return classification;
  });

  const sections: Record<string, string[]> = {
    identificacao: [], diagnostico: [], subjetivo: [],
    sinaisVitais: [], hemodinamica: [], respiratorio: [], neurologico: [],
    renal: [], gastrointestinal: [], hematologico: [], infectologico: [],
    metabolico: [], exames: [], dispositivos: [], escores: [],
    avaliacao: [], plano: [],
  };

  lineClassifications.forEach((cls, idx) => {
    if (cls && sections[cls]) sections[cls].push(lines[idx].trim());
  });

  // Linhas não classificadas com valores numéricos vão para exames
  lines.forEach((line, idx) => {
    if (!usedLines.has(idx) && line.trim()) {
      const lower = line.toLowerCase();
      if (/\d+\.\d+|mg\/dl|mmol|meq|ui\/l|g\/dl|mmhg|bpm|resultado|dosagem|n[íi]vel/.test(line) || /^(resultado|dosagem|n[íi]vel|laudo)/.test(lower)) {
        sections.exames.push(line.trim());
      }
    }
  });

  soap.identificacao = sections.identificacao.join('\n');

  sections.diagnostico.forEach(line => {
    const dx = extractDiagnostico(line);
    if (dx) soap.diagnosticos.push(dx);
  });

  soap.subjetivo = sections.subjetivo.join('\n');
  soap.objetivo.sinaisVitais = sections.sinaisVitais.join('\n');
  soap.objetivo.hemodinamica = sections.hemodinamica.join('\n');
  soap.objetivo.respiratorio = sections.respiratorio.join('\n');
  soap.objetivo.neurologico = sections.neurologico.join('\n');
  soap.objetivo.renal = sections.renal.join('\n');
  soap.objetivo.gastrointestinal = sections.gastrointestinal.join('\n');
  soap.objetivo.hematologico = sections.hematologico.join('\n');
  soap.objetivo.infectologico = sections.infectologico.join('\n');
  soap.objetivo.metabolico = sections.metabolico.join('\n');
  soap.objetivo.exames = sections.exames.join('\n');
  soap.objetivo.dispositivos = sections.dispositivos.join('\n');
  soap.objetivo.escores = sections.escores.join('\n');
  soap.avaliacao = sections.avaliacao.join('\n');
  soap.plano = sections.plano.join('\n');

  if (additionalInfo.trim()) soap.informacoesAdicionais = additionalInfo.trim();

  return soap;
}

function formatDiagnostico(dx: Diagnostico): string {
  if (dx.cid) return `${dx.texto} (${dx.cid})`;
  return dx.texto;
}

function formatSoapForDisplay(soap: SoapData): string {
  let o = '';
  o += '═══════════════════════════════════════\n';
  o += '         EVOLUÇÃO MÉDICA - UTI\n';
  o += '═══════════════════════════════════════\n\n';
  if (soap.identificacao) o += '▸ IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  if (soap.diagnosticos.length > 0) {
    o += '▸ DIAGNÓSTICO(S) DE ADMISSÃO:\n';
    soap.diagnosticos.forEach((dx, i) => { o += `  ${i + 1}. ${formatDiagnostico(dx)}\n`; });
    o += '\n';
  }
  o += '───────────────────────────────────────\n';
  o += 'S - SUBJETIVO\n';
  o += '───────────────────────────────────────\n';
  o += (soap.subjetivo || 'Paciente internado em UTI, sem informações subjetivas disponíveis no momento.') + '\n\n';
  o += '───────────────────────────────────────\n';
  o += 'O - OBJETIVO\n';
  o += '───────────────────────────────────────\n\n';
  if (soap.objetivo.sinaisVitais) o += '  • Sinais Vitais:\n    ' + soap.objetivo.sinaisVitais.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.hemodinamica) o += '  • Hemodinâmica:\n    ' + soap.objetivo.hemodinamica.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.respiratorio) o += '  • Respiratório:\n    ' + soap.objetivo.respiratorio.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.neurologico) o += '  • Neurológico:\n    ' + soap.objetivo.neurologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.renal) o += '  • Renal:\n    ' + soap.objetivo.renal.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.gastrointestinal) o += '  • Gastrointestinal/Hepático:\n    ' + soap.objetivo.gastrointestinal.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.hematologico) o += '  • Hematológico:\n    ' + soap.objetivo.hematologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.infectologico) o += '  • Infectológico:\n    ' + soap.objetivo.infectologico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.metabolico) o += '  • Metabólico/Eletrolítico:\n    ' + soap.objetivo.metabolico.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.exames) o += '  • Exames Complementares (Imagem/Procedimentos):\n    ' + soap.objetivo.exames.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.dispositivos) o += '  • Dispositivos:\n    ' + soap.objetivo.dispositivos.replace(/\n/g, '\n    ') + '\n\n';
  if (soap.objetivo.escores) o += '  • Escores:\n    ' + soap.objetivo.escores.replace(/\n/g, '\n    ') + '\n\n';
  o += '───────────────────────────────────────\n';
  o += 'A - AVALIAÇÃO\n';
  o += '───────────────────────────────────────\n';
  o += (soap.avaliacao || 'Não informado') + '\n\n';
  o += '───────────────────────────────────────\n';
  o += 'P - PLANO\n';
  o += '───────────────────────────────────────\n';
  o += (soap.plano || 'Não informado') + '\n\n';
  if (soap.informacoesAdicionais) {
    o += '───────────────────────────────────────\n';
    o += '▸ INFORMAÇÕES ADICIONAIS\n';
    o += '───────────────────────────────────────\n';
    o += soap.informacoesAdicionais + '\n\n';
  }
  o += '═══════════════════════════════════════\n';
  return o;
}

function formatSoapSimple(soap: SoapData): string {
  let o = '';
  o += 'EVOLUÇÃO MÉDICA - UTI\n\n';
  if (soap.identificacao) o += 'IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  if (soap.diagnosticos.length > 0) {
    o += 'DX ADMISSÃO:\n';
    soap.diagnosticos.forEach((dx, i) => { o += `${i + 1}. ${formatDiagnostico(dx)}\n`; });
    o += '\n';
  }
  o += 'S - SUBJETIVO:\n' + (soap.subjetivo || 'Paciente internado em UTI, sem informações subjetivas disponíveis.') + '\n\n';
  o += 'O - OBJETIVO:\n';
  if (soap.objetivo.sinaisVitais) o += 'SV: ' + soap.objetivo.sinaisVitais + '\n';
  if (soap.objetivo.hemodinamica) o += 'Hemodinâmica: ' + soap.objetivo.hemodinamica + '\n';
  if (soap.objetivo.respiratorio) o += 'Respiratório: ' + soap.objetivo.respiratorio + '\n';
  if (soap.objetivo.neurologico) o += 'Neurológico: ' + soap.objetivo.neurologico + '\n';
  if (soap.objetivo.renal) o += 'Renal: ' + soap.objetivo.renal + '\n';
  if (soap.objetivo.gastrointestinal) o += 'GI: ' + soap.objetivo.gastrointestinal + '\n';
  if (soap.objetivo.hematologico) o += 'Hematológico: ' + soap.objetivo.hematologico + '\n';
  if (soap.objetivo.infectologico) o += 'Infecto: ' + soap.objetivo.infectologico + '\n';
  if (soap.objetivo.metabolico) o += 'Metabólico: ' + soap.objetivo.metabolico + '\n';
  if (soap.objetivo.exames) o += 'Exames: ' + soap.objetivo.exames + '\n';
  if (soap.objetivo.dispositivos) o += 'Dispositivos: ' + soap.objetivo.dispositivos + '\n';
  if (soap.objetivo.escores) o += 'Escores: ' + soap.objetivo.escores + '\n';
  o += '\nA - AVALIAÇÃO:\n' + (soap.avaliacao || '-') + '\n\n';
  o += 'P - PLANO:\n' + (soap.plano || '-') + '\n';
  return o;
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
    else addToast('❌ Erro ao copiar. Selecione o texto manualmente.', 'error');
  }, [soapData, addToast]);

  const handleCopySimple = useCallback(async () => {
    if (!soapData) return;
    const text = formatSoapSimple(soapData);
    const success = await copyToClipboard(text);
    if (success) addToast('📄 Evolução simplificada copiada!', 'success');
    else addToast('❌ Erro ao copiar. Selecione o texto manualmente.', 'error');
  }, [soapData, addToast]);

  const handleCopySection = useCallback(async (label: string, content: string) => {
    const text = `${label}:\n${content}`;
    const success = await copyToClipboard(text);
    if (success) addToast(`📋 "${label}" copiado!`, 'success');
    else addToast('❌ Erro ao copiar.', 'error');
  }, [addToast]);

  const handleShowCopyModal = useCallback(() => {
    if (!soapData) return;
    setCopiedPreview(formatSoapSimple(soapData));
    setShowCopyModal(true);
  }, [soapData]);

  const handleCopyFromModal = useCallback(async () => {
    const success = await copyToClipboard(copiedPreview);
    if (success) addToast('✅ Texto copiado com sucesso!', 'success');
    else addToast('❌ Erro ao copiar.', 'error');
  }, [copiedPreview, addToast]);

  const handleClear = useCallback(() => {
    setRawText(''); setAdditionalInfo(''); setSoapData(null);
    addToast('Dados limpos', 'info');
  }, [addToast]);

  const handleUpdateDiagnostico = useCallback((index: number, field: 'texto' | 'cid', value: string) => {
    if (!soapData) return;
    const newDiagnosticos = [...soapData.diagnosticos];
    newDiagnosticos[index] = { ...newDiagnosticos[index], [field]: value };
    setSoapData({ ...soapData, diagnosticos: newDiagnosticos });
  }, [soapData]);

  const handleAddDiagnostico = useCallback(() => {
    if (!soapData) return;
    setSoapData({ ...soapData, diagnosticos: [...soapData.diagnosticos, { texto: '', cid: '' }] });
  }, [soapData]);

  const handleRemoveDiagnostico = useCallback((index: number) => {
    if (!soapData) return;
    setSoapData({ ...soapData, diagnosticos: soapData.diagnosticos.filter((_, i) => i !== index) });
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
      { key: 'exames', label: 'Exames (Imagem/Procedimentos)', emoji: '🔬', content: soapData.objetivo.exames },
      { key: 'dispositivos', label: 'Dispositivos', emoji: '📎', content: soapData.objetivo.dispositivos },
      { key: 'escores', label: 'Escores', emoji: '📊', content: soapData.objetivo.escores },
    ].filter(s => hasContent(s.content));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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
              <button onClick={() => setShowCopyModal(false)} style={{ background: '#334155', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setCopiedPreview(formatSoapSimple(soapData))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapSimple(soapData) ? '#059669' : '#334155', color: copiedPreview === formatSoapSimple(soapData) ? '#fff' : '#94a3b8' }}>📄 Simples</button>
              <button onClick={() => setCopiedPreview(formatSoapForDisplay(soapData))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapForDisplay(soapData) ? '#059669' : '#334155', color: copiedPreview === formatSoapForDisplay(soapData) ? '#fff' : '#94a3b8' }}>📋 Completo</button>
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
              <button onClick={handleShowCopyModal} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>📋 Copiar Evolução</button>
            )}
            <button onClick={handleClear} style={{ padding: '8px 12px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Limpar</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Brutas</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Cole aqui os dados</span>
            </div>
            <textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
              placeholder={`Cole aqui todas as informações do paciente...\n\nExemplo:\nPaciente João Silva, 65 anos, leito 302, 5° dia de UTI\nDX admissão: Choque séptico de foco pulmonar\n\nSubjetivo:\nPaciente trazido pela esposa, relata início dos sintomas há 5 dias com febre e tosse produtiva. Nega dor torácica. Refere dispneia progressiva.\n\nSV: PA 110/65, FC 88, FR 18, Temp 37.2, SpO2 95%\nHemodinâmica: Noradrenalina 0.1 mcg/kg/min, PAM 72\nRespiratório: VM - PCV, PEEP 8, FiO2 40%, Pplat 28\nNeurológico: Glasgow 14, RASS -1, pupilas isocóricas\nRenal: Diurese 800ml/24h, Cr 1.8, Ureia 65\nHematológico: Hb 9.2, Ht 28%, Plaq 145.000\nMetabólico: Na 138, K 4.2, Glicemia 142, Lactato 2.1\nInfecto: PCT 8.5, PCR 180, Meropenem D3\nExames: TC tórax com consolidação em LID\n\nAvaliação: Paciente estável, melhora progressiva do quadro infeccioso.\n\nPlano: Manter meropenem, weaning ventilatório, reavaliar em 6h, solicitar hemocultura de controle`}
              style={{ width: '100%', height: '280px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>✏️</span>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Informações Adicionais / Correções</h2>
              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Substituem/complementam</span>
            </div>
            <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder={`Adicione informações que devem SUBSTITUIR ou COMPLEMENTAR os dados colados.\n\nUse cabeçalhos para substituir seções:\n\nSV: PA 120/70, FC 75, Temp 36.8\nPlano: Suspender noradrenalina, iniciar dieta oral\nAvaliação: Paciente estável, melhora progressiva\n\nOu adicione informações gerais como complemento.\n\nDica: Você pode editar os CIDs dos diagnósticos diretamente na evolução gerada.`}
              style={{ width: '100%', height: '280px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <button onClick={handleProcess} disabled={!rawText.trim()} style={{ padding: '12px 32px', background: rawText.trim() ? 'linear-gradient(135deg, #059669, #0d9488)' : '#475569', color: '#fff', fontWeight: 600, fontSize: '16px', border: 'none', borderRadius: '12px', cursor: rawText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: rawText.trim() ? '0 4px 14px rgba(5,150,105,0.3)' : 'none' }}>
            🔄 Organizar em Formato SOAP
          </button>
        </div>

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
                  <button onClick={handleCopyFull} style={{ position: 'absolute', top: '8px', right: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>📋 Copiar Tudo</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {hasContent(soapData.identificacao) && (
                    <CollapsibleSection title="Identificação" emoji="📝" content={soapData.identificacao} expanded={expandedSections.identificacao} onToggle={() => toggleSection('identificacao')} borderColor="#3b82f6" onCopy={() => handleCopySection('Identificação', soapData.identificacao)} />
                  )}

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
                        {soapData.diagnosticos.length > 0 ? soapData.diagnosticos.map((dx, idx) => (
                          <div key={idx} style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', minWidth: '20px' }}>{idx + 1}.</span>
                              <input type="text" value={dx.texto} onChange={(e) => handleUpdateDiagnostico(idx, 'texto', e.target.value)} placeholder="Diagnóstico..." style={{ flex: 1, minWidth: '200px', padding: '6px 10px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>(</span>
                              <input type="text" value={dx.cid} onChange={(e) => handleUpdateDiagnostico(idx, 'cid', e.target.value)} placeholder="CID" style={{ width: '100px', padding: '6px 10px', background: '#0f172a', color: '#fbbf24', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 600, textAlign: 'center' }} />
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>)</span>
                              <button onClick={() => handleRemoveDiagnostico(idx)} style={{ padding: '4px 8px', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }} title="Remover">✕</button>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Preview: {formatDiagnostico(dx)}</div>
                          </div>
                        )) : <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Nenhum diagnóstico identificado. Adicione manualmente abaixo.</p>}
                        <button onClick={handleAddDiagnostico} style={{ padding: '8px 16px', background: '#334155', color: '#94a3b8', border: '1px dashed #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>➕ Adicionar Diagnóstico</button>
                      </div>
                    )}
                  </div>

                  <CollapsibleSection title="S - Subjetivo" emoji="💬" content={soapData.subjetivo || 'Paciente internado em UTI, sem informações subjetivas disponíveis.'} expanded={expandedSections.subjetivo} onToggle={() => toggleSection('subjetivo')} borderColor="#a855f7" onCopy={() => handleCopySection('S - Subjetivo', soapData.subjetivo || 'Paciente internado em UTI, sem informações subjetivas disponíveis.')} />

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
                                <button onClick={() => handleCopySection(section.label, section.content)} style={{ padding: '3px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📋 Copiar</button>
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

                  <CollapsibleSection title="A - Avaliação" emoji="🧠" content={soapData.avaliacao || 'Não informado'} expanded={expandedSections.avaliacao} onToggle={() => toggleSection('avaliacao')} borderColor="#f59e0b" onCopy={() => handleCopySection('A - Avaliação', soapData.avaliacao || 'Não informado')} />

                  <CollapsibleSection title="P - Plano" emoji="📋" content={soapData.plano || 'Não informado'} expanded={expandedSections.plano} onToggle={() => toggleSection('plano')} borderColor="#14b8a6" onCopy={() => handleCopySection('P - Plano', soapData.plano || 'Não informado')} />

                  {hasContent(soapData.informacoesAdicionais) && (
                    <div style={{ background: 'rgba(120,53,15,0.2)', borderRadius: '12px', border: '1px solid rgba(180,83,9,0.3)', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>✏️</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>Informações Adicionais</span>
                        </div>
                        <button onClick={() => handleCopySection('Informações Adicionais', soapData.informacoesAdicionais)} style={{ padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📋 Copiar</button>
                      </div>
                      <div style={{ padding: '0 16px 12px' }}>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0 }}>{soapData.informacoesAdicionais}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleShowCopyModal} style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(5,150,105,0.4)', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
                📋 Copiar Evolução Completa
              </button>
            </div>
          </div>
        )}

        {!soapData && (
          <div style={{ marginTop: '32px', background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px solid #334155', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📖 Como usar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(5,150,105,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>1</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Cole as informações</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Cole todas as informações brutas. O sistema separa automaticamente por sistema e categoria.</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Adicione CIDs</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Edite os diagnósticos para adicionar os CIDs. Você também pode adicionar novos diagnósticos.</p>
              </div>
              <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(20,184,166,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#2dd4bf', fontWeight: 'bold', fontSize: '14px' }}>3</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Copie a evolução</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Use "📋 Copiar Evolução" para copiar em formato simples ou completo.</p>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '8px' }}>Separação Inteligente:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <div>💓 <b style={{ color: '#34d399' }}>SV:</b> PA, FC, FR, Temp, SpO2</div>
                <div>🫀 <b style={{ color: '#34d399' }}>Hemodinâmica:</b> Vasopressores, CVC</div>
                <div>🫁 <b style={{ color: '#34d399' }}>Respiratório:</b> VM, PEEP, FiO2, Gasometria</div>
                <div>🧠 <b style={{ color: '#34d399' }}>Neurológico:</b> Glasgow, RASS, Sedação</div>
                <div>💧 <b style={{ color: '#34d399' }}>Renal:</b> Diurese, Cr, Ureia, BHD</div>
                <div>🩸 <b style={{ color: '#34d399' }}>Hematológico:</b> Hb, Ht, Plaq, Coag</div>
                <div>🛡️ <b style={{ color: '#34d399' }}>Infecto:</b> ATB, Cultura, PCT, PCR</div>
                <div>⚡ <b style={{ color: '#34d399' }}>Metabólico:</b> Na, K, Ca, Glicemia, Lactato</div>
                <div>🔬 <b style={{ color: '#34d399' }}>Exames:</b> TC, RX, Eco, USG (imagem)</div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', marginBottom: 0, fontStyle: 'italic' }}>
                💡 No formato SOAP, os exames laboratoriais e de imagem ficam no <b>O (Objetivo)</b> - isso é o correto! O O contém todos os achados objetivos do paciente.
              </p>
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
          <button onClick={(e) => { e.stopPropagation(); onCopy(); }} style={{ padding: '4px 10px', fontSize: '11px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '12px' }}>📋 Copiar</button>
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
